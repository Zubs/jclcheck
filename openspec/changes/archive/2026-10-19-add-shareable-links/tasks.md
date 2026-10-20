# Tasks

## 1. Encoding

- [x] 1.1 Write `frontend/src/share.js` (`encodeShare`, `decodeShare`, `shareLink`, `MAX_LINK_LENGTH`) with gzip `CompressionStream` and base64url; verify `tests/share.test.js`: a payload round-trips exactly; a cut-off or altered fragment throws; a link just under 32 KB is allowed and one just over refused

## 2. Workbench

- [x] 2.1 Add the SHARE action (F6, Alt+L, PF button), clipboard copy with a manual-copy field fallback, refusals for empty and oversized links, and `share/*` counts; drop the `feature: 29` marker; verify Workbench tests: empty editor refused; a link is copied and counted; blocked clipboard shows the field
- [x] 2.2 Open `#jcl=` links on mount: load JCL, library, level and JES, check once, keep the draft until the user edits, offer "Back to my draft", and say when a link is damaged; verify tests: round trip with two members, 2.5 and JES3; Back to my draft restores it; the draft is untouched until an edit; a damaged link shows the message and loads the draft
- [x] 2.3 Add F6/Alt+L to the Help dialog and check the canonical tag stays `/app` with a hash; verify tests

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Tick feature 29 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
