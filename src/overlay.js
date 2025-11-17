(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const overlayState = {
        container: null,
        canvases: new Map(),
        stage: null,
        // track last measured pixel size so we only update canvas buffers when needed
        lastStagePixels: { widthPx: 0, heightPx: 0, dpr: 0 }
    };

    // Tracks whether we've installed the click/drag guard for exit buttons.
    let exitGuardInitialized = false;

    function findStageElement() {
        return document.querySelector(".pixijs-renderer__stage");
    }

    function ensureOverlay() {
        const stage = findStageElement();
        if (!stage) return null;

        if (overlayState.container && document.contains(overlayState.container) && overlayState.stage === stage) {
            return overlayState;
        }

        if (overlayState.container) {
            overlayState.container.remove();
            overlayState.canvases.forEach((canvas) => canvas.remove());
            overlayState.canvases.clear();
        }

        const container = document.createElement("div");
        container.id = "screeps-minimal-overlay";
        container.style.position = "absolute";
        container.style.pointerEvents = "none";
        container.style.inset = "0";
        container.style.display = "block";

        const stageStyle = window.getComputedStyle(stage);
        if (stageStyle.position === "static") {
            stage.style.position = "relative";
        }

        // Insert the overlay container as the first child so it sits beneath
        // overlay/floating UI elements (e.g., buttons) that are appended later.
        // If there are no child nodes, fall back to appendChild.
        if (stage.firstChild) {
            stage.insertBefore(container, stage.firstChild);
        } else {
            stage.appendChild(container);
        }

        overlayState.stage = stage;
        overlayState.container = container;

        // Ensure the click/drag guard is attached to the stage for the 'exit' buttons
        // so click events that follow a drag do not trigger room changes.
        if (!exitGuardInitialized) {
            try {
                setupExitClickGuard(stage);
                exitGuardInitialized = true;
            } catch (e) {
                // Don't break the overlay if we cannot install the guard for any reason.
                if (SMO.config && SMO.config.debug) console.warn('[Screeps Overlay] failed to install exit click guard', e);
            }
        }

        return overlayState;
    }

    function getStageSize() {
        if (!overlayState.container) return null;
        const rect = overlayState.container.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }

    function getCanvasForRoom(roomName) {
        if (!overlayState.container) return null;
        if (overlayState.canvases.has(roomName)) {
            return overlayState.canvases.get(roomName);
        }

        const canvas = document.createElement("canvas");

        // Make the canvas inherit the parent size via CSS (no per-canvas absolute px sizing).
        canvas.style.position = "absolute";
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.transformOrigin = "0 0";
        canvas.style.pointerEvents = "none";
        canvas.style.opacity = "0.9";
        canvas.style.willChange = "transform";

        // keep a data attr for debugging
        canvas.dataset.smoRoom = roomName;

        overlayState.container.appendChild(canvas);
        overlayState.canvases.set(roomName, canvas);
        return canvas;
    }

    // Helper: only update buffers when the stage's pixel dimensions or DPR changed
    function updateCanvasPixelBuffersIfNeeded() {
        if (!overlayState.stage || overlayState.canvases.size === 0) return;
        const stageRect = overlayState.stage.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidthPx = Math.round(stageRect.width * dpr);
        const targetHeightPx = Math.round(stageRect.height * dpr);

        const last = overlayState.lastStagePixels || {};
        if (targetWidthPx === last.widthPx && targetHeightPx === last.heightPx && dpr === last.dpr) {
            return;
        }

        overlayState.lastStagePixels = { widthPx: targetWidthPx, heightPx: targetHeightPx, dpr };

        // Resize the backing buffer for each canvas just once (avoid per-render).
        overlayState.canvases.forEach((canvas) => {
            // Avoid re-assigning if already correct (some browsers might have fractional sizing).
            if (canvas.width !== targetWidthPx || canvas.height !== targetHeightPx) {
                canvas.width = targetWidthPx;
                canvas.height = targetHeightPx;
                // Most renderers will expect ctx drawn at device pixel ratio; callers should scale
                // their ctx by dpr if needed. We don't need to set CSS width/height because we use 100%.
            }
        });
    }

    function layoutCanvases(neighbours) {
        if (!overlayState.container) return;
        const metrics = getStageSize();
        if (!metrics) return;

        // Keep canvas pixel buffers in sync only when stage dims/DPR changed.
        updateCanvasPixelBuffersIfNeeded();

        neighbours.forEach(({ dx, dy, roomName }) => {
            const canvas = getCanvasForRoom(roomName);
            if (!canvas) return;

            // Each canvas is sized to 100% of the parent with transform origin at 0,0.
            // Move it by whole canvas widths/heights using percentages so we don't need px math here.
            canvas.style.transform = `translate(${dx * 100}%, ${dy * 100}%)`;
        });
    }

    function cleanupUnusedCanvases(neighbourRoomNames) {
        if (!overlayState.container) return;
        const keepSet = new Set(neighbourRoomNames);
        for (const [roomName, canvas] of overlayState.canvases.entries()) {
            if (!keepSet.has(roomName)) {
                canvas.remove();
                overlayState.canvases.delete(roomName);
            }
        }
    }

    function setupExitClickGuard(stage) {
        if (exitGuardInitialized) return;
        if (!stage) return;

        const driftThreshold = (SMO && SMO.config && typeof SMO.config.exitClickThreshold === 'number') ? SMO.config.exitClickThreshold : 8; // pixels; if pointer travels more than this, treat as a drag
        let pointerDownPos = null;
        let pointerMoved = false;
        let lastPointerDragged = false;

        function getPointFromEvent(e) {
            // Use clientX/clientY for mouse/pointer and touch events
            if (e.touches && e.touches.length) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            if (e.changedTouches && e.changedTouches.length) {
                return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            }
            return { x: e.clientX || 0, y: e.clientY || 0 };
        }

        function pointerDownHandler(e) {
            const p = getPointFromEvent(e);
            pointerDownPos = p;
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

        function pointerUpHandler(e) {
            lastPointerDragged = pointerMoved;
            // reset pointerDownPos so subsequent moves aren't counted
            pointerDownPos = null;
            pointerMoved = false;
            // Keep lastPointerDragged true only for immediate click handlers; reset shortly
            setTimeout(() => { lastPointerDragged = false; }, 0);
        }

        function findExitAncestor(node) {
            while (node && node.nodeType === 1) {
                if (node.classList && node.classList.contains && node.classList.contains('exit')) return node;
                node = node.parentElement;
            }
            return null;
        }

        function clickCaptureHandler(e) {
            if (!lastPointerDragged) return;
            const exit = findExitAncestor(e.target);
            if (exit) {
                // Suppress the click that follows a drag so accidental panning doesn't fire exits
                e.preventDefault();
                try { e.stopPropagation(); } catch (err) {};
                try { e.stopImmediatePropagation(); } catch (err) {};
                if (SMO.config && SMO.config.debug) console.log('[Screeps Overlay] suppressed exit click due to drag');
            }
        }


        // Use pointer events where possible so mouse and touch are both handled.
        // Attach to document/window so handlers persist across DOM replacements of the game's stage.
        document.addEventListener('pointerdown', pointerDownHandler, true);
        window.addEventListener('pointermove', pointerMoveHandler, true);
        window.addEventListener('pointerup', pointerUpHandler, true);

        // Also add touch fallback for older browsers or cases where pointer events aren't supported
        document.addEventListener('touchstart', pointerDownHandler, { passive: true, capture: true });
        window.addEventListener('touchmove', pointerMoveHandler, { passive: true, capture: true });
        window.addEventListener('touchend', pointerUpHandler, { passive: true, capture: true });

        // Capture clicks early in the phase so we can suppress them before they reach game handlers.
        document.addEventListener('click', clickCaptureHandler, true);

        // When the game injects Angular or updates the room view, ensure the guard remains active.
        // Hook into the injected roomview hook message so we can reattach or re-check if needed.
        function hookMessageHandler(msg) {
            try {
                if (!msg || !msg.data) return;
                if (msg.data.source === 'screeps-hook:room-view' && msg.data.type === 'broadcast-detected') {
                    // Re-initialize listeners if for some reason they were removed after navigation.
                    // If `exitGuardInitialized` is true, the initialization is idempotent because
                    // we attached capture listeners that survive across replacements. But if
                    // someone removed listeners, this call will reattach them without duplicating.
                    setupExitClickGuard();
                }
            } catch (err) { }
        }
        window.addEventListener('message', hookMessageHandler);

        // mark installed.
        exitGuardInitialized = true;
    }

    SMO.overlay = {
        ensureOverlay,
        getCanvasForRoom,
        layoutCanvases,
        cleanupUnusedCanvases
    };
})();