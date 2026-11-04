import { recipients } from './context.js';
import { sidebarRoute } from './navigation.js';

export function openNote(run,place,context,focus,panes,sidebarLayout=null) {
  if (!context) throw Error('Select a note first');
  const origin=sidebarRoute(sidebarLayout)?.container;
  const hideOrigin=()=>{if(origin)run('layout.hide',{id:origin});};
  const props = {context:{...context},role:'pane',source:{space:focus?.space,tab:focus?.tab,pane:focus?.pane??null},
    opening:{place,panes:panes.map(p=>p.pane),tabs:[...new Set(panes.map(p=>p.tab))]}};
  if (place === 'tab') {
    if (!focus?.space) throw Error('Select a space before opening a tab');
    run('tab.new',{name:`Sakwa · ${context.label}`,space:focus.space,mod:'sakwa',props});
    hideOrigin();
    return;
  }
  if (!['right','down'].includes(place)) throw Error('Unknown placement');
  const target = panes.find(p=>p.pane === focus?.pane) ||
    panes.find(p=>p.tab === focus?.tab && p.terminal) || panes.find(p=>p.tab === focus?.tab);
  if (!target) throw Error('No native pane available to split');
  run('pane.split',{pane:target.pane,direction:place,mod:'sakwa',props});
  hideOrigin();
}

export function utf8Length(text) {
  let bytes = 0;
  for (const char of text) { const n=char.codePointAt(0);bytes += n<128?1:n<2048?2:n<65536?3:4; }
  return bytes;
}

export async function sendNote(context,text,address,agents,terminals,transport) {
  if (!text.trim()) throw Error('The note is empty');
  if (!recipients(context,agents,terminals).some(a=>a.address === address)) throw Error('This agent is no longer available in the note context');
  if (utf8Length(text)>16000) throw Error('Note exceeds the 16000-byte send limit. Nothing was sent; copy the note instead.');
  const result = await transport(['send','--json','--',address,text]);
  if (result.code !== 0) throw Error(`Delivery not confirmed: ${result.stderr || result.stdout || 'transport failed'}. Inspect the agent before retrying.`);
}
