/**
 * Exit-click drag guard.
 *
 * Screeps changes room when you click an exit arrow (an element with class
 * "exit"). If you press down on an exit and then DRAG the map, the trailing
 * click still fires and changes room unexpectedly. This guard tracks the
 * pointer: when it travels more than a small threshold between down and up, it
 * suppresses the click that lands on an exit element - in the capture phase,
 * before the game's own handler sees it.
 *
 * The listeners live on document/window in the capture phase, so the guard is
 * independent of where the overlay sits in the DOM and survives Angular
 * re-rendering the room view. Installed once at load; the listeners persist.
 *
 * (Originally part of overlay.js, commit 9ccc0d2; extracted here when the
 * overlay was rewritten so it no longer depends on the overlay's DOM placement.)
 */
(() => {
	const SMO = window.ScreepsMinimalOverlay || null;

	// pixels; if the pointer travels more than this between down and up, the
	// press is treated as a drag rather than a click.
	const driftThreshold = (SMO && SMO.config && typeof SMO.config.exitClickThreshold === "number")
		? SMO.config.exitClickThreshold
		: 8;

	let pointerDownPos = null;
	let pointerMoved = false;
	let lastPointerDragged = false;

	function getPointFromEvent(e) {
		if (e.touches && e.touches.length) {
			return { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
		if (e.changedTouches && e.changedTouches.length) {
			return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
		}
		return { x: e.clientX || 0, y: e.clientY || 0 };
	}

	function pointerDownHandler(e) {
		pointerDownPos = getPointFromEvent(e);
		pointerMoved = false;
	}

	function pointerMoveHandler(e) {
		if (!pointerDownPos) return;
		const p = getPointFromEvent(e);
		const dx = Math.abs(p.x - pointerDownPos.x);
		const dy = Math.abs(p.y - pointerDownPos.y);
		if (dx * dx + dy * dy > driftThreshold * driftThreshold) {
			pointerMoved = true;
		}
	}

	function pointerUpHandler() {
		lastPointerDragged = pointerMoved;
		pointerDownPos = null;
		pointerMoved = false;
		// Only relevant for the click that immediately follows this pointerup;
		// clear it on the next task so a later genuine click isn't suppressed.
		setTimeout(() => { lastPointerDragged = false; }, 0);
	}

	function findExitAncestor(node) {
		while (node && node.nodeType === 1) {
			if (node.classList && node.classList.contains("exit")) return node;
			node = node.parentElement;
		}
		return null;
	}

	function clickCaptureHandler(e) {
		if (!lastPointerDragged) return;
		if (!findExitAncestor(e.target)) return;
		// Suppress the click that follows a drag so accidental panning across an
		// exit arrow doesn't change room.
		e.preventDefault();
		try { e.stopPropagation(); } catch (err) { /* noop */ }
		try { e.stopImmediatePropagation(); } catch (err) { /* noop */ }
		if (SMO && SMO.config && SMO.config.debug) {
			console.log("[Screeps Overlay] suppressed exit click due to drag");
		}
	}

	// Pointer events cover mouse + touch; attach to document/window in the
	// capture phase so they persist across the game's DOM replacements.
	document.addEventListener("pointerdown", pointerDownHandler, true);
	window.addEventListener("pointermove", pointerMoveHandler, true);
	window.addEventListener("pointerup", pointerUpHandler, true);

	// Touch fallback for environments without pointer events.
	document.addEventListener("touchstart", pointerDownHandler, { passive: true, capture: true });
	window.addEventListener("touchmove", pointerMoveHandler, { passive: true, capture: true });
	window.addEventListener("touchend", pointerUpHandler, { passive: true, capture: true });

	// Capture clicks early so we can suppress them before the game's handler runs.
	document.addEventListener("click", clickCaptureHandler, true);
})();
