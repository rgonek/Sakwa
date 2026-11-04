# Publishing Sakwa

The catalog title comes from RECIPE.md's H1: `Sakwa - Notes` (13 characters).
Its first paragraph is the short catalog description. Keep implementation and
installation details below the preview image.

GitHub About description:

> Keep a note beside your work in Herdr. Notes for tabs, spaces and everything else, with autosave and Send to agent.

Topics: `herdr-mod`, `herdr`, `gpui`, `notes`, `productivity`.
The repository must be public for Herdr directory discovery. About metadata
alone does not publish local files. Check the intended default branch before
publishing. Ship root RECIPE.md, preview.png and mods/sakwa; no root layouts/.

## Artwork and screenshots

The selected preview is variant 3: a highlander writing in a notebook, with a
leather satchel and sheep. The user selected it on 2026-11-04. Variants 1 and 2
remain in docs/images/previews. All three are 1672 × 941 PNGs.

Backgrounds were generated with the built-in imagegen tool using Juhas and
Kolczyk previews as style references. The brief for each was a vintage painterly
Tatra poster, cream sky, amber sunset, teal mountain ridges and yellow meadow
flowers. Large serif Sakwa title; exact subtitle: "Keep a note close. Pick up
where you left off." Keep the right side clear for a native screenshot.

1. Sheep carrying an embossed leather satchel with a notebook peeking out.
2. Open satchel and notebook on a rock, with a lamb beside them.
3. Highlander writing in a notebook, satchel beside him and a sheep looking on.

The editor and All notes images are crops of real native Sakwa views captured
with herdr-app shot. All notes and context names are synthetic. The screenshot
fixture copies the real controller/UI and substitutes in-memory journal records
and separate shared-state keys. It neither reads the user's notes nor sends any
note to an agent. It is a presentation fixture, not live-context acceptance.

To recapture with Herdr running, from the repository root:

```sh
node scripts/capture-preview.mjs
herdr-app shot /absolute/path/to/a-new-private-capture.png
herdr-app do sakwa-marketing-fixture.all
herdr-app shot /absolute/path/to/another-new-private-capture.png
herdr-app do overlay.close --id sakwa-marketing-fixture
```

Crop strictly to the dialog content before putting files in docs/images. Never
commit the full window: it can contain private terminals and projects. The
fixture lives at <app home>/mods/sakwa-marketing-fixture. Close it and remove only
that generated folder before repeating the capture. Do not remove other mods.
The capture script refuses to overwrite an existing fixture.

Regenerate the selected composition with its original native screenshot:

```powershell
powershell -NoProfile -File scripts/create-preview.ps1 -Variant 3 -Output preview.png
```

The decorative title strip follows Juhas/Kolczyk presentation conventions. The
native editor pixels below it are the captured UI. No generated UI is used.

## License and checks

Sakwa uses Apache 2.0, matching Juhas and Kolczyk. Preserve LICENSE and NOTICE.
Lucide icons retain their original ISC/MIT attribution and license text.

Before committing a release, run npm test and herdr-app check against the absolute
mods/sakwa path. Check README/RECIPE image links, screenshot privacy, the root
preview and GitHub About. Native acceptance on other platforms remains separate
from these packaging checks; see acceptance.md.
