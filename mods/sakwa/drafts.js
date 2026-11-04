import { validRevision } from './journal.js';
const STORAGE_KEY = 'sakwa.pending.v1';

export function createDraftBook(journal,storage) {
  let queue = [], active = null, flushing = null, error = null, recoveryError = null;
  const raw = storage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved.schema !== 1 || !Array.isArray(saved.records) || !saved.records.every(validRevision)) throw Error('Invalid drafts');
      queue = saved.records;
    } catch { throw Error('Cannot read recovery drafts; original storage preserved. Export it before repairing.'); }
  }
  function persist() {
    try { storage.setItem(STORAGE_KEY,JSON.stringify({schema:1,records:queue})); recoveryError = null; }
    catch (e) { recoveryError = e.message; }
  }
  const book = {
    get error() { return error; },
    get recoveryError() { return recoveryError; },
    pending: ()=>queue.slice(),
    get(key) { return queue.filter(r=>r.key === key).at(-1); },
    status(key) { return queue.some(r=>r.key === key) ? error ? 'error' : 'saving' : 'saved'; },
    edit(context,text,parents) {
      let record = journal.revision(context,text,parents);
      const last = queue.findLastIndex(r=>r.key === record.key);
      if (last >= 0) {
        const previous = queue[last];
        if (previous !== active) {
          record = {...record,parents:previous.parents};
          queue.splice(last,1);
        } else record = {...record,parents:[previous.id]};
      }
      queue.push(record);persist();
      return record;
    },
    async flush() {
      if (flushing) return flushing;
      flushing = (async()=>{
        error = null;
        while (queue.length) {
          active = queue[0];persist();
          // The immutable journal is authoritative even when recovery-cache writes fail.
          try { await storage.flush(); } catch (e) { recoveryError = e.message; }
          await journal.put(active);
          queue.shift();active = null;persist();
        }
      })();
      try { await flushing; }
      catch (e) { error = e.message;throw e; }
      finally { active = null;flushing = null; }
    },
  };
  return book;
}
