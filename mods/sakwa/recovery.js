import { validRevision } from './journal.js';

// Host-owned shared state outlives a particular pane or layout copy.
export function createRecovery(read,write,owner,hasRevision) {
  function snapshot() {
    const value=read();
    if(value==null)return {schema:1,copies:{}};
    if(value.schema!==1 || !value.copies || typeof value.copies!=='object' || Array.isArray(value.copies) ||
      !Object.values(value.copies).every(records=>Array.isArray(records)&&records.every(validRevision))) {
      throw Error('Shared recovery data is unreadable; original preserved');
    }
    return value;
  }
  return {
    load() { return Object.values(snapshot().copies).flat().filter(r=>!hasRevision(r.id)); },
    save(records) {
      const before=snapshot(),copies={...before.copies,[owner]:records};
      for(const key of Object.keys(copies)) {
        copies[key]=copies[key].filter(r=>!hasRevision(r.id));
        if(!copies[key].length)delete copies[key];
      }
      const next={schema:1,copies};
      if(JSON.stringify(before)!==JSON.stringify(next))write(next);
    },
  };
}
