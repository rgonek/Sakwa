// Native marketing fixture: real Sakwa views, synthetic in-memory notes only.
// Run with Herdr open. Close the dialog with: herdr-app do overlay.close
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const appHome=process.env.HERDR_APP_HOME||join(homedir(),'.config','herdr-app');
const name='sakwa-marketing-fixture';
const destination=join(appHome,'mods',name);
const source=resolve('mods/sakwa');
if(existsSync(destination))throw Error(`Fixture already exists: ${destination}. Remove your previous fixture first.`);
mkdirSync(destination,{recursive:true});
cpSync(source,destination,{recursive:true,filter:path=>!path.endsWith('.d.ts')&&!path.endsWith('jsconfig.json')});
let main=readFileSync(join(destination,'main.js'),'utf8');
main=main.replaceAll("'sakwa.","'sakwa-marketing-fixture.");
writeFileSync(join(destination,'controller.js'),main);
const context={scope:'tab',machine:null,space:'demo-field-notes',tab:'demo-next-session',label:'Field Notes / Next session'};
const notes=[
  {context,text:'Next session\n\nThe note picker is ready. Before we ship:\n\n[ ] Check the empty state\n[ ] Try a long note in a narrow pane\n[ ] Read through the install steps\n\nFor the agent\nKeep the current layout. Focus on the note\npicker and leave the toolbar as it is.\n\nRemember\nPick up at the keyboard navigation test.'},
  {context:{scope:'space',machine:null,space:'demo-field-notes',tab:null,label:'Field Notes'},text:'Release checklist\n\nCheck the README images and keep the install steps short.'},
  {context:{scope:'tab',machine:null,space:'demo-campfire',tab:'demo-small-ideas',label:'Campfire / Small ideas'},text:'A small idea for later\n\nTry a quieter empty state after the release.'},
];
const records=notes.map((n,i)=>({...n,schema:1,id:`marketing-note-${i}`,key:JSON.stringify([n.context.scope,n.context.machine,n.context.space,n.context.tab]),at:1793790000000-i*60000,parents:[]}));
writeFileSync(join(destination,'persistence.js'),`const records=${JSON.stringify(records)};\nexport function fileAdapter(){const files=new Map(records.map(r=>[r.id+'.json',JSON.stringify(r)]));return {list:async()=>[...files.keys()],read:async name=>files.get(name),create:async(name,text)=>{if(files.has(name))throw Error('Exists');files.set(name,text);}};}\n`);
writeFileSync(join(destination,'main.js'),`import Sakwa from './controller.js';\nexport default class Preview extends Sakwa { init(initial,cx){super.init({...initial,role:'sidebar',context:${JSON.stringify(context)}},cx);} }\n`);
writeFileSync(join(destination,'mod.json'),JSON.stringify({place:'none',overlay:{width:680,height:620}},null,2));
execFileSync('herdr-app',['check',destination],{stdio:'inherit'});
execFileSync('herdr-app',['do','mod.open','--name',name],{stdio:'inherit'});
console.log(`Native fixture: ${destination}`);
