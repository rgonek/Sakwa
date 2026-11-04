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

- Context uses a native ToggleGroup with exactly one pressed scope, including
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
