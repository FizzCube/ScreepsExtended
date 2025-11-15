/**
 * Road network renderer with intelligent connection drawing
 */
(() => {
    const { normalizePointList, coordKey } = window.ScreepsRendererUtils;
    const { ROAD_CONNECTIONS, ROAD_NEIGHBOUR_OFFSETS } = window.ScreepsRendererConfig;

    /**
     * Draw a connected road network
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} roadPoints - Array of [x, y] road coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawRoadNetwork(ctx, roadPoints, scaleX, scaleY) {
        const { coords, lookup } = normalizePointList(roadPoints);
        if (!coords.length) return;

        const minScale = Math.min(scaleX, scaleY);
        const baseWidth = minScale * 0.3;
        const isolatedRadius = Math.max(minScale * 0.2, baseWidth * 0.7);

        function strokeConnections(lineWidth, strokeStyle, dashPattern) {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = strokeStyle;
            ctx.setLineDash(dashPattern || []);
            ctx.beginPath();
            for (const [x, y] of coords) {
                const cx = (x + 0.5) * scaleX;
                const cy = (y + 0.5) * scaleY;
                for (const [dx, dy] of ROAD_CONNECTIONS) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (!lookup.has(coordKey(nx, ny))) continue;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo((nx + 0.5) * scaleX, (ny + 0.5) * scaleY);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        strokeConnections(baseWidth, "rgba(180, 180, 180, 0.5)");

        // Draw isolated road points
        ctx.fillStyle = "rgba(180, 180, 180, 0.5)";
        for (const [x, y] of coords) {
            const neighbourCount = ROAD_NEIGHBOUR_OFFSETS.reduce(
                (count, [dx, dy]) => count + (lookup.has(coordKey(x + dx, y + dy)) ? 1 : 0),
                0
            );
            if (neighbourCount !== 0) continue;
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            ctx.beginPath();
            ctx.arc(cx, cy, isolatedRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Export for use in other modules
    window.ScreepsRoadRenderer = {
        drawRoadNetwork
    };
})();