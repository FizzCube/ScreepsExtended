(() => {
	const SMO = window.ScreepsMinimalOverlay;
	if (!SMO) return;

	// One room in room-view LOCAL units (50 tiles x 100 units). Each neighbour
	// canvas is laid out at these LOCAL coordinates; the page bridge applies the
	// camera matrix to the whole container every frame (see pixi-bridge.js), so
	// the overlay moves/scales in lockstep with the WebGL canvas - no per-frame
	// repositioning here, no lag.
	const ROOM_LOCAL_SIZE = 5000;

	// Manual alignment nudge for the neighbour canvases, in LOCAL units
	// (1 tile = 100 units, so a whole room = 5000). Positive X shifts the outer
	// rooms right, positive Y shifts them down. Tweak these to dial in the small
	// offset, then leave at 0 once aligned. Scales with zoom (applied pre-matrix).
	const NEIGHBOUR_OFFSET_X = -50;
	const NEIGHBOUR_OFFSET_Y = -50;

	const overlayState = {
		container: null,
		canvases: new Map(),   // roomName -> canvas
	};

	function ensureOverlay() {
		const stageEl = document.querySelector(".pixijs-renderer__stage");
		if (!stageEl) return null;

		if (!overlayState.container) {
			const div = document.createElement("div");
			div.id = "smo-overlay";
			div.style.position = "fixed";
			div.style.left = "0";
			div.style.top = "0";
			div.style.width = "0";
			div.style.height = "0";
			// transform-origin at 0,0 so the matrix the bridge writes maps local
			// child coordinates straight to viewport pixels.
			div.style.transformOrigin = "0 0";
			div.style.pointerEvents = "none";
			// Above the WebGL canvas, below most UI. Tune if needed:
			//   document.getElementById('smo-overlay').style.zIndex = '...'
			div.style.zIndex = "1";
			document.body.appendChild(div);
			overlayState.container = div;
		}
		return overlayState;
	}

	function getCanvasForRoom(roomName) {
		if (overlayState.canvases.has(roomName)) {
			return overlayState.canvases.get(roomName);
		}
		if (!overlayState.container) return null;

		const canvas = document.createElement("canvas");
		canvas.id = `smo-canvas-${roomName}`;
		canvas.width = 1000;
		canvas.height = 1000;
		canvas.style.position = "absolute";
		// Sized in LOCAL units; the container's matrix scales it to screen.
		canvas.style.width = `${ROOM_LOCAL_SIZE}px`;
		canvas.style.height = `${ROOM_LOCAL_SIZE}px`;
		canvas.style.pointerEvents = "none";
		canvas.style.opacity = "0.9";

		overlayState.container.appendChild(canvas);
		overlayState.canvases.set(roomName, canvas);
		return canvas;
	}

	// Keep each canvas's pixel buffer at the room-view element's resolution so the
	// radar is drawn sharply; the container matrix handles on-screen scaling.
	function updateCanvasPixelBuffersIfNeeded() {
		const stageEl = document.querySelector(".pixijs-renderer__stage");
		if (!stageEl) return;
		const rect = stageEl.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const w = Math.round(rect.width * dpr);
		const h = Math.round(rect.height * dpr);
		overlayState.canvases.forEach((canvas) => {
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
		});
	}

	// Place each neighbour canvas at its LOCAL position (dx,dy whole rooms). This
	// is static per layout - the camera matrix on the container does the rest.
	function layoutCanvases(neighbours) {
		ensureOverlay();
		updateCanvasPixelBuffersIfNeeded();
		neighbours.forEach(({ dx, dy, roomName }) => {
			const canvas = getCanvasForRoom(roomName);
			if (!canvas) return;
			canvas.style.left = `${dx * ROOM_LOCAL_SIZE + NEIGHBOUR_OFFSET_X}px`;
			canvas.style.top = `${dy * ROOM_LOCAL_SIZE + NEIGHBOUR_OFFSET_Y}px`;
		});
	}

	// Show/hide the whole overlay without destroying the canvases. Used to hide
	// the last room's render when we navigate to a non-room screen (market, world
	// map, profile, etc.) and re-show it when we return to a room.
	function setOverlayVisible(visible) {
		if (!overlayState.container) return;
		overlayState.container.style.display = visible ? "" : "none";
	}

	function cleanupUnusedCanvases(neighbourRoomNames) {
		const keep = new Set(neighbourRoomNames);
		for (const [roomName, canvas] of overlayState.canvases.entries()) {
			if (!keep.has(roomName)) {
				canvas.remove();
				overlayState.canvases.delete(roomName);
			}
		}
	}

	SMO.overlay = {
		ensureOverlay,
		getCanvasForRoom,
		layoutCanvases,
		setOverlayVisible,
		cleanupUnusedCanvases
	};
})();
