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

        setTimeout(() => {
            SMO.overlay.ensureOverlay();
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        }, 1000);
    }

    watchRoomAndStage();
})();