import { contextKey, validContext } from './context.js';

let sequence = 0;
export function revisionId() {
  return `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function validRevision(r) {
  return r && r.schema === 1 && typeof r.id === 'string' && /^[a-z0-9-]{8,160}$/.test(r.id) &&
    validContext(r.context) && r.key === contextKey(r.context) && typeof r.text === 'string' &&
    Number.isFinite(r.at) && Array.isArray(r.parents) &&
    r.parents.every(p=>typeof p === 'string' && p !== r.id && /^[a-z0-9-]{8,160}$/.test(p));
}

export function createJournal(io) {
  const records = new Map();
  let loading;
  const journal = {
    errors: [],
    async load() {
      if (loading) return loading;
      loading = (async()=>{
        const errors = [];
        for (const name of await io.list()) {
          if (!name.endsWith('.json') || records.has(name.slice(0,-5))) continue;
          try {
            const record = JSON.parse(await io.read(name));
            if (!validRevision(record) || name !== `${record.id}.json`) throw Error('Invalid revision');
            records.set(record.id,record);
          } catch (e) { errors.push(`${name}: ${e.message}`); }
        }
        journal.errors = errors;
      })();
      try { await loading; } finally { loading = null; }
    },
    revision(context,text,parents) {
      const r = {schema:1,id:revisionId(),key:contextKey(context),context:{...context},text,parents:[...parents],at:Date.now()};
      if (!validRevision(r)) throw Error('Invalid note revision');
      return r;
    },
    async put(record) {
      if (!validRevision(record)) throw Error('Invalid note revision');
      const name = `${record.id}.json`, raw = JSON.stringify(record);
      try { await io.create(name,raw); }
      catch (error) {
        // A lost acknowledgement can be retried, but a collision is never overwritten.
        let existing;
        try { existing = await io.read(name); } catch { /* Keep the original write error. */ }
        if (existing !== raw) throw error;
      }
      records.set(record.id,record);
      return record;
    },
    async append(context,text,parents) { return journal.put(journal.revision(context,text,parents)); },
    history(key) {
      return [...records.values()].filter(r=>r.key === key).sort((a,b)=>b.at-a.at || b.id.localeCompare(a.id));
    },
    notes() {
      const keys = new Set([...records.values()].map(r=>r.key));
      return [...keys].map(key=>{
        const history = journal.history(key), superseded = new Set(history.flatMap(r=>r.parents));
        const heads = history.filter(r=>!superseded.has(r.id));
        const latest = heads[0];
        return {...latest,heads};
      }).filter(n=>n.id).sort((a,b)=>b.at-a.at || a.key.localeCompare(b.key));
    },
  };
  return journal;
}
