# Proposal

## Why

Learners want to send a failing job to a colleague or mentor. Today they have to paste JCL into a chat and hope the other person checks it the same way.

## What Changes

- A **Share** action: F6 SHARE in the PF-key bar, with Alt+L as its fallback.
- Share puts the JCL, library members, level and JES after `#` in the address (`/app?zos=3.1&jes=JES2#jcl=…`), gzip-compressed with the browser's `CompressionStream` and base64url-encoded. Nothing is stored on a server and the `#` part is never sent to one.
- The link is copied to the clipboard; if the clipboard is blocked, it's shown in a field to copy by hand. Links over 32 KB are refused with a message, and an empty editor can't be shared.
- Opening a link loads its JCL, library, level and JES and checks it straight away. The saved draft is kept and isn't overwritten until the user edits the shared JCL; a notice offers "Back to my draft". A damaged or cut-off link says "This link is incomplete or damaged" and leaves the draft alone.
- Counts: `share/create`, `share/open`, `share/back-to-draft`, `share/clipboard-blocked` (never the link itself).
- The canonical address stays `/app`.

## Capabilities

### New Capabilities
- `workbench-sharing`: sharing a job through a self-contained link.

### Modified Capabilities

## Impact

- Frontend: new `src/share.js`; `pages/Workbench.vue`, `components/HelpModal.vue`, `analyticsEvents.js`; tests.
