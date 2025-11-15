/**
 * Wall renderer with intelligent connection drawing and texture
 */
(() => {
    const { normalizePointList, coordKey } = window.ScreepsRendererUtils;
    const { WALL_CONNECTIONS, WALL_NEIGHBOUR_OFFSETS } = window.ScreepsRendererConfig;

    /**
     * Draw wall texture on individual wall blocks
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} coords - Array of [x, y] coordinates
     * @param {number} minScale - Minimum scale factor
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawWallTexture(ctx, coords, minScale, scaleX, scaleY) {
        const blockWidth = minScale * 0.9;
        const blockHeight = minScale * 0.7;
        const horizontalStroke = Math.max(1, minScale * 0.04);
        const rows = 3;

        coords.forEach(([x, y]) => {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            const left = cx - blockWidth / 2;
            const top = cy - blockHeight / 2;
            const right = cx + blockWidth / 2;
            const bottom = cy + blockHeight / 2;
            const rowStep = blockHeight / rows;

            ctx.save();
            ctx.beginPath();
            ctx.rect(left, top, blockWidth, blockHeight);
            ctx.clip();

            ctx.strokeStyle = "rgba(85, 85, 85, 0.85)";
            ctx.lineWidth = horizontalStroke;
            for (let i = 1; i < rows; i++) {
                const yLine = top + rowStep * i;

                const leftLine = cx - (blockWidth / 4 * (2 - i));
                const rightLine = leftLine + (blockWidth / 4);

                ctx.beginPath();
                ctx.moveTo(leftLine, yLine);
                ctx.lineTo(rightLine, yLine);
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    /**
     * Draw a connected wall network
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} wallPoints - Array of [x, y] wall coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawPlayerWalls(ctx, wallPoints, scaleX, scaleY) {
        const { coords, lookup } = normalizePointList(wallPoints);
        if (!coords.length) return;

        const minScale = Math.min(scaleX, scaleY);
        const outlineWidth = minScale * 0.95;
        const fillWidth = minScale * 0.85;
        const isolatedSize = minScale * 0.95;

        function strokeConnections(lineWidth, strokeStyle) {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = strokeStyle;
            ctx.beginPath();
            for (const [x, y] of coords) {
                const cx = (x + 0.5) * scaleX;
                const cy = (y + 0.5) * scaleY;
                for (const [dx, dy] of WALL_CONNECTIONS) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (!lookup.has(coordKey(nx, ny))) continue;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo((nx + 0.5) * scaleX, (ny + 0.5) * scaleY);
                }
            }
            ctx.stroke();
        }

        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        strokeConnections(outlineWidth, "rgba(0, 0, 0, 1)");
        strokeConnections(fillWidth, "rgba(20, 20, 20, 0.95)");

        // Draw isolated walls
        ctx.fillStyle = "rgba(20, 20, 20, 0.95)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = Math.max(minScale * 0.1);
        const halfIso = isolatedSize / 2;
        for (const [x, y] of coords) {
            const neighbours = WALL_NEIGHBOUR_OFFSETS.reduce(
                (count, [dx, dy]) => count + (lookup.has(coordKey(x + dx, y + dy)) ? 1 : 0),
                0
            );
            if (neighbours !== 0) continue;
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            ctx.beginPath();
            ctx.rect(cx - halfIso, cy - halfIso, isolatedSize, isolatedSize);
            ctx.fill();
            ctx.stroke();
        }

        drawWallTexture(ctx, coords, minScale, scaleX, scaleY);

        ctx.restore();
    }

    // Export for use in other modules
    window.ScreepsWallRenderer = {
        drawPlayerWalls
    };
})();