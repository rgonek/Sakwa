import { div, svg } from 'gpui-kit';
import { Button, Popover, ToggleGroup, Toggle, h_flex, v_flex } from 'gpui-base';
import { theme } from 'herdr';

export function text(value,muted=false) {
  return div().text_size(12).text_color(muted?theme().muted:theme().foreground).child(value);
}
export function button(id,label,action,{active=false,disabled=false,tooltip=label,icon=null,iconOnly=false}={}) {
  const t=theme();
  return Button.new(id).h(28).px(8).flex_none().min_w(0).max_w('100%').flex().gap(5).items_center().justify_center().rounded(6).text_size(12)
    .bg(active?t.selected:t.chrome).text_color(disabled?t.dim:t.foreground)
    .hover(e=>e.bg(t.hover)).disabled(disabled).tab_index(0).accessibility_label(label)
    .tooltip(tooltip).when(Boolean(action),e=>e.on_click(action))
    .when(Boolean(icon),e=>e.child(svg(`mods/sakwa/icons/${icon}.svg`).size(14).flex_none()))
    .when(!iconOnly,e=>e.child(div().min_w(0).truncate().child(label)));
}
export function popover(id,label,open,change,content,options={}) {
  const t=theme();
  return Popover.new(id).open(Boolean(open)).on_open_change(change)
    .trigger(button(`${id}-trigger`,label,null,options))
    .when(Boolean(open),e=>e.content(v_flex().w(300).h(options.height??180).min_h(0)
      .p(8).gap(6).rounded(8).border_1().border_color(t.border).bg(t.popover)
      .text_color(t.foreground).overflow_y_scrollbar().child(content())));
}
export function contextGroup(selected,select,description) {
  const t=theme();
  return h_flex().flex_none().w_full().min_w(0).tooltip(description||'Note context')
    .child(ToggleGroup.new('note-context').axis('horizontal').accessibility_label('Note context')
    .flex().flex_row().flex_none().w_full().min_w(0)
    .rounded(7).border_1().border_color(t.border).overflow_hidden()
    .children(['tab','space','global'].map((scope,index)=>{
      const active=scope===selected,label=scope[0].toUpperCase()+scope.slice(1);
      return Toggle.new(`scope-${scope}`).pressed(active).selected(active).tab_index(0)
        .accessibility_label(label)
        .on_change((checked,cx)=>{if(checked)select(scope,cx);})
        .h(28).flex_1().min_w(0).flex().items_center().justify_center().text_size(12)
        .bg(active?t.selected:t.chrome).text_color(active?t.foreground:t.muted)
        .when(index>0,e=>e.border_l(1).border_color(t.border))
        .hover(e=>e.bg(active?t.selected:t.hover)).child(label);
    })));
}
export function row() { return h_flex().flex_none().min_w(0).gap(4).items_center().flex_wrap(); }
