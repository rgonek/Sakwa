import { registerHooks } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
const stub=new URL('./helpers/native-stubs.mjs',import.meta.url).href;
registerHooks({resolve(specifier,context,next){
  return ['herdr','gpui-kit','gpui-base'].includes(specifier)?{url:stub,shortCircuit:true}:next(specifier,context);
}});
const {default:Sakwa}=await import('../mods/sakwa/main.js');
const {contextKey}=await import('../mods/sakwa/context.js');
async function fixture(t,initial={}) {
  const home=await mkdtemp(join(tmpdir(),'sakwa-native-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),flush:async()=>{}};
  const state={home,props:initial,focus:{space:'s1',tab:'t1',pane:'p1'},commands:[],sent:[],shared:new Map(),
    spaces:[{id:'s1',machine:null,name:'Sheep',tabs:[{id:'t1',name:'One'},{id:'t2',name:'Two'}]}]};
  const failures=[];
  state.cx={spawn:fn=>{const promise=fn(state.cx);promise.catch(e=>failures.push(e));},notify:()=>{},
    timer:{every:()=>{}},write_to_clipboard:text=>{state.clipboard=text;}};
  globalThis.nativeTest=state;
  const view=new Sakwa();view.init({},state.cx);
  await until(()=>view.loaded);
  return {view,state,cx:state.cx,failures};
}
async function until(condition) {
  for(let i=0;i<1000;i++){if(condition())return;await new Promise(r=>setTimeout(r,2));}
  assert.fail('Native view operation did not complete');
}
function nodes(root) {return [root,...(root.nodes||[]).filter(n=>typeof n==='object'&&n).flatMap(nodes)];}
test('context group marks current scope including pinned notes and switches on selection',async t=>{
  const context={scope:'space',machine:null,space:'s1',tab:null,label:'Sheep'};
  const {view,cx}=await fixture(t,{context});
  let tree=nodes(view.render(cx));
  const group=tree.find(n=>n.type==='toggle-group');assert.ok(group);
  assert.equal(tree.find(n=>n.options.id==='scope-space').options.pressed,true);
  const tab=tree.find(n=>n.options.id==='scope-tab');tab.handlers.on_change(true,cx);
  tree=nodes(view.render(cx));
  assert.equal(tree.find(n=>n.options.id==='scope-tab').options.pressed,true);
  assert.equal(tree.some(n=>n.nodes.includes('Sheep / One')),false);
});
test('sidebar frame is flat for native pane or tab copies',async t=>{
  const {view,cx}=await fixture(t);
  assert.equal(Object.hasOwn(view.render(cx).options,'border_1'),true);
  const {view:pane,cx:pcx}=await fixture(t,{pane:'p9',role:'pane'});
  const flat=pane.render(pcx),tree=nodes(flat);
  assert.equal(Object.hasOwn(flat.options,'border_1'),false);
  assert.equal(tree.some(n=>n.nodes.includes('Sakwa')),false);
  assert.equal(tree.some(n=>n.options.id==='open-note'),false);
  const tools=tree.find(n=>n.options.id==='scope-tools');
  assert.ok(nodes(tools).some(n=>n.options.id==='all-notes'));
});
test('Open popover has measurable height and its items dispatch native placement',async t=>{
  const {view,state,cx}=await fixture(t);state.panes=[{pane:'p1',tab:'t1',terminal:'t7'}];
  let tree=nodes(view.render(cx));
  const opener=tree.find(n=>n.options.id==='open-note');opener.handlers.on_open_change(true,cx);
  tree=nodes(view.render(cx));const open=tree.find(n=>n.options.id==='open-note');
  assert.ok(open.options.content.options.h>0,'Scrollable popover needs a definite height');
  const actions=nodes(open.options.content);
  for(const place of ['tab','right','down'])actions.find(n=>n.options.id===`open-${place}`).handlers.on_click({},cx);
  assert.deepEqual(state.commands.map(c=>c[0]),['tab.new','pane.split','pane.split']);
  assert.ok(state.commands.every(c=>c[1].props.role==='pane'));
});
test('view keeps edits attached to their original tab through async save and switch',async t=>{
  const {view,state,cx,failures}=await fixture(t);
  view.editor.set_value('One 🐑');state.focus={space:'s1',tab:'t2',pane:'p2'};
  view.render(cx);await until(()=>view.current?.tab==='t2');
  assert.equal(view.editor.value(),'');view.editor.set_value('Two 🐑');
  await until(()=>!view.book.pending().length);
  const notes=view.journal.notes();
  assert.equal(notes.find(n=>n.context.tab==='t1').text,'One 🐑');
  assert.equal(notes.find(n=>n.context.tab==='t2').text,'Two 🐑');
  state.focus.tab='t1';view.render(cx);await until(()=>view.current?.tab==='t1');
  assert.equal(view.editor.value(),'One 🐑');assert.deepEqual(failures,[]);
});
test('pinned editor stays on its source note and closing a context preserves archive',async t=>{
  const context={scope:'tab',machine:null,space:'s1',tab:'t1',label:'Sheep / One'};
  const {view,state,cx}=await fixture(t,{context});
  view.editor.set_value('Remember the sheep');await until(()=>!view.book.pending().length);
  state.focus.tab='t2';state.spaces[0].tabs=state.spaces[0].tabs.filter(t=>t.id!=='t1');
  view.render(cx);assert.equal(view.current.tab,'t1');
  assert.equal(view.allNotes()[0].text,'Remember the sheep');
  assert.doesNotThrow(()=>{view.panel='all';view.render(cx);view.archive(cx);});
  assert.equal(view.journal.history(contextKey(context)).length,1);
});
test('scoped send uses picker for multiple agents and retains note after send',async t=>{
  const {view,state,cx}=await fixture(t);
  state.agents=[{address:'t7',space:'s1',tab:'t1',app:'codex'},{address:'t8',space:'s1',tab:'t1',app:'claude'}];
  state.terminals=state.agents.map(a=>({...a,state:'live'}));
  view.editor.set_value('A full note');view.sendClick(cx);
  assert.equal(view.panel,'recipients');assert.equal(state.sent.length,0);
  view.send('t8',cx);await until(()=>!view.busy);
  assert.equal(state.sent[0][3],'t8');assert.equal(state.sent[0][4],'A full note');
  assert.equal(view.editor.value(),'A full note');
});
