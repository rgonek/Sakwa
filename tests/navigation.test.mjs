import test from 'node:test';
import assert from 'node:assert/strict';
import { findNoteRoute, sakwaActive, toggleSakwa, sidebarRoute, returnNoteToSidebar } from '../mods/sakwa/navigation.js';
const context={scope:'tab',machine:null,space:'s1',tab:'t1',label:'One'};
function fixture(){
  const records={v1:{pane:'n1',tab:'notes',space:'s1',context,source:{space:'s1',tab:'t1',pane:'p1'},at:1}};
  const layout={id:'root',type:'row',children:[{id:'work',content:{tab:'active'}},
    {id:'rail',type:'column',hidden:true,children:[{id:'stack',type:'stack',active:'notes-slot',children:[
      {id:'files',content:{mod:'files'}},{id:'notes-slot',content:{mod:'sakwa'}}]}]}]};
  return {focus:{space:'s1',tab:'t1',pane:'p1'},spaces:[{id:'s1',tabs:[{id:'t1'},{id:'notes'}]}],
    panes:[{pane:'p1',tab:'t1',terminal:'t7'},{pane:'n1',tab:'notes',mod:'sakwa'}],layout,
    shared:key=>key==='sakwa.views.v1'?records:null,records};
}
test('toolbar is active for a live detached note and navigates to it rather than duplicating',()=>{
  const state=fixture(),calls=[];
  assert.equal(sakwaActive(state),true);assert.equal(findNoteRoute(state).record.pane,'n1');
  toggleSakwa((...args)=>calls.push(args),state);
  assert.deepEqual(calls,[['tab.select',{id:'notes'}],['pane.focus',{pane:'n1'}]]);
  state.focus={space:'s1',tab:'notes',pane:'n1'};calls.length=0;
  toggleSakwa((...args)=>calls.push(args),state);
  assert.deepEqual(calls,[['sakwa.sidebar']]);
});
test('split pane receives focus first, then returns to sidebar on next toolbar click',()=>{
  const state=fixture(),calls=[];state.records.v1.tab='t1';state.panes[1].tab='t1';
  toggleSakwa((...a)=>calls.push(a),state);assert.deepEqual(calls,[['pane.focus',{pane:'n1'}]]);
  state.focus.pane='n1';calls.length=0;toggleSakwa((...a)=>calls.push(a),state);
  assert.deepEqual(calls,[['sakwa.sidebar']]);
});
test('stale and other-space records do not activate toolbar; sidebar toggles normally',()=>{
  const state=fixture(),calls=[];state.panes.pop();
  assert.equal(sakwaActive(state),false);toggleSakwa((...a)=>calls.push(a),state);
  assert.ok(calls.some(([name,args])=>name==='layout.show'&&args.id==='rail'));
  state.layout.children[1].hidden=false;calls.length=0;
  assert.equal(sakwaActive(state),true);toggleSakwa((...a)=>calls.push(a),state);
  assert.deepEqual(calls,[['layout.hide',{id:'rail'}]]);
});
test('return restores source and selected note before closing detached tab',()=>{
  const state=fixture(),calls=[],selection=[];
  const route=sidebarRoute(state.layout,{includeHidden:true});assert.equal(route.container,'rail');
  returnNoteToSidebar((...a)=>calls.push(a),state,state.records.v1,(...a)=>selection.push(a));
  assert.equal(calls[0][0],'tab.select');assert.equal(calls[0][1].id,'t1');
  assert.ok(calls.some(([name,args])=>name==='layout.select'&&args.stack==='stack'&&args.child==='notes-slot'));
  assert.deepEqual(calls.at(-1),['tab.close',{id:'notes'}]);
  assert.deepEqual(selection[0][1].context,context);
});
test('missing source or sidebar leaves detached notes open',()=>{
  const state=fixture(),calls=[];state.spaces[0].tabs=state.spaces[0].tabs.filter(t=>t.id!=='t1');
  assert.throws(()=>returnNoteToSidebar((...a)=>calls.push(a),state,state.records.v1,()=>{}),/source/i);
  assert.equal(calls.length,0);
});
test('multiple views choose the focused view then the source-matching view deterministically',()=>{
  const state=fixture();state.spaces[0].tabs.push({id:'other'});state.panes.push({pane:'n2',tab:'other',mod:'sakwa'});
  state.records.v2={...state.records.v1,pane:'n2',tab:'other',at:100,source:{tab:'elsewhere'}};
  assert.equal(findNoteRoute(state).record.pane,'n1');
  state.focus={space:'s1',tab:'other',pane:'n2'};assert.equal(findNoteRoute(state).record.pane,'n2');
});
