import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournal } from '../mods/sakwa/journal.js';
const context = {scope:'global',machine:null,space:null,tab:null,label:'Global'};
function memory(){const files=new Map();return {files,list:async()=>[...files.keys()],read:async n=>files.get(n),create:async(n,s)=>{if(files.has(n))throw Error('exists');files.set(n,s);}};}
test('journal survives restart and keeps complete Unicode text and empty revisions',async()=>{
  const io=memory(),a=createJournal(io);await a.load();
  const r=await a.append(context,'Zażółć 🐑\nline two',[]);
  await a.append(context,'',[r.id]);
  const b=createJournal(io);await b.load();
  assert.equal(b.notes()[0].text,'');assert.equal(b.history(b.notes()[0].key).length,2);
});
test('concurrent edits remain distinct heads until explicitly resolved',async()=>{
  const io=memory(),a=createJournal(io),b=createJournal(io);
  const root=await a.append(context,'root',[]);await b.load();
  await Promise.all([a.append(context,'left',[root.id]),b.append(context,'right',[root.id])]);
  await a.load();const note=a.notes()[0];assert.equal(note.heads.length,2);
  assert.deepEqual(new Set(note.heads.map(h=>h.text)),new Set(['left','right']));
  await a.append(context,'merged',note.heads.map(h=>h.id));
  assert.equal(a.notes()[0].heads.length,1);assert.equal(a.history(note.key).length,4);
});
test('malformed originals are retained and a failed write never claims a revision',async()=>{
  const io=memory();io.files.set('broken.json','{oops');
  const j=createJournal(io);await j.load();assert.equal(j.errors.length,1);
  assert.equal(io.files.get('broken.json'),'{oops');
  io.create=async()=>{throw Error('disk full');};
  await assert.rejects(j.append(context,'precious',[]),/disk full/);
  assert.equal(j.notes().length,0);
});
test('repeated creation of the same immutable revision is idempotent',async()=>{
  const io=memory(),j=createJournal(io);
  const revision=j.revision(context,'once',[]);
  await j.put(revision);await j.put(revision);
  assert.equal(j.notes().length,1);assert.equal(io.files.size,1);
});
