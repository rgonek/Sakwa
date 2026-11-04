export function integrateToolbar(source) {
  const marker='// sakwa-toolbar-navigation-v1';
  if(source.includes(marker))return source;
  const start=source.indexOf('const panelButton =');
  if(start<0||!source.includes('"sakwa-sidebar"'))throw Error('Unsupported toolbar: expected an existing Sakwa panel button');
  const before=source.slice(0,start),section=source.slice(start);
  const selected=section.match(/const on = ([^\r\n]+);/);
  const click='if (id === "git-review-sidebar")';
  if(!selected||!section.includes(click))throw Error('Unsupported toolbar panel-button implementation; original preserved');
  const changed=section.replace(selected[0],`const on = id === "sakwa-sidebar" ? sakwaActive(sakwaState()) : (${selected[1]});`)
    .replace(click,'if (id === "sakwa-sidebar") { toggleSakwa(sakwaRun, sakwaState()); return; }\n          '+click);
  return `${marker}
import { sakwaActive, toggleSakwa } from "./sakwa-navigation.js";
import { focused as sakwaFocus, spaces as sakwaSpaces, panes as sakwaPanes, shared as sakwaShared, layout as sakwaLayout, run as sakwaRun } from "herdr";
const sakwaState = () => ({focus:sakwaFocus(), spaces:sakwaSpaces(), panes:sakwaPanes(), shared:sakwaShared, layout:sakwaLayout()});
`+before+changed;
}
