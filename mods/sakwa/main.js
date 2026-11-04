import { View } from 'gpui-kit';
import { h_flex, v_flex, TextareaState, Textarea, InputState, Input } from 'gpui-base';
import { spaces, machines, agents, terminals, focused, panes, theme, props, layout, run,
  hc, shared, setShared, nextCommand, notify } from 'herdr';
import { contextFor, contextKey, contextStatus, validContext, recipients } from './context.js';
import { createJournal, revisionId } from './journal.js';
import { createDraftBook } from './drafts.js';
import { createRecovery } from './recovery.js';
import { fileAdapter } from './persistence.js';
import { openNote, sendNote } from './presentation.js';
import { returnNoteToSidebar } from './navigation.js';
import { text, button, popover, row, contextGroup } from './ui.js';

export default class Sakwa extends View {
  init(initial,cx) {
    initial={...initial,...props()};
    this.contextProps=initial;this.viewId=revisionId();this.openedAt=Date.now();
    this.seenNotices=new Set();
    this.framed=initial?.role==='sidebar'||initial?.role!=='pane'&&!initial?.pane&&!initial?.overlay;
    this.scope='tab';this.pinned=validContext(initial?.context)?initial.context:null;
    this.current=null;this.baseIds=[];this.loaded=false;this.busy=false;this.panel=null;
    this.journal=createJournal(fileAdapter());
    this.recovery=createRecovery(()=>shared('sakwa.recovery.v1'),value=>setShared('sakwa.recovery.v1',value),revisionId(),id=>this.journal.has(id));
    this.editor=TextareaState.new({placeholder:'Write a note…',rows:12});
    this.query=InputState.new({placeholder:'Find a note…'});
    this.query.on('change',(_e,cx)=>cx.notify());
    this.editor.on('focus',()=>{this.editing=true;});
    this.editor.on('blur',()=>{this.editing=false;});
    this.editor.on('change',(_e,cx)=>{
      if (this.setting || !this.current || !this.book || !this.loaded) return;
      const value=this.editor.value(),pending=this.book.get(contextKey(this.current));
      if (value === (pending?.text ?? this.displayedText)) return;
      const record=this.book.edit(this.current,value,this.baseIds);
      this.baseIds=[record.id];this.displayedText=value;
      this.save(cx);cx.notify();
    });
    try { this.book=createDraftBook(this.journal,localStorage,records=>this.recovery.save(records)); }
    catch(e) { this.fatal=e.message;this.notice(e.message,'error',true); }
    this.refresh(cx);
    // File refresh is for other windows; Herdr live focus/agent data needs no polling.
    cx.timer.every(10000,cx=>this.refresh(cx));
    cx.timer.every(3000,cx=>{if(this.book?.pending().length)this.save(cx);});
    cx.spawn(async cx=>{
      for (;;) {
        const command=await nextCommand(),name=typeof command==='string'?command:command.name;
        if(name==='focus')this.editor.focus();
        if(['tab','space','global'].includes(name))this.selectScope(name,cx);
        if(name==='all'){this.panel='all';cx.notify();}
        if(name==='sidebar'&&!this.framed&&focused()?.pane===this.paneId)this.returnSidebar(cx);
      }
    });
  }

