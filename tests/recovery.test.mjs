import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecovery } from '../mods/sakwa/recovery.js';
import { createDraftBook } from '../mods/sakwa/drafts.js';
import { createJournal } from '../mods/sakwa/journal.js';
const context={scope:'global',machine:null,space:null,tab:null,label:'Global'};
test('another editor recovers drafts after original copy and its storage are gone',async()=>{
  let shared=null;const disk=new Map();
  const io={list:async()=>[...disk.keys()],read:async n=>disk.get(n),create:async(n,v)=>disk.set(n,v)};
  const journal=createJournal(io),recovery=createRecovery(()=>shared,v=>{shared=v;},'first',id=>journal.has(id));
  const storage=()=>({getItem:()=>null,setItem:()=>{},flush:async()=>{}});
  const first=createDraftBook(journal,storage(),records=>recovery.save(records));
  first.edit(context,'A final unsaved thought',[]);
  const reopenedJournal=createJournal(io);
  const reopenedRecovery=createRecovery(()=>shared,v=>{shared=v;},'second',id=>reopenedJournal.has(id));
  const second=createDraftBook(reopenedJournal,storage(),records=>reopenedRecovery.save(records));
  second.recover(reopenedRecovery.load());await second.flush();
  assert.equal(reopenedJournal.notes()[0].text,'A final unsaved thought');
  assert.equal(reopenedRecovery.load().length,0);
});
test('recovery snapshots preserve multiple editors and never reset malformed shared data',()=>{
  let shared=null;const has=()=>false;
  const a=createRecovery(()=>shared,v=>{shared=v;},'a',has),b=createRecovery(()=>shared,v=>{shared=v;},'b',has);
  const j=createJournal({});const left=j.revision(context,'left',[]),right=j.revision(context,'right',[]);
  a.save([left]);b.save([right]);assert.equal(a.load().length,2);
  a.save([]);assert.deepEqual(b.load().map(r=>r.text),['right']);
  shared={schema:999,precious:'original'};
  assert.throws(()=>b.save([]),/recovery/i);assert.equal(shared.precious,'original');
});
