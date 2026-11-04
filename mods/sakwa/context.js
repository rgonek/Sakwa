export function contextKey(c) {
  return JSON.stringify([c.scope,c.machine ?? null,c.space ?? null,c.tab ?? null]);
}

export function validContext(c) {
  return c && ['tab','space','global'].includes(c.scope) &&
    (c.machine === null || typeof c.machine === 'string') && typeof c.label === 'string' &&
    (c.scope === 'global' ? c.machine === null && c.space === null && c.tab === null :
      typeof c.space === 'string' && (c.scope === 'tab' ? typeof c.tab === 'string' : c.tab === null));
}

export function contextFor(scope,focus,spaces) {
  if (scope === 'global') return {scope,machine:null,space:null,tab:null,label:'Global'};
  const space = spaces.find(s=>s.id === focus?.space);
  if (!space) return null;
  const tab = space.tabs.find(t=>t.id === focus?.tab);
  if (scope === 'tab' && !tab) return null;
  if (!['tab','space'].includes(scope)) return null;
  return {scope,machine:space.machine ?? null,space:space.id,tab:scope === 'tab' ? tab.id : null,
    label:scope === 'tab' ? `${space.name} / ${tab.name}` : space.name};
}

export function contextStatus(c,spaces,machines) {
  if (c.scope === 'global') return 'active';
  const machine = machines.find(m=>m.name === c.machine);
  if (machine?.layout !== 'ready') return 'unavailable';
  const space = spaces.find(s=>s.id === c.space && (s.machine ?? null) === c.machine);
  return space && (c.scope === 'space' || space.tabs.some(t=>t.id === c.tab)) ? 'active' : 'archived';
}

export function recipients(context,agents,terminals) {
  if (!context) return [];
  const byAddress = new Map(agents.map(a=>[a.address,a]));
  const seen = new Set();
  return terminals.flatMap(t=>{
    const address = t.address || t.id, agent = byAddress.get(address);
    if (!address || seen.has(address) || t.finished ||
      (t.state && !['live','running'].includes(t.state)) ||
      !(agent?.app || agent?.program?.agent || t.program?.agent || t.report?.app)) return [];
    // Agent contexts are already qualified by Herdr, including remote machines.
    const machine = address.includes('/') ? address.split('/')[0] : null;
    const qualify = id=>id && machine && !id.startsWith(`${machine}/`) ? `${machine}/${id}` : id;
    const space = agent?.space || qualify(t.labels?.['herdr.space']);
    const tab = agent?.tab || qualify(t.labels?.['herdr.tab']);
    if (context.scope !== 'global' && (machine !== context.machine || space !== context.space ||
      (context.scope === 'tab' && tab !== context.tab))) return [];
    seen.add(address);
    return [{address,space,tab,name:agent?.name || t.title || t.name || agent?.app || address}];
  });
}
