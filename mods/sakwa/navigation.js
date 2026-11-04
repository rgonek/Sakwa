// Standalone module, also copied beside personal toolbar mods by the installer.
export function sidebarRoute(root,{includeHidden=false}={}) {
  function visit(node,path) {
    if(!node||!includeHidden&&node.hidden)return null;
    if(node.content?.mod==='sakwa'&&node.content.props?.role!=='pane')return [...path,node];
    const children=node.type==='stack'&&!includeHidden?(node.children||[]).filter((c,i)=>node.active?c.id===node.active:i===0):node.children||[];
    for(const child of children){const found=visit(child,[...path,node]);if(found)return found;}
    return null;
  }
  const path=visit(root,[]);if(!path)return null;
  let container=path.at(-1).id;
  for(let i=path.length-2;i>0;i--){
    const parent=path[i],visible=(parent.children||[]).filter(c=>!c.hidden);
    if(parent.type!=='stack'&&visible.length!==1)break;
    if(parent.id)container=parent.id;
  }
  const stacks=path.slice(0,-1).flatMap((n,i)=>n.type==='stack'&&n.id&&path[i+1].id?[{stack:n.id,child:path[i+1].id}]:[]);
  return {block:path.at(-1).id,container,stacks,hidden:path.filter(n=>n.hidden&&n.id).map(n=>n.id)};
}

export function showSidebar(run,root) {
  const route=sidebarRoute(root,{includeHidden:true});
  if(!route?.block||!route.container)throw Error('The Sakwa sidebar is unavailable in this layout; the note stays open');
  for(const args of route.stacks)run('layout.select',args);
  for(const id of new Set([...route.hidden,route.block,route.container]))run('layout.show',{id});
}

export function findNoteRoute(state={}) {
  const focus=state.focus||{},space=(state.spaces||[]).find(s=>s.id===focus.space)||state.spaces?.find(s=>s.active);
  if(!space)return null;
  const registry=state.shared?.('sakwa.views.v1');
  const routes=Object.entries(registry&&typeof registry==='object'?registry:{}).flatMap(([id,record])=>{
    if(!record||record.space!==space.id||!space.tabs?.some(t=>t.id===record.tab))return [];
    const pane=(state.panes||[]).find(p=>p.pane===record.pane&&p.tab===record.tab&&p.mod==='sakwa');
    if(!pane)return [];
    const active=focus.pane===record.pane;
    const rank=active?100:record.tab===focus.tab?80:record.source?.tab===focus.tab?60:
      record.context?.tab===focus.tab?50:record.context?.scope==='space'?30:record.context?.scope==='global'?20:10;
    return [{id,record,active,rank}];
  });
  return routes.sort((a,b)=>b.rank-a.rank||(b.record.at||0)-(a.record.at||0)||a.id.localeCompare(b.id))[0]||null;
}

export function sakwaActive(state) {return Boolean(findNoteRoute(state)||sidebarRoute(state.layout));}

export function toggleSakwa(run,state) {
  const route=findNoteRoute(state);
  if(route){
    if(route.active)run('sakwa.sidebar');
    else {
      const visible=sidebarRoute(state.layout);if(visible?.container)run('layout.hide',{id:visible.container});
      if(state.focus?.tab!==route.record.tab)run('tab.select',{id:route.record.tab});
      run('pane.focus',{pane:route.record.pane});
    }
    return;
  }
  const visible=sidebarRoute(state.layout);
  if(visible?.container)run('layout.hide',{id:visible.container});
  else if(sidebarRoute(state.layout,{includeHidden:true}))showSidebar(run,state.layout);
  else run('mod.open',{name:'sakwa'});
}

export function returnNoteToSidebar(run,state,record,setShared) {
  const source=record.source;
  if(!source?.tab||!state.spaces?.some(s=>s.id===source.space&&s.tabs?.some(t=>t.id===source.tab))) {
    throw Error('The source tab is no longer open; the note stays here');
  }
  if(!sidebarRoute(state.layout,{includeHidden:true}))throw Error('The source sidebar is unavailable; the note stays here');
  if(!state.panes?.some(p=>p.pane===record.pane&&p.tab===record.tab&&p.mod==='sakwa'))throw Error('This note view is no longer available');
  const terminal=state.panes.find(p=>p.pane===source.pane&&p.tab===source.tab)||state.panes.find(p=>p.tab===source.tab&&p.terminal);
  run('tab.select',{id:source.tab});
  if(terminal)run('pane.focus',{pane:terminal.pane});
  setShared('sakwa.sidebar.selection.v1',{context:record.context,space:source.space,tab:source.tab,token:`${Date.now()}-${record.pane}`});
  showSidebar(run,state.layout);
  if(state.panes.some(p=>p.tab===record.tab&&p.pane!==record.pane))run('pane.close',{pane:record.pane});
  else run('tab.close',{id:record.tab});
}
