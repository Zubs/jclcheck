# Proposal

## Why

The API can check against any supported z/OS level and JES (features 3 and 9), but the workbench always uses the defaults, so a user on an older release can't see which keywords their system lacks (Nick's item 11).

## What Changes

- Backend: `GET /api/levels` returns the supported levels, newest last, each with whether it offers JES3, plus the default level and JES.
- Workbench header: a "z/OS 3.2 ▾" level dropdown (from `/api/levels`, no copy in the frontend) and a JES2/JES3 choice; JES3 is offered only where the level allows it. Choosing 3.1 or later while JES3 is selected switches to JES2 with a notice that IBM removed JES3 in 3.1.
- Each check sends `zosLevel` and `jes`; changing either checks again straight away and counts `level/<level>` or `jes/<jes>`.
- Choices are saved in `localStorage` (try/catch) and kept in the address (`/app?zos=2.5&jes=JES3`) without counting a new page view. The address wins over storage; an unknown `?zos=` or `?jes=JES3` at 3.x falls back with a short notice.
- The diagnostics panel shows "z/OS 3.2 · JES2" from the API response.
- If the levels can't be loaded, the picker is hidden and checks use the API's defaults.

## Capabilities

### New Capabilities
- `workbench-level-picker`: choosing the z/OS level and JES in the workbench.

### Modified Capabilities
- `zos-levels`: adds the `GET /api/levels` endpoint.

## Impact

- Backend: `index.js`; Spec.md API table.
- Frontend: `api.js`, `pages/Workbench.vue`, `components/ErrorPanel.vue`, `analyticsEvents.js`; tests mock `getLevels`, and call expectations gain `zosLevel` and `jes`.
