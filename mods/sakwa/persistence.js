import * as fs from 'fs/promises';
import { appHome, writeTextFile } from 'herdr';

export function fileAdapter() {
  const root = `${appHome().replace(/\\/g,'/').replace(/\/$/,'')}/data/sakwa/revisions`;
  let ready;
  const directory = ()=>ready ??= fs.mkdir(root,{recursive:true}).catch(e=>{ready=null;throw e;});
  return {
    root,
    async list() { await directory();return fs.readdir(root); },
    async read(name) { return fs.readFile(`${root}/${name}`,'utf8'); },
    async create(name,text) { await directory();await writeTextFile(`${root}/${name}`,text,null); },
  };
}
