/**
 * Terrain rendering functions
 */
(() => {
    const { isCorridorRoom, isMiddleRoom } = window.ScreepsRendererUtils;

    /**
     * Draw a single terrain layer pass for a specific terrain type
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} terrainString - Terrain data string
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {number} typeID - Terrain type ID (1=wall, 2=swamp)
     * @param {string} style - Fill style color
     * @param {number} size - Size multiplier
     */
    function drawTerrainLayerPass(ctx, terrainString, scaleX, scaleY, typeID, style, size) {
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                const idx = y * 50 + x;
                const tileCode = terrainString.charCodeAt(idx) - 48;
                if (tileCode === typeID) {
                    ctx.fillStyle = style;
                    ctx.fillRect(
                        x * scaleX - (scaleX / 2 * (size - 1)), 
                        y * scaleY - (scaleY / 2 * (size - 1)), 
                        scaleX * size, 
                        scaleY * size
                    );
                }
            }
        }
    }

    /**
     * Draw the terrain layer (walls and swamps)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} terrainString - Terrain data string (2500 chars)
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawTerrainLayer(ctx, terrainString, scaleX, scaleY) {
        if (!terrainString || terrainString.length < 2500) return;

        // Draw swamps
        drawTerrainLayerPass(ctx, terrainString, scaleX, scaleY, 2, "rgba(32, 40, 19, 1)", 1.2);
        drawTerrainLayerPass(ctx, terrainString, scaleX, scaleY, 2, "rgba(42, 50, 29, 1)", 1);

        // Draw walls
        drawTerrainLayerPass(ctx, terrainString, scaleX, scaleY, 1, "rgba(0, 0, 0, 1)", 1.2);
        drawTerrainLayerPass(ctx, terrainString, scaleX, scaleY, 1, "rgba(23, 23, 23, 1)", 1);
    }

    // Cache for exit arrow images
    const exitImages = {};

    /**
     * Load exit arrow SVG images
     */
    function loadExitImages() {
        const directions = ['top', 'bottom', 'left', 'right'];
        directions.forEach(dir => {
            const img = new Image();
            img.src = `https://screeps.com/a/vendor/renderer/metadata/exit-${dir}.svg`;
            exitImages[dir] = img;
        });
    }

    /**
     * Draw exit arrows at room edges where there are no walls
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} terrainString - Terrain data string
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawExitArrows(ctx, terrainString, scaleX, scaleY) {
        if (!terrainString || terrainString.length < 2500) return;

        const size = Math.min(scaleX, scaleY) * 0.8;

        // Check top edge (y = 0)
        for (let x = 0; x < 50; x++) {
            const idx = 0 * 50 + x;
            const tileCode = terrainString.charCodeAt(idx) - 48;
            if (tileCode !== 1 && exitImages.top) {
                const centerX = x * scaleX + scaleX/2;
                const centerY = scaleY/2;
                ctx.drawImage(exitImages.top, centerX - size/2, centerY - size/2, size, size);
            }
        }

        // Check bottom edge (y = 49)
        for (let x = 0; x < 50; x++) {
            const idx = 49 * 50 + x;
            const tileCode = terrainString.charCodeAt(idx) - 48;
            if (tileCode !== 1 && exitImages.bottom) {
                const centerX = x * scaleX + scaleX/2;
                const centerY = 49 * scaleY + scaleY/2;
                ctx.drawImage(exitImages.bottom, centerX - size/2, centerY - size/2, size, size);
            }
        }

        // Check left edge (x = 0)
        for (let y = 0; y < 50; y++) {
            const idx = y * 50 + 0;
            const tileCode = terrainString.charCodeAt(idx) - 48;
            if (tileCode !== 1 && exitImages.left) {
                const centerX = scaleX/2;
                const centerY = y * scaleY + scaleY/2;
                ctx.drawImage(exitImages.left, centerX - size/2, centerY - size/2, size, size);
            }
        }

        // Check right edge (x = 49)
        for (let y = 0; y < 50; y++) {
            const idx = y * 50 + 49;
            const tileCode = terrainString.charCodeAt(idx) - 48;
            if (tileCode !== 1 && exitImages.right) {
                const centerX = 49 * scaleX + scaleX/2;
                const centerY = y * scaleY + scaleY/2;
                ctx.drawImage(exitImages.right, centerX - size/2, centerY - size/2, size, size);
            }
        }
    }

    // Load images when module loads
    loadExitImages();

    /**
     * Draw the background for a room
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {string} roomName - Room name for determining background color
     */
    function drawBackground(ctx, width, height, roomName) {
        const isCorridor = isCorridorRoom(roomName);
        const isMiddle = isMiddleRoom(roomName);
        
        let backgroundColor;
        if (isCorridor) {
            backgroundColor = "rgba(65, 65, 65, 1)";
        } else if (isMiddle) {
            backgroundColor = "rgba(60, 45, 45, 1)"; // Slightly red-grey for middle rooms
        } else {
            backgroundColor = "rgba(43, 43, 43, 1)";
        }
        
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
    }

    // Export for use in other modules
    window.ScreepsTerrainRenderer = {
        drawTerrainLayer,
        drawBackground,
        drawExitArrows
    };
})();