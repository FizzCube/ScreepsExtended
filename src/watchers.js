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

        setTimeout(() => {
            SMO.overlay.ensureOverlay();
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        }, 1000);
    }

    watchRoomAndStage();
})();