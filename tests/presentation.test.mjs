import test from 'node:test';
import assert from 'node:assert/strict';
import { openNote, sendNote } from '../mods/sakwa/presentation.js';
const context={scope:'tab',machine:null,space:'s1',tab:'t1',label:'One'};
test('new tab and splits pin original note context and target an explicit pane',()=>{
  const calls=[],run=(...args)=>calls.push(args);
  openNote(run,'tab',context,{space:'s1',tab:'t1'},[]);
  assert.deepEqual(calls[0],['tab.new',{name:'Sakwa · One',space:'s1',mod:'sakwa',props:{context,role:'pane'}}]);
  openNote(run,'right',context,{space:'s1',tab:'t1',pane:null},[{pane:'p1',tab:'t1',terminal:'t7'}]);
  assert.equal(calls[1][1].pane,'p1');assert.deepEqual(calls[1][1].props.context,context);
  assert.throws(()=>openNote(run,'down',context,null,[]),/pane/i);
});
test('sending revalidates recipient and sends whole text without clearing',async()=>{
  const sent=[],live=[{address:'t7',space:'s1',tab:'t1',app:'codex'}],terminals=[{address:'t7',state:'live'}];
  const transport=async args=>{sent.push(args);return {code:0,stdout:'',stderr:''};};
  await assert.rejects(sendNote(context,'hello','gone',live,terminals,transport),/available/i);
  assert.equal(sent.length,0);
  await sendNote(context,'🐑\nall the text','t7',live,terminals,transport);
  assert.deepEqual(sent[0],['send','--json','--','t7','🐑\nall the text']);
  await assert.rejects(sendNote(context,'x'.repeat(16001),'t7',live,terminals,transport),/limit/i);
  assert.equal(sent.length,1);
});
test('note text beginning with flags is passed literally after option terminator',async()=>{
  const args=[];
  await sendNote(context,'--help','t7',[{address:'t7',space:'s1',tab:'t1',app:'codex'}],
    [{address:'t7',state:'live'}],async a=>{args.push(...a);return {code:0};});
  assert.deepEqual(args,['send','--json','--','t7','--help']);
});
