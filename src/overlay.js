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

	// Each room gets TWO stacked canvases at the same position:
	//   static   - terrain + every non-animated structure; redrawn only on
	//              room/zoom/data change (driven by render()).
	//   animated - just the animated structures (rotating towers, etc.); cleared
	//              and redrawn at ~30fps by renderAnimated(). It sits on top so it
	//              composites over the static layer.
	const overlayState = {
		container: null,
		rooms: new Map(),   // roomName -> { staticCanvas, animatedCanvas }
	};

	// The top nav bar (header.navbar) renders at z-index:auto inside top-content,
	// which forms no stacking context. Our overlay - painted later in the root
	// stacking context - would therefore cover the logo/credits/cpu bar. Giving
	// the navbar a small positive z-index lifts it into the higher stacking step,
	// above our (z-index:auto) overlay, while staying below the game's own chrome
	// (sidenav z60, dropdowns z1000). Idempotent and cheap; re-applied each render
	// so an Angular re-render can't silently drop it.
	function ensureNavbarAboveOverlay() {
		const navbar = document.querySelector("header.navbar");
		if (navbar && navbar.style.zIndex !== "10") {
			navbar.style.zIndex = "10";
		}
	}

	function ensureOverlay() {
		const stageEl = document.querySelector(".pixijs-renderer__stage");
		if (!stageEl) return null;

		ensureNavbarAboveOverlay();

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
			// Whole-overlay translucency lives on the container (not per canvas) so
			// the stacked static + animated canvases don't double-fade where they
			// overlap (e.g. a tower over its terrain tile).
			div.style.opacity = "0.9";
			// Z-ordering: the top nav (app-menu, z-index 1000) lives inside
			// app2-router-outlet, a positioned sibling of the game container. A
			// positioned/z-indexed overlay on <body> paints ABOVE that whole subtree
			// (covering logo/credits/cpu bar). So we leave z-index auto and insert
			// BEFORE the router-outlet: CSS stacking then puts us above the
			// (non-positioned) game canvas but below the positioned nav.
			const routerOutlet = document.querySelector("app2-router-outlet");
			if (routerOutlet && routerOutlet.parentElement === document.body) {
				document.body.insertBefore(div, routerOutlet);
			} else {
				document.body.appendChild(div);
			}
			overlayState.container = div;
		}
		return overlayState;
	}

	function createRoomCanvas(roomName, kind) {
		const canvas = document.createElement("canvas");
		canvas.id = `smo-canvas-${kind}-${roomName}`;
		canvas.width = 1000;
		canvas.height = 1000;
		canvas.style.position = "absolute";
		// Sized in LOCAL units; the container's matrix scales it to screen.
		canvas.style.width = `${ROOM_LOCAL_SIZE}px`;
		canvas.style.height = `${ROOM_LOCAL_SIZE}px`;
		canvas.style.pointerEvents = "none";
		return canvas;
	}

	// Returns { staticCanvas, animatedCanvas } for a room. Pass
	// { createIfMissing: false } to look up without creating (used by the animated
	// loop, which must not create canvases the static pass hasn't laid out yet).
	function getCanvasesForRoom(roomName, opts) {
		if (overlayState.rooms.has(roomName)) {
			return overlayState.rooms.get(roomName);
		}
		const createIfMissing = !opts || opts.createIfMissing !== false;
		if (!createIfMissing) return null;
		if (!overlayState.container) return null;

		const staticCanvas = createRoomCanvas(roomName, "static");
		const animatedCanvas = createRoomCanvas(roomName, "animated");
		// Append static first, animated second -> animated paints on top.
		overlayState.container.appendChild(staticCanvas);
		overlayState.container.appendChild(animatedCanvas);

		const pair = { staticCanvas, animatedCanvas };
		overlayState.rooms.set(roomName, pair);
		return pair;
	}

	// Keep each canvas's pixel buffer at the room-view element's resolution so the
	// radar is drawn sharply; the container matrix handles on-screen scaling.
	// (Resizing a canvas clears it; static is redrawn right after layout in
	// render(), animated repaints on its next tick.)
	function updateCanvasPixelBuffersIfNeeded() {
		const stageEl = document.querySelector(".pixijs-renderer__stage");
		if (!stageEl) return;
		const rect = stageEl.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const w = Math.round(rect.width * dpr);
		const h = Math.round(rect.height * dpr);
		overlayState.rooms.forEach((pair) => {
			[pair.staticCanvas, pair.animatedCanvas].forEach((canvas) => {
				if (canvas.width !== w || canvas.height !== h) {
					canvas.width = w;
					canvas.height = h;
				}
			});
		});
	}

	// Place each neighbour's canvas pair at its LOCAL position (dx,dy whole rooms).
	// This is static per layout - the camera matrix on the container does the rest.
	function layoutCanvases(neighbours) {
		ensureOverlay();
		updateCanvasPixelBuffersIfNeeded();
		neighbours.forEach(({ dx, dy, roomName }) => {
			const pair = getCanvasesForRoom(roomName);
			if (!pair) return;
			const left = `${dx * ROOM_LOCAL_SIZE + NEIGHBOUR_OFFSET_X}px`;
			const top = `${dy * ROOM_LOCAL_SIZE + NEIGHBOUR_OFFSET_Y}px`;
			pair.staticCanvas.style.left = left;
			pair.staticCanvas.style.top = top;
			pair.animatedCanvas.style.left = left;
			pair.animatedCanvas.style.top = top;
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
		for (const [roomName, pair] of overlayState.rooms.entries()) {
			if (!keep.has(roomName)) {
				pair.staticCanvas.remove();
				pair.animatedCanvas.remove();
				overlayState.rooms.delete(roomName);
			}
		}
	}

	SMO.overlay = {
		ensureOverlay,
		getCanvasesForRoom,
		layoutCanvases,
		setOverlayVisible,
		cleanupUnusedCanvases
	};
})();
