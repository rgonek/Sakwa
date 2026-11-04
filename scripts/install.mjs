#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function install({appHome,source=repository}) {
  if(!appHome)throw Error('An app home is required');
  const root=resolve(appHome),from=join(source,'mods','sakwa'),mod=join(root,'mods','sakwa');
  const names=readdirSync(from).filter(n=>n.endsWith('.js')||n.endsWith('.svg')||n==='mod.json'||n==='icons');
  for(const required of ['main.js','mod.json','context.js','journal.js','drafts.js','recovery.js','persistence.js','presentation.js','ui.js','icon.svg']) {
    if(!names.includes(required))throw Error(`Incomplete distribution: missing ${required}`);
  }
  if(!existsSync(join(from,'icons','LICENSE-Lucide.txt')))throw Error('Incomplete distribution: missing Lucide license');
  if(existsSync(mod) && lstatSync(mod).isSymbolicLink())throw Error('Mod directory is a symbolic link; choose its actual app home');
  let backup=null;
  if(existsSync(mod)) {
    const backups=join(root,'data','sakwa-install-backups');mkdirSync(backups,{recursive:true});
    backup=join(mkdtempSync(join(backups,'install-')),'sakwa');cpSync(mod,backup,{recursive:true});
  }
  mkdirSync(mod,{recursive:true});
  for(const name of names)cpSync(join(from,name),join(mod,name),{recursive:name==='icons'});
  return {mod,backup};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.includes('--help')) {
      console.log('Usage: node scripts/install.mjs [--app-home PATH]\nDefault: HERDR_APP_HOME or ~/.config/herdr-app. Installs mod only; notes and layouts are preserved.');
    } else {
      let appHome=process.env.HERDR_APP_HOME || join(homedir(),'.config','herdr-app');
      for(let i=0;i<args.length;i++) {
        if(args[i]!=='--app-home')throw Error(`Unknown option: ${args[i]}`);
        if(!args[i+1] || args[i+1].startsWith('--'))throw Error('--app-home requires a path');
        appHome=args[++i];
      }
      const result=install({appHome});
      console.log(`Installed Sakwa: ${result.mod}${result.backup?`\nPrevious mod backed up: ${result.backup}`:''}`);
      console.log('Run: herdr-app check "'+result.mod+'"');
    }
  } catch(e) { console.error(e.message);process.exitCode=1; }
}
