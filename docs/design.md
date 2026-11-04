# Sakwa design

Public Herdr JavaScript/GPUI mod. One plain-text note for each tab, each space,
and the local installation globally. UI labels and documentation use English.
No platform-specific runtime commands; paths use appHome and portable APIs.

## Interface

A sidebar editor with Tab / Space / Global selectors, save status, Send to agent,
and All notes. All notes includes active and missing-context notes and preserves
original context names. Missing contexts never cause deletion. Disconnected
machines are marked unavailable rather than conclusively archived.

Notes can open in a new tab, below, or beside the current pane using native
Herdr commands, following Juhas. Detached editors pin the original note context;
the sidebar follows the selected tab/space. All copies share changes.

## Persistence

Use app-local files, atomic expected-content writes, and durable recovery versions.
Pending drafts are also mirrored to Herdr shared state so removing their original
pane does not make its per-copy recovery cache the only remaining copy.
Serialize writes per note. Save on each edit; show Saving / Saved / Error honestly.
Keep pending edits across context switches and retry failures without discarding
text. Preserve conflicting versions instead of silently overwriting another copy.
Validate stored data and retain corrupt originals. A saved status means the file
write completed. No software can guarantee the last keystroke survives forced
termination before its write completes; document this boundary explicitly.

Context identity includes machine, space and tab as appropriate. Renaming a
context does not create another note. Global means this local Herdr installation,
not automatic synchronization to other computers.

## Sending

Resolve live agents strictly within the note context: tab, space, or all agents
for global. One candidate sends directly; multiple candidates open a popover;
zero candidates explain why sending is unavailable. Revalidate the recipient
before sending. Send the complete note without truncation or clearing it; report
transport errors and uncertain delivery. Sending is an explicit user action.

## Delivery stages

1. Design and implementation plan.
2. Context model and persistence with meaningful recovery/conflict tests.
3. Native editor, archive browser, recipient picker and pane controls.
4. Portable installer, public README/license/package and validation.

Commit each stage. Do not push. Validate with Node tests and herdr-app check;
report native interactive acceptance and macOS/Linux verification separately.
