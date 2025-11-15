(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const overlayState = {
        container: null,
        canvases: new Map(),
        stage: null
    };

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

        stage.appendChild(container);

        overlayState.stage = stage;
        overlayState.container = container;

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

    SMO.overlay = {
        ensureOverlay,
        getCanvasForRoom,
        layoutCanvases,
        cleanupUnusedCanvases
    };
})();