  desired() { return this.pinned || contextFor(this.scope,focused(),spaces()); }
  note(key) { return this.journal.notes().find(n=>n.key===key); }
  setText(value) {
    this.setting=true;
    try { if(this.editor.value()!==value)this.editor.set_value(value);this.displayedText=value; }
    finally { this.setting=false; }
  }
  sync() {
    const selection=shared('sakwa.sidebar.selection.v1'),focus=focused();
    if(this.framed&&selection?.token!==this.sidebarToken&&selection?.space===focus?.space&&selection?.tab===focus?.tab&&validContext(selection.context)){
      this.sidebarToken=selection.token;this.scope=selection.context.scope;
      const natural=contextFor(this.scope,focus,spaces());
      this.pinned=natural&&contextKey(natural)===contextKey(selection.context)?null:selection.context;
    }
    const next=this.desired();
    if(!next){this.current=null;this.setText('');return;}
    const key=contextKey(next),changed=!this.current || contextKey(this.current)!==key;
    const note=this.note(key),draft=this.book?.get(key);
    const ids=draft?[draft.id]:(note?.heads.map(h=>h.id)||[]);
    const signature=JSON.stringify(ids.slice().sort());
    if(changed || !this.editing && signature!==JSON.stringify(this.baseIds.slice().sort())) {
      this.setText(draft?.text ?? note?.text ?? '');this.baseIds=ids;
    }
    this.current=next;
    this.publishView();
    this.reportWarnings();
  }
  notice(body,level='error',deduplicate=false) {
    const key=`${level}:${body}`;
    if(deduplicate&&this.seenNotices.has(key))return;
    if(deduplicate)this.seenNotices.add(key);
    notify({title:'Sakwa',body,level});
  }
  reportWarnings() {
    for(const warning of [this.sharedRecoveryError,this.book?.recoveryError].filter(Boolean))this.notice(warning,'warning',true);
    if(this.journal.errors.length)this.notice(`${this.journal.errors.length} unreadable recovery files preserved in data/sakwa/revisions.`,'warning',true);
    const note=this.current?this.note(contextKey(this.current)):null;
    if(note?.heads.length>1)this.notice(`${note.heads.length} concurrent versions of ${this.current.label} preserved in recovery files.`,'warning',true);
  }
  publishView() {
    if(this.framed||!this.current||this.contextProps.overlay)return;
    const allPanes=panes();
    const stored=this.paneId||this.contextProps.pane||localStorage.getItem('sakwa.native-pane.v1');
    let pane=allPanes.find(p=>p.pane===stored&&p.mod==='sakwa');
    if(!pane){
      const {opening,source}=this.contextProps;
      const candidates=allPanes.filter(p=>p.mod==='sakwa'&&
        (opening?!opening.panes.includes(p.pane)&&(opening.place==='tab'?!opening.tabs.includes(p.tab):p.tab===source?.tab):
          spaces().some(s=>s.id===(source?.space||focused()?.space)&&s.tabs.some(t=>t.id===p.tab))));
      if(candidates.length===1)pane=candidates[0];
    }
    if(!pane)return;
    this.paneId=pane.pane;
    if(stored!==pane.pane){try{localStorage.setItem('sakwa.native-pane.v1',pane.pane);}catch{/* Identity can be rediscovered; drafts remain independent. */}}
    const space=spaces().find(s=>s.tabs.some(t=>t.id===pane.tab));if(!space)return;
    const source=this.contextProps.source||{space:space.id,tab:this.current.tab||space.tabs.find(t=>panes().some(p=>p.tab===t.id&&p.terminal))?.id};
    const record={pane:pane.pane,tab:pane.tab,space:space.id,context:{...this.current},source,at:this.openedAt};
    const previous=shared('sakwa.views.v1')||{};
    if(JSON.stringify(previous[this.viewId])===JSON.stringify(record))return;
    const registry=Object.fromEntries(Object.entries(previous).filter(([id,r])=>id!==this.viewId&&r?.pane!==pane.pane&&panes().some(p=>p.pane===r?.pane&&p.mod==='sakwa')));
    setShared('sakwa.views.v1',{...registry,[this.viewId]:record});
  }
  returnSidebar(cx) {
    if(this.moving||this.framed||!this.current)return;
    this.moving=true;this.publishView();
    const record=shared('sakwa.views.v1')?.[this.viewId];
    this.work(cx,async()=>{
      try {
        if(!record)throw Error('This note view is still opening; try again');
        await this.book.flush();
        returnNoteToSidebar(run,{focus:focused(),spaces:spaces(),panes:panes(),layout:layout()},record,setShared);
      } finally {this.moving=false;}
    });
  }
  selectScope(scope,cx) {
    this.pinned=null;this.scope=scope;this.panel=null;this.message=null;this.sync();cx.notify();
  }
  work(cx,action,{automatic=false}={}) {
    cx.spawn(async cx=>{
      try { await action(); }
      catch(e) { this.message=e.message;this.notice(e.message,'error',automatic); }
      cx.notify();
    });
  }
  save(cx) {
    if(!this.book || this.saving)return;
    this.saving=true;
    this.work(cx,async()=>{
      try {
        const previousError=this.book.error;await this.book.flush();
        if(previousError)this.seenNotices.delete(`error:${previousError}`);
        setShared('sakwa.changed.v1',revisionId());
      }
      finally { this.saving=false;this.sync(); }
    },{automatic:true});
  }
  refresh(cx) {
    if(this.refreshing)return;
    this.refreshing=true;
    this.work(cx,async()=>{
      try {
        const previousError=this.loadError;await this.journal.load();this.loaded=true;
        if(this.book) {
          try { this.book.recover(this.recovery.load());this.sharedRecoveryError=null; }
          catch(e) { this.sharedRecoveryError=e.message; }
        }
        if(this.book?.pending().length)await this.book.flush();
        this.loadError=null;
        if(previousError)this.seenNotices.delete(`error:${previousError}`);
        this.sync();this.generation=shared('sakwa.changed.v1');
      } catch(e) { this.loadError=e.message;throw e; }
      finally { this.refreshing=false; }
    },{automatic:true});
  }
  chooseNote(note,cx) {
    this.pinned=note.context;this.panel=null;this.message=null;this.sync();cx.notify();
  }
  allNotes() {
    const byKey=new Map(this.journal.notes().map(n=>[n.key,n]));
    for(const draft of this.book?.pending()||[])byKey.set(draft.key,{...draft,heads:[]});
    return [...byKey.values()].sort((a,b)=>b.at-a.at);
  }
  open(place,cx) {
    try { openNote(run,place,this.current,focused(),panes(),this.framed?layout():null);this.panel=null; }
    catch(e) { this.message=e.message;this.notice(e.message); }
    cx.notify();
  }
  send(address,cx) {
    if(this.busy || !this.current)return;
    const context={...this.current},value=this.editor.value();
    this.busy=true;this.panel=null;this.message=null;
    this.work(cx,async()=>{
      try {
        // Persist before dispatch. Sending never clears or mutates the note.
        await this.book.flush();
        await sendNote(context,value,address,agents(),terminals(),hc);
        this.message=`Sent to ${address}`;
        this.notice(this.message,'success');
      } finally { this.busy=false; }
    });
  }
  sendClick(cx) {
    const candidates=recipients(this.current,agents(),terminals());
    if(candidates.length===1)this.send(candidates[0].address,cx);
    else {this.panel='recipients';cx.notify();}
  }
  async close() {
    // Start a fresh flush here; Herdr gives cleanup at most 250 ms.
    if(this.book){try{await this.book.flush();await localStorage.flush();}catch{/* Drafts remain for retry. */}}
    const registry=shared('sakwa.views.v1');if(registry?.[this.viewId]){
      const next={...registry};delete next[this.viewId];setShared('sakwa.views.v1',next);
    }
  }

