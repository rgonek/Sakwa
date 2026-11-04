import test from 'node:test';
import assert from 'node:assert/strict';
import { contextFor, contextKey, contextStatus, recipients } from '../mods/sakwa/context.js';

const spaces = [{id:'s1',name:'Sheep',machine:null,tabs:[{id:'t1',name:'One'},{id:'t2',name:'Two'}]},
  {id:'remote/s1',name:'Remote',machine:'remote',tabs:[{id:'remote/t1',name:'One'}]}];
const focus = {space:'s1',tab:'t1'};
test('identity survives rename and separates scopes and machines', () => {
  const tab = contextFor('tab',focus,spaces);
  assert.equal(contextKey(tab),contextKey({...tab,label:'Renamed'}));
  assert.notEqual(contextKey(tab),contextKey(contextFor('space',focus,spaces)));
  assert.notEqual(contextKey(tab),contextKey(contextFor('tab',{space:'remote/s1',tab:'remote/t1'},spaces)));
  assert.equal(contextFor('tab',null,spaces),null);
  assert.equal(contextFor('global',null,spaces).scope,'global');
});
test('archive distinguishes closed contexts from unavailable machines', () => {
  const c = contextFor('tab',focus,spaces);
  assert.equal(contextStatus(c,spaces,[{name:null,layout:'ready'}]),'active');
  assert.equal(contextStatus(c,[],[{name:null,layout:'ready'}]),'archived');
  assert.equal(contextStatus(c,[],[{name:null,layout:'loading'}]),'unavailable');
  assert.equal(contextStatus({...c,machine:'remote'},[],[]),'unavailable');
});
test('recipients stay strictly within the note context and exclude dead terminals', () => {
  const agents = [{address:'t1',space:'s1',tab:'t1',app:'codex'},
    {address:'t2',space:'s1',tab:'t2',app:'claude'},
    {address:'remote/t1',space:'remote/s1',tab:'remote/t1',app:'codex'}];
  const terminals = agents.map(a=>({...a,state:'live'}));
  assert.deepEqual(recipients(contextFor('tab',focus,spaces),agents,terminals).map(a=>a.address),['t1']);
  assert.equal(recipients(contextFor('space',focus,spaces),agents,terminals).length,2);
  assert.equal(recipients(contextFor('global',null,spaces),agents,terminals).length,3);
  assert.equal(recipients(contextFor('tab',focus,spaces),agents,[{...terminals[0],finished:true}]).length,0);
});
