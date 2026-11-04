import { View } from 'gpui-kit';
import { h_flex, v_flex, TextareaState, Textarea, InputState, Input } from 'gpui-base';
import { spaces, machines, agents, terminals, focused, panes, theme, props, layout, run,
  hc, shared, setShared, nextCommand } from 'herdr';
import { contextFor, contextKey, contextStatus, validContext, recipients } from './context.js';
import { createJournal, revisionId } from './journal.js';
import { createDraftBook } from './drafts.js';
import { createRecovery } from './recovery.js';
import { fileAdapter } from './persistence.js';
import { openNote, sendNote } from './presentation.js';
import { text, button, popover, row, contextGroup } from './ui.js';

export default class Sakwa extends View {
  init(initial,cx) {
    initial={...initial,...props()};
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
    catch(e) { this.fatal=e.message; }
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
  }
  selectScope(scope,cx) {
    this.pinned=null;this.scope=scope;this.panel=null;this.message=null;this.sync();cx.notify();
  }
  work(cx,action) {
    cx.spawn(async cx=>{
      try { await action(); }
      catch(e) { this.message=e.message; }
      cx.notify();
    });
  }
  save(cx) {
    if(!this.book || this.saving)return;
    this.saving=true;
    this.work(cx,async()=>{
      try { await this.book.flush();setShared('sakwa.changed.v1',revisionId()); }
      finally { this.saving=false;this.sync(); }
    });
  }
  refresh(cx) {
    if(this.refreshing)return;
    this.refreshing=true;
    this.work(cx,async()=>{
      try {
        await this.journal.load();this.loaded=true;this.loadError=null;
        if(this.book) {
          try { this.book.recover(this.recovery.load());this.sharedRecoveryError=null; }
          catch(e) { this.sharedRecoveryError=e.message; }
        }
        if(this.book?.pending().length)await this.book.flush();
        this.sync();this.generation=shared('sakwa.changed.v1');
      } catch(e) { this.loadError=e.message;throw e; }
      finally { this.refreshing=false; }
    });
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
    catch(e) { this.message=e.message; }
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
    if(this.loaded && (key!==(this.current?contextKey(this.current):null) ||
      this.generation!==shared('sakwa.changed.v1')) && !this.scheduled) {
      this.scheduled=true;
      cx.spawn(async cx=>{
        this.scheduled=false;
        if(this.generation!==shared('sakwa.changed.v1'))this.refresh(cx);
        this.sync();cx.notify();
      });
    }
    const t=theme(),currentKey=this.current?contextKey(this.current):null;
    const ready=this.loaded && !this.fatal && key===currentKey && Boolean(this.current);
    const note=currentKey?this.note(currentKey):null;
    const status=currentKey?this.book?.status(currentKey):null;
    const candidates=recipients(this.current,agents(),terminals());
    const problem=this.fatal || this.loadError || this.book?.error;
    const details=[problem,this.sharedRecoveryError,this.book?.recoveryError,
      ...this.journal.errors,this.message,note?.heads.length>1?`${note.heads.length} concurrent versions preserved in recovery files.`:null].filter(Boolean);
    const statusText=problem?'Save failed — draft retained':this.message||
      (!this.loaded?'Loading notes…':status==='saving'?'Saving…':details[0]||'');
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
      .child(v_flex().flex_1().min_h(0).min_w(0)
        .when(ready,e=>e.child(Textarea.new(this.editor).size_full().min_h(0).min_w(0)
          .px(12).py(10).rounded(8).border_1().border_color(t.border).bg(t.background).text_color(t.foreground).text_size(13))))
      .child(h_flex().id('note-status').h(24).flex_none().min_w(0).gap(4).items_center().overflow_hidden()
        .child(text(statusText,true).flex_1().min_w(0).truncate().tooltip(details.join('\n')||statusText)
          .when(Boolean(problem),e=>e.text_color(t.ansi1)))
        .when(Boolean(problem),e=>e.child(button('retry','Retry',(_e,cx)=>{this.save(cx);this.refresh(cx);}).h(22))));
    return frame.child(root);
  }
}
