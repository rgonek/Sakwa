import { div } from 'gpui-kit';
import { Button, Popover, h_flex, v_flex } from 'gpui-base';
import { theme } from 'herdr';

export function text(value,muted=false) {
  return div().text_size(12).text_color(muted?theme().muted:theme().foreground).child(value);
}
export function button(id,label,action,{active=false,disabled=false,tooltip=label}={}) {
  const t=theme();
  return Button.new(id).h(28).px(8).flex_none().rounded(6).text_size(12)
    .bg(active?t.selected:t.chrome).text_color(disabled?t.dim:t.foreground)
    .hover(e=>e.bg(t.hover)).disabled(disabled).tab_index(0).accessibility_label(label)
    .tooltip(tooltip).when(Boolean(action),e=>e.on_click(action)).child(label);
}
export function popover(id,label,open,change,content,options={}) {
  const t=theme();
  return Popover.new(id).open(Boolean(open)).on_open_change(change)
    .trigger(button(`${id}-trigger`,label,null,options))
    .when(Boolean(open),e=>e.content(v_flex().w(340).max_h(360).min_h(0)
      .p(8).gap(6).rounded(8).border_1().border_color(t.border).bg(t.popover)
      .text_color(t.foreground).overflow_y_scrollbar().child(content())));
}
export function row() { return h_flex().flex_none().min_w(0).gap(4).items_center().flex_wrap(); }
