(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    function watchRoomAndStage() {
        window.addEventListener("hashchange", () => {
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        });

        const observer = new MutationObserver(() => {
            const stage = document.querySelector(".pixijs-renderer__stage");
            if (stage) {
                SMO.overlay.ensureOverlay();
                if (typeof SMO.render === "function") {
                    SMO.render();
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener("resize", () => {
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        });

        // Listen for page hook messages for room view events (zoom/resize)
        window.addEventListener("message", (event) => {
            if (event.source !== window) return;
            const data = event.data;
            if (!data || data.source !== 'screeps-hook:room-view') return;
            try {
                // console.log('[Screeps Overlay][Watchers] RoomView hook message:', data);
                if (data.type === 'broadcast-detected' || data.type === 'zoom-invoked' || data.type === 'zoom-change') {
                    // Ensure overlay and trigger the render
                    if (SMO.overlay && typeof SMO.overlay.ensureOverlay === 'function') {
                        SMO.overlay.ensureOverlay();
                    }
                    if (typeof SMO.render === 'function') {
                        SMO.render();
                    }
                }
            } catch (err) {
                console.warn('[Screeps Overlay][Watchers] Error handling room-view hook message', err);
            }
        }, false);

        // Static content is event-driven: the handlers above (hashchange, resize,
        // DOM mutation, zoom hook) plus SMO.render() calls from the terrain and
        // room-object caches when data arrives all repaint the static layer. The
        // only thing that needs a steady loop is the cheap animated layer
        // (rotating towers, etc.), throttled here to ~30fps.
        const ANIM_INTERVAL_MS = 1000 / 30;
        let lastAnimAt = 0;
        function animationLoop(now) {
            if (now - lastAnimAt >= ANIM_INTERVAL_MS) {
                lastAnimAt = now;
                if (typeof SMO.renderAnimated === "function") {
                    SMO.renderAnimated();
                }
            }
            requestAnimationFrame(animationLoop);
        }
        requestAnimationFrame(animationLoop);

        // Initial kick: the MutationObserver only fires on changes, so if the
        // room stage is already present we still seed one static render.
        SMO.overlay.ensureOverlay();
        if (typeof SMO.render === "function") {
            SMO.render();
        }
    }

    watchRoomAndStage();
})();