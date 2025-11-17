# ScreepsExtended Agents Guide

## Maintain this file
- When you add, remove, or significantly change files under src/ or hooks/, you MUST update /AGENTS.md (Key Files & Directories and any relevant sections).

## Overview
- **ScreepsExtended** is a browser-based overlay and lightweight visualization toolkit for the Screeps MMO, implemented as a Chrome extension.
- Main tech stack: JavaScript (ES6), DOM APIs, Canvas 2D, browser/Chrome extension APIs.
- Key entry points:
	- `src/bootstrap.js` ? extension script that initializes the global namespace and injects the page hooks.
	- `src/renderer-main.js` ? main rendering orchestrator which coordinates individual renderer modules.
	- `src/overlay.js` ? DOM canvas overlay manager that keeps canvases in alignment with the game stage.

## Architecture & Data Flow
- **Bootstrap**: Initializes `window.ScreepsMinimalOverlay` (SMO), sets up base structures and injects page hook scripts (from `hooks/`).
- **Hooks**: Injected scripts intercept websocket messages or page Angular state to capture data such as room radar or user directory events. Hooks then post messages back to the window for the extension to consume.
- **Store & Cache**: Data from hooks are stored by `src/radar-store.js`, terrain is cached in `src/terrain-cache.js`, username mappings are managed by `src/user-cache.js`, persistent room-object snapshots live in `src/room-objects-cache.js`, and the active player ID is tracked by `src/self-user.js`.
- **Overlay**: `src/overlay.js` manages canvas elements (one per room-neighbour) and their layout on the game's stage.
- **Renderer**: `src/renderer-main.js` coordinates the specific rendering modules located in `src/renderers/` to draw terrain, structures, creeps, and other objects onto the canvas.
- **Config & Utils**: `src/config/constants.js` exports styling and settings, and `src/utils/common.js` exposes reusable helper functions.
- Data flow overview: browser/WebSocket/Angular events ? hooks (postMessage) ? SMO global state ? terrain & radar caches ? renderer pipeline ? overlay/canvas.

## Build, Run & Test
- **Install**: There is no build step in this repository ? files are plain JS and are loaded as content scripts. To install for development, load the directory as an unpacked extension in Chrome.

- **Quick Development Loop** (recommended):
	1. Open `chrome://extensions` and enable Developer mode.
 2. Click "Load unpacked" and select the project root.
 3. Edit files in the repo, then Refresh/Reload the extension and the Screeps page. Because many scripts run at `document_start`, reloading the page might be required to pick up changes.

- **Manifest details**: This extension uses `manifest_version: 3` and registers `content_scripts` that load the project files with `run_at: "document_start"` (see `manifest.json`). Hooks are injected both by bootstrap (script injection) and are also made web-accessible.

