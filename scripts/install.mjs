#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { integrateToolbar } from './toolbar.mjs';

const repository=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function install({appHome,source=repository,tabsName=null}) {
  if(!appHome)throw Error('An app home is required');
  const root=resolve(appHome),from=join(source,'mods','sakwa'),mod=join(root,'mods','sakwa');
  const names=readdirSync(from).filter(n=>n.endsWith('.js')||n.endsWith('.svg')||n==='mod.json'||n==='icons');
  for(const required of ['main.js','mod.json','context.js','journal.js','drafts.js','recovery.js','navigation.js','persistence.js','presentation.js','ui.js','icon.svg']) {
    if(!names.includes(required))throw Error(`Incomplete distribution: missing ${required}`);
  }
  if(!existsSync(join(from,'icons','LICENSE-Lucide.txt')))throw Error('Incomplete distribution: missing Lucide license');
  if(existsSync(mod) && lstatSync(mod).isSymbolicLink())throw Error('Mod directory is a symbolic link; choose its actual app home');
  let tabs=null,tabsSource=null;
  if(tabsName){
    if(!/^[\w-]+$/.test(tabsName)||['tabs','tabs-icons','win98'].includes(tabsName))throw Error('Choose a personal toolbar mod');
    tabs=join(root,'mods',tabsName);
    if(lstatSync(tabs).isSymbolicLink())throw Error('Toolbar directory is a symbolic link');
    tabsSource=integrateToolbar(readFileSync(join(tabs,'main.js'),'utf8'));
  }
  let backup=null;
  let tabsBackup=null;
  const backups=join(root,'data','sakwa-install-backups');
  if(existsSync(mod)) {
    mkdirSync(backups,{recursive:true});
    backup=join(mkdtempSync(join(backups,'install-')),'sakwa');cpSync(mod,backup,{recursive:true});
  }
  if(tabs){
    mkdirSync(backups,{recursive:true});tabsBackup=join(mkdtempSync(join(backups,'toolbar-')),tabsName);
    cpSync(tabs,tabsBackup,{recursive:true});
  }
  mkdirSync(mod,{recursive:true});
  for(const name of names)cpSync(join(from,name),join(mod,name),{recursive:name==='icons'});
  if(tabs){
    cpSync(join(from,'navigation.js'),join(tabs,'sakwa-navigation.js'));
    writeFileSync(join(tabs,'main.js'),tabsSource,'utf8');
  }
  return {mod,backup,tabsBackup};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.includes('--help')) {
      console.log('Usage: node scripts/install.mjs [--app-home PATH] [--tabs PERSONAL-MOD]\nDefault: HERDR_APP_HOME or ~/.config/herdr-app. Optional --tabs upgrades an existing Sakwa toolbar button. Notes and layouts are preserved.');
    } else {
      let appHome=process.env.HERDR_APP_HOME || join(homedir(),'.config','herdr-app');
      let tabsName=null;
      for(let i=0;i<args.length;i++) {
        const flag=args[i];if(!['--app-home','--tabs'].includes(flag))throw Error(`Unknown option: ${flag}`);
        if(!args[i+1] || args[i+1].startsWith('--'))throw Error(`${flag} requires a value`);
        const value=args[++i];if(flag==='--tabs')tabsName=value;else appHome=value;
      }
      const result=install({appHome,tabsName});
      console.log(`Installed Sakwa: ${result.mod}${result.backup?`\nPrevious mod backed up: ${result.backup}`:''}`);
      console.log('Run: herdr-app check "'+result.mod+'"');
      if(result.tabsBackup)console.log(`Previous toolbar backed up: ${result.tabsBackup}`);
    }
  } catch(e) { console.error(e.message);process.exitCode=1; }
}
