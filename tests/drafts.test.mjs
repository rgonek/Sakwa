import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournal } from '../mods/sakwa/journal.js';
import { createDraftBook } from '../mods/sakwa/drafts.js';
import { contextKey } from '../mods/sakwa/context.js';

const global={scope:'global',machine:null,space:null,tab:null,label:'Global'};
const tab={scope:'tab',machine:null,space:'s1',tab:'t1',label:'Sheep / One'};
function setup(){
  const files=new Map(), disk=new Map();
  const io={list:async()=>[...files.keys()],read:async n=>files.get(n),create:async(n,s)=>{files.set(n,s);}};
  const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),flush:async()=>{}};
  const journal=createJournal(io);
  return {files,disk,io,storage,journal,book:createDraftBook(journal,storage)};
}
test('pending edits for different contexts survive restart and failed writes',async()=>{
  const s=setup();s.book.edit(global,'global text',[]);s.book.edit(tab,'tab text',[]);
  const recovered=createDraftBook(s.journal,s.storage);
  assert.equal(recovered.get(contextKey(global)).text,'global text');
  assert.equal(recovered.get(contextKey(tab)).text,'tab text');
  const write=s.io.create;s.io.create=async()=>{throw Error('disk full');};
  await assert.rejects(recovered.flush(),/disk full/);
  assert.equal(recovered.get(contextKey(tab)).text,'tab text');
  s.io.create=write;await recovered.flush();
  assert.equal(recovered.pending().length,0);assert.equal(s.journal.notes().length,2);
});
test('edits during a slow write are not acknowledged early or lost',async()=>{
  const s=setup();let release,started;
  const began=new Promise(r=>{started=r;});
  s.io.create=async(n,v)=>{started();await new Promise(r=>{release=r;});s.files.set(n,v);};
  s.book.edit(global,'first',[]);const flush=s.book.flush();await began;
  assert.equal(s.book.status(contextKey(global)),'saving');
  s.book.edit(global,'second',[]);
  const restart=createDraftBook(s.journal,s.storage);
  assert.equal(restart.pending().length,2);
  s.io.create=async(n,v)=>s.files.set(n,v);release();await flush;
  assert.equal(s.journal.notes()[0].text,'second');assert.equal(s.journal.notes()[0].heads.length,1);
  assert.equal(s.book.status(contextKey(global)),'saved');
});
test('queued typing coalesces without creating missing parent revisions',async()=>{
  const s=setup();s.book.edit(global,'a',[]);s.book.edit(global,'ab',[]);s.book.edit(global,'abc',[]);
  assert.equal(s.book.pending().length,1);await s.book.flush();
  assert.equal(s.journal.notes()[0].text,'abc');assert.deepEqual(s.journal.notes()[0].parents,[]);
});
test('corrupt recovery storage is never silently replaced',()=>{
  const s=setup();s.storage.setItem('sakwa.pending.v1','{broken');
  assert.throws(()=>createDraftBook(s.journal,s.storage),/recovery/i);
  assert.equal(s.storage.getItem('sakwa.pending.v1'),'{broken');
});
test('local recovery write errors keep the text queued for retry',async()=>{
  const s=setup(),write=s.storage.setItem;s.storage.setItem=()=>{throw Error('quota');};
  s.book.edit(global,'still here',[]);
  assert.equal(s.book.get(contextKey(global)).text,'still here');
  // Journal can still save if the local recovery cache is unavailable.
  await s.book.flush();assert.equal(s.journal.notes()[0].text,'still here');
  s.storage.setItem=write;
});
