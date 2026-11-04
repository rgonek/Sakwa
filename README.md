# Sakwa

A shepherd's satchel for notes in [Herdr](https://herdr.dev).
One note for a **tab**, one for a **space**, and one **global** note.
Native GPUI, automatic saving, recoverable history, and a scoped **Send to agent**.

## Install

Requires the JavaScript/GPUI Herdr app, with `writeTextFile` atomic creation,
`fs/promises`, native `TextareaState`, and `localStorage.flush()`.
Developed against **herdr-app 0.1.12**. This is not a Luau mod for the older Herdr UI.
Node **22.15+** is needed only for installation and development; the mod itself
runs inside Herdr without Node, PowerShell, Python, or shell commands.

```sh
git clone https://github.com/rgonek/Sakwa.git
cd Sakwa
node scripts/install.mjs
```

The installer uses `HERDR_APP_HOME`, or `~/.config/herdr-app` by default.
For another installation:

```sh
node scripts/install.mjs --app-home "/path/to/herdr-app"
herdr-app check "/path/to/herdr-app/mods/sakwa"
```

Sakwa initially docks on the right. Installation copies only `mods/sakwa`,
backs up an existing mod under `data/sakwa-install-backups`, and preserves note
data and personal layouts. Herdr controls docking after the first discovery.
No dependencies to download. Manual installation: copy `mods/sakwa` into the
Herdr app's `mods` folder, excluding generated `.d.ts` and `jsconfig.json` files.

## Use

- **Tab / Space / Global** selects the single note for that context. The sidebar
  follows your selected tab or space. Global means this local Herdr installation.
- Type freely: **Saving…** becomes **Saved** after the atomic file write completes.
  Errors retain the draft, show a warning and retry every three seconds.
- **Open ▾ → New tab / Beside / Below** opens another editor pinned to the original
  note. Changing tabs does not change a pinned note. The source editor stays open.
- **Send to agent** uses live agents in the note's original tab, space, or all
  contexts for Global. One agent receives directly; several open a picker.
  No agents shows an explanation. The note stays intact after sending.
- **All notes** searches saved notes, including notes from closed tabs and spaces.
  Contexts are marked **active**, **archived**, or **unavailable** (for a disconnected
  or still-loading machine). Opening an archived note pins it for editing.
- **History** previews earlier versions. **Copy version** exports the selected text.
  **Use this version** makes it current and explicitly resolves concurrent heads;
  all previous versions remain in history.

Herdr commands `sakwa.tab`, `sakwa.space`, `sakwa.global`, and `sakwa.all` reach shown
copies. Native panes can also be opened explicitly:

```sh
herdr-app do pane.split --direction right --mod sakwa
```

## Saving and recovery

The source of truth is an append-only directory:

```text
<Herdr app home>/data/sakwa/revisions/<revision-id>.json
```

Every completed snapshot contains the entire UTF-8 note, its stable context IDs,
context label, timestamp, and parent revision IDs. Creation is atomic and refuses
to overwrite an existing file. Typing queued behind a slow write is coalesced to
the latest text; already-written snapshots are never pruned automatically.
Renaming a tab or space keeps its note. Closing a context never deletes notes.

Drafts waiting for a file write are also stored in the editor copy's Herdr
`localStorage`, flushed before saving. Keep an editor open until **Saved** when
storage errors occur. Recovery depends on Herdr restoring that copy's storage;
the shared revision directory remains available regardless of pane removal.
Back up the **whole Herdr app home** to include recovery storage and history.

Concurrent windows write separate revisions. Neither overwrites the other's
text. A warning points to History when multiple current versions exist. A focused
editor keeps the text being edited until you switch context or choose a version.
Other copies refresh after changes in this window and every ten seconds for
other windows. This is local storage, including for remote terminal contexts;
notes do not synchronize automatically between computers.

Unreadable revision files are preserved and reported; they are never reset or
deleted. An unreadable recovery cache blocks editing rather than replacing it.
For manual recovery, copy the data first, then inspect each JSON file's `text`
and `context` fields. History is unbounded in v0.1; large journals cost disk space
and take longer to load. Do not delete revisions unless you have an external backup.

No application can guarantee the last keystroke survives a crash, power failure,
or forced termination before a write reaches disk. **Saved** confirms completion
of Herdr's atomic write API; it is not a guarantee against hardware failure.
Closing cleanup is best-effort and limited by Herdr to 250 ms.

## Privacy and sending

Notes remain on your machine. No telemetry or network requests. Sending is an
explicit action through `hc send`; the selected agent then receives the full
note as input and may act on it. Text is never silently truncated. The v0.1
send limit is **16,000 UTF-8 bytes**; larger notes can be copied in full.
If delivery is uncertain, inspect the agent before retrying to avoid duplicates.

## Develop

```sh
npm test
herdr-app check mods/sakwa
```

Tests exercise persistence, recovery, concurrent versions, scoped recipients,
native-view lifecycle through host stubs, and installation in temporary folders.
CI runs the Node suite on Windows, macOS and Linux. Native layout, keyboard and
popover checks still require Herdr on each platform; see [acceptance](docs/acceptance.md).

MIT licensed. The satchel icon is original to Sakwa.
