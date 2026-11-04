# Acceptance evidence

## Automated checks on Windows

- `node --test`: 25 tests passed after review fixes, Node 24.18.0.
- `herdr-app check mods/sakwa`: passed, Herdr app 0.1.12.
- Installer executed against real app home; mod loaded in the existing personal
  layout, without replacing or switching layouts.
- Native screenshot inspected: sidebar and temporary dialog both show context
  selectors, full-height textarea, saved status and action controls.
- `herdr-app do sakwa.all` accepted; `herdr-app status` reported no errors.
- Temporary dialog closed after smoke check; sidebar left available for use.
- Native screenshot inspected again after Lucide integration: icons loaded,
  textarea filled remaining height, existing layout retained, no app errors.
- Independent review found history resolution dropping merge parents while a
  draft was queued or saving; both cases now have passing regression tests.
- A CLI option-parsing regression test covers notes beginning with `--`.
- Shared recovery tests recover pending text in a fresh editor after discarding
  the original editor and its per-copy storage; malformed backups remain intact.
- Scoped independent review of shared recovery found no important data-loss issue.
  Recovery of an editor that is still live may preserve extra intermediate
  versions; this is an intentional preference for retaining text.

Native view tests execute the real controller with host UI stubs and real
temporary files. They prove routing and persistence lifecycle, not actual
keyboard/IME behavior or native popup geometry. No note was sent to a real agent.

## Interactive checklist

- [ ] Type Unicode, paste multiline text, undo/redo, and verify wrapping.
- [ ] Switch Tab / Space / Global while saving; return and inspect contents.
- [ ] Close/reopen the app; confirm Saved notes persist.
- [x] New tab / Beside / Below: verify native menu actions, pinned context and flat presentation.
- [ ] Native keyboard focus/navigation in detached editors.
- [ ] Close an original tab or space, find its note in All notes and edit it.
- [ ] Disconnect a remote machine; confirm its notes show unavailable.
- [ ] Two editors: edit concurrently and verify both versions in recovery files.
- [ ] One live agent sends directly; several agents open the recipient picker.
- [ ] Failed/oversized sends retain the full note; no automatic retry of sending.
- [ ] Repeat native checks on macOS and Linux.

CI is configured for the Node suite on Windows, macOS and Linux. It has not been
run remotely as part of this local implementation. Native macOS/Linux acceptance
remains unverified.

## Context selector / panel corrections

- Context uses a native RadioGroup styled as buttons with exactly one checked scope, including
  pinned notes; the separate context label was removed.
- The sidebar has the same 10px radius and theme border as Files/Changes;
  native tabs/panes use a flat mod surface.
- Open's native open-change callback fired, but the scrollable popup had only
  max-height and collapsed to zero. Definite popup height fixes the menu.
- History UI removed at the user's request; immutable recovery data is retained.
- 28 Node tests pass, including selection, frame mode, and popup placement routes.
- Native mouse smoke verified all three Open actions and the original note's text
  in the detached views; test views were closed and the original pane restored.
- Native tab creation exposed that copy props must be read via Herdr `props()`;
  corrected both runtime and host fixture, with failing/passing pinned-context
  and flat-mode tests. No custom Sakwa header or Open control in detached views;
  All notes occupies the same context-row position in both presentations.

## Sidebar handoff / stable toolbar

- Opening a tab or split hides the visible originating Sakwa sidebar container,
  discovered from the current layout tree rather than hard-coded node IDs.
- Sidebar header follows Files/Changes: 42px high, 14px horizontal padding,
  title and bottom divider, without a title icon.
- Copy and persistent Saved label removed. All notes and Send to agent share the
  top toolbar, with labels only when enough width is available.
- Save/delivery status originally used a reserved 24px line; this was replaced
  by native toasts below to remove the unwanted empty footer space.
- 30 Node tests pass, including sidebar handoff, responsive labels and fixed status geometry.
- Native smoke verified sidebar hiding after New tab and Beside; screenshots
  confirmed labels in wide views and icons in the narrow sidebar. Original pane
  and sidebar were restored after closing only the temporary test views.
- Host fixture now enforces native element single-use ownership, catching an
  attempted mutation after attaching the body to its frame.

## Button selector and Juhas-style navigation

- Native Button controls now form an exclusive selection group with raised
  active background, fixed border geometry and stronger active text. Screenshot
  inspected in the current light theme; no black fill.
- 41 Node tests pass, covering live/stale routes, deterministic multiple-view
  routing, source restoration, save-before-close and personal toolbar upgrades.
- Native tab smoke: active icon with hidden sidebar; from source tab clicking
  selects the existing note tab; next click returns to source/sidebar and closes
  only the detached note tab.
- Native split smoke: from terminal focus clicking focuses the existing note
  pane; next click restores sidebar and closes only that note pane.
- Native mod bodies do not receive an automatic pane prop. Opening records the
  pre-existing pane/tab IDs, then binds only a unique new note pane and caches
  that identity in per-copy storage. Ambiguous legacy views remain unbound.
- Source note contents remained intact through all native navigation checks.
- Scoped independent review found no actionable issue; native acceptance exposed
  the missing automatic pane prop and its regression test now covers this case.

## Native notifications without footer space

- Removed the status footer entirely; the textarea reaches the bottom inset.
- Native Herdr `notify()` handles errors, warnings and delivery confirmations.
  Routine autosave is silent. Automatic duplicate errors are suppressed.
- 43 tests pass, including native-notification payloads and unchanged editor
  geometry with or without messages. Native screenshot confirms no empty footer;
  Herdr reports no mod errors.
- A native preview toast was shown and visually verified at the bottom-right;
  the installed code was restored without the preview instrumentation.
- Regression test confirms a failed autosave followed by repeated periodic
  refreshes retains the draft and emits only one error toast.