- **Build (Prod)**: Create a zip of the repository contents (or use Chrome's pack extension feature) and upload it to the Chrome Web Store.

- **Testing**: Testing is manual (no test harness). Key techniques:
	- Open the browser console and watch for logs containing `[Screeps Overlay]`.
	- Validate that the overlay renders neighbour rooms (open `#!/map` view and navigate with keyboard to confirm neighbouring canvases).
	- Check localStorage for cache keys: `SMO_TERRAIN_CACHE_V1`, `SMO_USER_CACHE_V1`, `SMO_ROOM_OBJECTS_V1`.
	- If the overlay does not appear, check for errors in the console or missing DOM stages (search for `.pixijs-renderer__stage` element).

## Project-Specific Patterns
- **Global Namespace & SMO**: All core state and APIs are attached to `window.ScreepsMinimalOverlay` (SMO). SMO stores caches, render functions, overlay and helper utilities.
- **Renderer Modules**: Each entity type is implemented as a self-contained renderer in `src/renderers/`. Each renderer exports functionality by assigning a named object on `window`, e.g., `window.ScreepsTerrainRenderer`, `window.ScreepsCreepRenderer` and so on. The solid structure renderer now layers the official Screeps SVG metadata assets (terminals, invader cores, etc.), paints power spawns with owner badges, and defers ramparts to a translucent network overlay drawn after every other structure so they look like connected walls.
- **Renderer Contract**: Renderers are expected to export the specific drawing functions used by `src/renderer-main.js` (for example: `drawTerrainLayer`, `drawExitArrows`, `drawPoints`, `drawSources`, `drawCreeps`, etc.). Renderers should be tolerant of invalid inputs and use defensive checks (e.g., `if (!Array.isArray(points)) return;`).
- **Hooks & Event Handling**: Hooks (`hooks/*`) may monkey-patch browser APIs (e.g., `WebSocket`) or continuously inspect the page's Angular state. Hooks post captured data to the window with consistent `source` strings, such as `screeps-roommap` or `screeps-hook:user-directory`.
- **Config & Utils**: Visual styles, reserved keys and constants are centralized in `src/config/constants.js` and shared utilities are in `src/utils/common.js`.
- **Error Handling**: Minimal and defensive; modules avoid throwing and instead log warnings. The project uses early returns and safe parsing.

## Naming Conventions
- **Tabs** for indentation (consistent with repo style).
- **camelCase** for local variables and function names.
- **PascalCase** for classes, constructor functions and global namespaces.
- **ALL_CAPS** for constants and exported configuration values.
- **Renderer file naming**: `src/renderers/{entity}.js` and exported `window.Screeps{Entity}Renderer` should match.
- **Function names**: Drawing functions should start with `draw` (e.g., `drawTerrainLayer`, `drawCreeps`).

## Comments, Types & IntelliSense
- **JSDoc-style comments**: Use JSDoc annotations for exported functions and public APIs to support IDE completion and to document expected arguments and return values.
- **Minimal inline comments**: Prefer just enough comments to explain intent, invariants, edge cases, or trade-offs. Avoid restating the code.
- **No TypeScript**: This repo is a pure JS repository; keep functions typed via JSDoc if you want better tooling support.

## Good Practices for Future Changes
- Keep files small and modular. If a file grows large, extract helpers or split logic into separate modules.
- When introducing new renderer modules, follow the existing global-export pattern and add the file to `manifest.json` content scripts in the correct load order (renderers are expected to be loaded before `src/renderer-main.js`).
- Keep error handling consistent: avoid throwing in hooks or content scripts?prefer logging and returning early.
- Add small, focused changes with clear manual test steps. If possible, add a small debug page or optional UI to validate rendering behavior automatically.
- Document new global APIs, utilities or cache storage keys in this `AGENTS.md`.

## Key Files & Directories
- `manifest.json` ? Chrome extension manifest (content scripts and web accessible resources). Important values include `run_at: "document_start"` and `host_permissions`:
	- Content scripts list must include any file that the overlay relies on.
- `src/bootstrap.js` ? initializes SMO global and injects hooks into the page.
- `src/renderer-main.js` ? orchestrates the rendering pipeline, exposes `SMO.render()`, and now treats every non-reserved radar payload as a creep so unexpected structures default to creep visuals.
- `src/overlay.js` ? creates and aligns canvases on the game's stage element.
- `src/config/constants.js` ? reserved keys, TYPE_STYLES, SOLID_STRUCTURE_STYLES, deposit types, and other config constants.
- `src/utils/common.js` ? coordinate helpers, room-parsing helpers and basic helpers used by renderers.
- `src/radar-store.js` ? consumes room map messages and stores retrieved radar data in SMO.roomRadarData.
- `src/terrain-cache.js` ? fetches and caches terrain data from the Screeps API and schedules re-render.
- `src/room-objects-cache.js` ? rate-limited loader for `room-objects` API data; caches solid structures per room and exposes SMO.roomObjects getters.
- `src/user-cache.js` ? caches user usernames from the user directory hook and persists to localStorage.
- `src/self-user.js` ? listens for user meta messages from the hooks to learn the logged-in Screeps user ID and expose it via `SMO.selfUser`.
- `src/utils/*` ? small helpers such as badge image cache and common helpers.
- `src/renderers/*` ? renderer modules for specific visual entities: `terrain.js`, `points.js`, `roads.js`, `walls.js`, `creeps.js`, `controllers.js`, `sources.js`, `powerbanks.js`, `minerals.js`, `npcs.js`, `structures.js`.
- `src/renderers/structures.js` ? loads Screeps metadata SVGs (terminal, invader core, tower parts), custom-draws observers and power spawns (with badge overlays), skips constructed walls/power banks, and renders ramparts as a translucent, wall-style network that sits on top of other layers.
- `hooks/*` ? scripts injected into the page to capture game data (room map and user directory hooks).
- `hooks/hook-roomview.js` ? monitors Angular room view broadcasts (zoom/resize) and posts `screeps-hook:room-view` messages so the overlay can re-render when the camera changes.

## Maintenance of This Guide
- `/AGENTS.md` is the primary guide for integrating code and contributing to this repository. Keep it up to date when major structure or workflow changes occur.
- When performing deep file analysis or large refactors, use a file-analysis subagent and add references in this doc.
- For every architectural or API change, update the corresponding parts of this doc to help future agents and developers.

## Hooks & Communication ?
- The injected `hooks` scripts gather data (WebSocket roomMap messages, Angular state) and use `window.postMessage` (via `SMOHookUtils.postMessage`) to send structured data back to the page. The content scripts listen for `window.message` to capture these events. Each hook waits until `window.SMOHookUtils` exists before bootstrapping to avoid race conditions with Chrome's script loader.
- The main hook message sources are `screeps-roommap`, `screeps-hook:user-directory`, and `screeps-hook:room-view`. The radar store listens for roomMap payloads and updates `SMO.roomRadarData`, the user cache persists usernames, and the room-view messages drive overlay reflows when the camera zoom changes.
- Hook `hook-roommap.js` also emits `screeps-hook:user-meta` events whenever the WebSocket stream publishes the local `user:<id>/...` channels so the content scripts can record the logged-in user ID.

### Hook message format
- Hooks post messages using `window.postMessage`. Example payloads to listen for from your hook:
	- Room map data (roomMap2):
		```json
		{
			"source": "screeps-roommap",
			"channel": "roomMap2:<shard>/<roomName>",
			"payload": { /* radar object */ }
		}
		```
	- User directory updates:
		```json
		{
			"source": "screeps-hook:user-directory",
			"type": "users-update",
			"users": { "<userId>": "<username>" },
			"timestamp": 123456789
		}
		```
	- Room view events:
		```json
		{
			"source": "screeps-hook:room-view",
			"type": "broadcast-detected",
			"name": "zoom",
			"timestamp": 123456789
		}
		```
	- Self user ID events:
		```json
		{
			"source": "screeps-hook:user-meta",
			"type": "self-user-id",
			"userId": "62ba2e1aeebd846ececb86d8"
		}
		```

## Global API & Useful Runtime Objects ??
- `window.ScreepsMinimalOverlay` (SMO): main state and sub-systems. Notable properties:
	- `SMO.render()` ? entry point to re-render the overlay.
	- `SMO.overlay` ? overlay management API (ensureOverlay, layoutCanvases, getCanvasForRoom).
	- `SMO.terrain` ? terrain cache and retrieval functions.
	- `SMO.roomObjects` ? lazy room-objects fetcher with `ensureRoomsQueued`, structure lookups, and cache clearing helpers.
	- `SMO.selfUser` ? `{ userId, lastDetectedAt }` describing the logged-in Screeps account as detected from the WebSocket feed.
	- `SMO.roomRadarData` ? stored room map data keyed by shard and room name.
	- `SMO.userCache` ? username lookup by id.
	- `SMO.rooms` ? helper for room name / neighbour calculations (`detectCurrentRoomFromHash`, `computeNeighbourRooms`).
	- `SMO.config` ? runtime flags; `SMO.config.debug` enables verbose logging in content scripts and in-page hooks.
	- `SMO.setDebug(true|false)` ? toggles the debug flag and forwards the state to `window.SMOHookUtils.setDebug` so hooks mirror the content-script log level.
	- `SMO.badgeImageCache` ? badge image cache map and helper functions (`getBadgeImageEntry`) are reachable via `window.ScreepsBadgeImageCache`.
- `window.ScreepsRendererConfig` ? constants and visuals used by renderers.
- `window.ScreepsRendererUtils` ? common helper functions: `coordKey`, `normalizePointList`, `parseRoomName`, etc.

### Renderer template
If you add a new renderer, follow this minimal template:

```javascript
(function(){
	// Use utility functions: window.ScreepsRendererUtils
	// Use config/constants: window.ScreepsRendererConfig

	function drawMyThing(ctx, myData, scaleX, scaleY) {
		 if (!Array.isArray(myData)) return;
		 // draw logic
	}

	window.ScreepsMyThingRenderer = { drawMyThing };
})();
```

Make sure to add the renderer file to `manifest.json` before `src/renderer-main.js` and wire it into `src/renderer-main.js` so the main renderer can call the new draw method.

## Troubleshooting & Common Issues ??
- If the overlay doesn't appear:
	- Verify `manifest.json` contains the required `content_scripts` and permissions.
	- Ensure dev mode is enabled and the extension is loaded from the project root.
	- Check the console for `[Screeps Overlay]` debug messages and errors.
	- Confirm the Pixi stage element `.pixijs-renderer__stage` exists and is not renamed/removed by game updates.
- Hook failures: web socket interception is fragile across platform and Screeps client updates. If `WebSocket` no longer contains strings or `roomMap2`, update hook parsing logic.

