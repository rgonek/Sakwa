import { recipients } from './context.js';

export function openNote(run,place,context,focus,panes) {
  if (!context) throw Error('Select a note first');
  const props = {context:{...context}};
  if (place === 'tab') {
    if (!focus?.space) throw Error('Select a space before opening a tab');
    run('tab.new',{name:`Sakwa · ${context.label}`,space:focus.space,mod:'sakwa',props});
    return;
  }
  if (!['right','down'].includes(place)) throw Error('Unknown placement');
  const target = panes.find(p=>p.pane === focus?.pane) ||
    panes.find(p=>p.tab === focus?.tab && p.terminal) || panes.find(p=>p.tab === focus?.tab);
  if (!target) throw Error('No native pane available to split');
  run('pane.split',{pane:target.pane,direction:place,mod:'sakwa',props});
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
  const result = await transport(['send',address,text,'--json']);
  if (result.code !== 0) throw Error(`Delivery not confirmed: ${result.stderr || result.stdout || 'transport failed'}. Inspect the agent before retrying.`);
}
