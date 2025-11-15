(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const overlayState = {
        container: null,
        canvases: new Map(),
        stage: null
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
        canvas.style.position = "absolute";
        canvas.style.pointerEvents = "none";
        canvas.style.opacity = "0.9";

        overlayState.container.appendChild(canvas);
        overlayState.canvases.set(roomName, canvas);
        return canvas;
    }

    function layoutCanvases(neighbours) {
        if (!overlayState.container) return;
        const metrics = getStageSize();
        if (!metrics) return;
        const { width, height } = metrics;

        neighbours.forEach(({ dx, dy, roomName }) => {
            const canvas = getCanvasForRoom(roomName);
            if (!canvas) return;
            canvas.width = width;
            canvas.height = height;
            canvas.style.left = `${dx * width}px`;
            canvas.style.top = `${dy * height}px`;
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