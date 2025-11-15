/**
 * Enhanced sources renderer with glow effect
 */
(() => {
    const { TYPE_STYLES } = window.ScreepsRendererConfig;

    /**
     * Draw sources with yellow glow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} sourcePoints - Array of [x, y] coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawSources(ctx, sourcePoints, scaleX, scaleY) {
        if (!Array.isArray(sourcePoints) || sourcePoints.length === 0) return;

        const style = TYPE_STYLES.s || { radius: 0.8, fill: "rgba(255, 215, 0, 0.9)" };
        const minScale = Math.min(scaleX, scaleY);
        const radius = style.radius * minScale * 0.5;
        const glowSize = minScale * 3; // 6x6 glow effect

        sourcePoints.forEach(([x, y]) => {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;

            // Draw yellow glow effect

			ctx.save();
			const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
			gradient.addColorStop(0, "rgba(255, 215, 0, 0.4)");
			gradient.addColorStop(0.5, "rgba(255, 215, 0, 0.2)");
			gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
            
            // Draw the source itself
            ctx.save();
            ctx.fillStyle = style.fill;
            if (style.outline) {
                ctx.strokeStyle = style.outline;
                ctx.lineWidth = Math.max(1, radius * 0.3);
            }
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            if (style.outline) {
                ctx.stroke();
            }
            ctx.fill();
            ctx.restore();
        });
    }

    // Export for use in other modules
    window.ScreepsSourceRenderer = {
        drawSources
    };
})();