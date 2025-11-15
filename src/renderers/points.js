/**
 * Basic point-based structure renderer (sources, keeper lairs, power banks, portals, player structures)
 */
(() => {
    const { TYPE_STYLES } = window.ScreepsRendererConfig;

    /**
     * Draw simple circular points for various structure types
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} points - Array of [x, y] coordinates
     * @param {string} typeKey - Type key for styling lookup
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawPoints(ctx, points, typeKey, scaleX, scaleY) {
        if (!Array.isArray(points) || points.length === 0) return;
        const style = TYPE_STYLES[typeKey] || { radius: 0.8, fill: "rgba(255, 255, 255, 0.7)" };
        ctx.fillStyle = style.fill;
        if (style.outline) {
            ctx.strokeStyle = style.outline;
        }

        const radius = ((style.radius * scaleX) || scaleX) * 0.5;
        for (const [x, y] of points) {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            if (style.outline) {
                ctx.lineWidth = Math.max(1, radius * 0.3);
                ctx.stroke();
            }
            ctx.fill();
        }
    }

    // Export for use in other modules
    window.ScreepsPointRenderer = {
        drawPoints
    };
})();