  archive(cx) {
    const t=theme(),q=this.query.value().toLowerCase();
    const notes=this.allNotes().filter(n=>`${n.context.label}\n${n.text}`.toLowerCase().includes(q));
    return v_flex().size_full().min_h(0).gap(8)
      .child(row().child(text('All notes').font_semibold()).child(button('back','Back',(_e,cx)=>{this.panel=null;cx.notify();})))
      .child(Input.new(this.query).h(32).px(8).border_1().rounded(6).border_color(t.border).bg(t.background))
      .child(text('Closed contexts stay here. Nothing is deleted automatically.',true))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar().gap(6)
        .when(!notes.length,e=>e.child(text('No saved notes yet.',true)))
        .children(notes.map(n=>v_flex().p(8).gap(4).rounded(6).bg(t.chrome)
          .child(button(`note-${n.id}`,`${n.context.scope.toUpperCase()} · ${n.context.label}`,(_e,cx)=>this.chooseNote(n,cx)))
          .child(text(`${contextStatus(n.context,spaces(),machines())} · ${n.context.machine||'this computer'} · ${new Date(n.at).toLocaleString()}`,true))
          .child(text(n.text.replace(/\n/g,' ').slice(0,120)||'(empty note)',true).truncate()))));
  }
  render(cx) {
    // Schedule retained input changes outside render, as required by GPUI.
    const desired=this.desired(),key=desired?contextKey(desired):null;
    const selection=shared('sakwa.sidebar.selection.v1'),focus=focused();
    const returned=this.framed&&selection?.token!==this.sidebarToken&&selection?.space===focus?.space&&selection?.tab===focus?.tab;
    if(this.loaded && (key!==(this.current?contextKey(this.current):null) ||
      returned||this.generation!==shared('sakwa.changed.v1')) && !this.scheduled) {
      this.scheduled=true;
      cx.spawn(async cx=>{
        this.scheduled=false;
        if(this.generation!==shared('sakwa.changed.v1'))this.refresh(cx);
        this.sync();cx.notify();
      });
    }
    const t=theme(),currentKey=this.current?contextKey(this.current):null;
    const ready=this.loaded && !this.fatal && key===currentKey && Boolean(this.current);
    const candidates=recipients(this.current,agents(),terminals());
    const labels=(this.width||0)>=460;
    const frame=v_flex().id('sakwa-root').size_full().min_h(0).min_w(0)
      .on_size_change((size,cx)=>{if(this.width!==size.width){this.width=size.width;cx.notify();}})
      .when(this.framed,e=>e.rounded(10).border_1().border_color(t.border))
      .overflow_hidden().bg(t.background).text_color(t.foreground).text_size(12)
      .when(this.framed,e=>e.child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(text('Sakwa').text_size(13).font_semibold().flex_1())
        .child(popover('open-note','Open',this.panel==='open',(open,cx)=>{this.panel=open?'open':null;cx.notify();},()=>
          v_flex().gap(4).children([['tab','New tab','square-arrow-out-up-right'],['right','Beside','columns-2'],['down','Below','rows-2']].map(([place,label,icon])=>
            button(`open-${place}`,label,(_e,cx)=>this.open(place,cx),{disabled:!ready,icon}))),{icon:'panel-right',iconOnly:true,height:116}))));
    const root=v_flex().flex_1().min_h(0).min_w(0).p(10).gap(8);
    if(this.panel==='all'){root.child(this.archive(cx));return frame.child(root);}
    root
      .child(row().id('scope-tools')
        .child(v_flex().flex_1().min_w(0).child(contextGroup(this.current?.scope||this.pinned?.scope||this.scope,(scope,cx)=>this.selectScope(scope,cx),
          this.current?`${this.pinned?'Pinned · ':''}${this.current.label}`:null)))
        .child(button('all-notes','All notes',(_e,cx)=>{this.panel='all';cx.notify();},{icon:'archive',iconOnly:!labels}))
        .child(popover('send','Send to agent',this.panel==='recipients',(open,cx)=>{
          if(open)this.sendClick(cx);else if(this.panel==='recipients'){this.panel=null;cx.notify();}
        },()=>v_flex().gap(4).when(!candidates.length,e=>e.child(text('No live agents in this note context.',true)))
          .children(candidates.map(a=>button(`send-${a.address}`,`${a.name} · ${a.address}`,(_e,cx)=>this.send(a.address,cx),{disabled:this.busy}))),
        {disabled:!ready||this.busy||!this.editor.value().trim(),icon:'send',iconOnly:!labels,tooltip:candidates.length?'Send the full note to an agent':'No live agents in this note context'})))
      .child(v_flex().id('note-editor').flex_1().min_h(0).min_w(0)
        .when(ready,e=>e.child(Textarea.new(this.editor).size_full().min_h(0).min_w(0)
          .px(12).py(10).rounded(8).border_1().border_color(t.border).bg(t.background).text_color(t.foreground).text_size(13))));
    return frame.child(root);
  }
}
