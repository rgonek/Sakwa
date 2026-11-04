import * as fs from 'node:fs/promises';
export class View {}
export function element(type) {
  const node={type,nodes:[],handlers:{},options:{},consumed:false};
  const proxy=new Proxy(node,{get(target,key){
    if(key in target)return target[key];
    if(key==='then')return undefined;
    return (...args)=>{
      if(target.consumed)throw Error('Native elements are single-use after attachment');
      const attach=child=>{if(child&&typeof child==='object'&&Array.isArray(child.nodes))child.consumed=true;};
      if(key==='child')target.nodes.push(args[0]);
      else if(key==='children')target.nodes.push(...args[0]);
      else if(key==='when'){if(args[0])args[1](proxy);}
      else if(key==='on_click'||key==='on_open_change'||key==='on_change')target.handlers[key]=args[0];
      else target.options[key]=args.length===1?args[0]:args;
      if(['child','trigger','content'].includes(key))attach(args[0]);
      if(key==='children')args[0].forEach(attach);
      return proxy;
    };
  }});
  return proxy;
}
export const div=()=>element('div'),svg=()=>element('svg'),v_flex=()=>element('column'),h_flex=()=>element('row');
export const Button={new:id=>element('button').id(id)},Popover={new:id=>element('popover').id(id)};
export const RadioGroup={new:id=>element('radio-group').id(id)},Radio={new:id=>element('radio').id(id)};
function input(options={}) {
  let value=options.value||'';const handlers={};
  return {value:()=>value,on:(name,fn)=>{handlers[name]=fn;},
    set_value:next=>{value=next;handlers.change?.({},globalThis.nativeTest.cx);},
    focus:()=>handlers.focus?.({},globalThis.nativeTest.cx),
    blur:()=>handlers.blur?.({},globalThis.nativeTest.cx)};
}
export const TextareaState={new:input},InputState={new:input};
export const Textarea={new:state=>element('textarea').state(state)},Input={new:state=>element('input').state(state)};
export const theme=()=>new Proxy({},{get:()=> '#888888'});
export const spaces=()=>globalThis.nativeTest.spaces,machines=()=>[{name:null,layout:'ready'}];
export const agents=()=>globalThis.nativeTest.agents||[],terminals=()=>globalThis.nativeTest.terminals||[];
export const panes=()=>globalThis.nativeTest.panes||[],focused=()=>globalThis.nativeTest.focus;
export const layout=()=>globalThis.nativeTest.layout||null;
export const props=()=>globalThis.nativeTest.props||{},run=(...args)=>globalThis.nativeTest.commands.push(args);
export const appHome=()=>globalThis.nativeTest.home;
export const shared=key=>globalThis.nativeTest.shared.get(key);
export const setShared=(key,value)=>globalThis.nativeTest.shared.set(key,value);
export const nextCommand=()=>new Promise(()=>{});
export const hc=async args=>{globalThis.nativeTest.sent.push(args);return {code:0};};
export async function writeTextFile(path,text,expected) {
  if(expected!==null)throw Error('Only immutable creation expected');
  await fs.writeFile(path,text,{flag:'wx'});
}
