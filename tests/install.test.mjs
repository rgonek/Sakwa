import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { install } from '../scripts/install.mjs';
function home(t){const dir=mkdtempSync(join(tmpdir(),'sakwa-install-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
test('installer copies runtime only and preserves layout and note data',t=>{
  const root=home(t);mkdirSync(join(root,'layouts'));writeFileSync(join(root,'layouts','mine.json'),'personal');
  mkdirSync(join(root,'data','sakwa'),{recursive:true});writeFileSync(join(root,'data','sakwa','precious.json'),'notes');
  const result=install({appHome:root});
  assert.equal(readFileSync(join(result.mod,'mod.json'),'utf8').includes('Sakwa'),true);
  assert.equal(existsSync(join(result.mod,'gpui-kit.d.ts')),false);
  assert.match(readFileSync(join(result.mod,'icons','send.svg'),'utf8'),/<svg/);
  assert.match(readFileSync(join(result.mod,'icons','LICENSE-Lucide.txt'),'utf8'),/Lucide/);
  assert.equal(readFileSync(join(root,'layouts','mine.json'),'utf8'),'personal');
  assert.equal(readFileSync(join(root,'data','sakwa','precious.json'),'utf8'),'notes');
});
test('upgrades back up existing mod before replacing its code',t=>{
  const root=home(t);const first=install({appHome:root});writeFileSync(join(first.mod,'main.js'),'old custom code');
  const result=install({appHome:root});
  assert.equal(readFileSync(join(result.backup,'main.js'),'utf8'),'old custom code');
  assert.match(readFileSync(join(result.mod,'main.js'),'utf8'),/class Sakwa/);
});
test('CLI supports paths containing spaces and reports unknown options without writing',t=>{
  const root=join(home(t),'Herdr home');
  const good=spawnSync(process.execPath,['scripts/install.mjs','--app-home',root],{encoding:'utf8'});
  assert.equal(good.status,0,good.stderr);assert.equal(existsSync(join(root,'mods','sakwa','main.js')),true);
  const bad=spawnSync(process.execPath,['scripts/install.mjs','--typo'],{encoding:'utf8'});
  assert.notEqual(bad.status,0);assert.match(bad.stderr,/Unknown option/);
});
