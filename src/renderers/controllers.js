/**
 * Controller renderer with user badge support
 */
(() => {
    const { getBadgeImageEntry } = window.ScreepsBadgeImageCache;
    const { TYPE_STYLES } = window.ScreepsRendererConfig;

    /**
     * Draw controllers with optional user badges
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} controllerPoints - Array of [x, y] controller coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {string} userName - Username for badge display (optional)
     */
    function drawControllers(ctx, controllerPoints, scaleX, scaleY, userName) {
        if (!Array.isArray(controllerPoints) || controllerPoints.length === 0) return;
        const style = TYPE_STYLES.c || {};
        const minScale = Math.min(scaleX, scaleY);
        const halfSize = minScale * 0.5;
        const cornerCut = halfSize * 0.35;
        const innerRadius = minScale * 0.5;
        const glowRadius = halfSize + minScale * (style.glowOffset || 0.2);
        const outerFill = style.fill || "rgba(0, 0, 0, 1)";
        const innerFill = style.innerFill || "rgba(60, 60, 60, 1)";
        const glowFill = style.glow || "rgba(255, 255, 255, 0.15)";
        const normalizedUserName = typeof userName === "string" ? userName.trim() : "";
        const badgeEntry = normalizedUserName ? getBadgeImageEntry(normalizedUserName) : null;

        controllerPoints.forEach(([x, y]) => {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;

            ctx.save();
            ctx.fillStyle = glowFill;
            ctx.beginPath();
            ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = outerFill;
            ctx.beginPath();
            ctx.moveTo(cx - halfSize + cornerCut, cy - halfSize);
            ctx.lineTo(cx + halfSize - cornerCut, cy - halfSize);
            ctx.lineTo(cx + halfSize, cy - halfSize + cornerCut);
            ctx.lineTo(cx + halfSize, cy + halfSize - cornerCut);
            ctx.lineTo(cx + halfSize - cornerCut, cy + halfSize);
            ctx.lineTo(cx - halfSize + cornerCut, cy + halfSize);
            ctx.lineTo(cx - halfSize, cy + halfSize - cornerCut);
            ctx.lineTo(cx - halfSize, cy - halfSize + cornerCut);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = innerFill;
            ctx.beginPath();
            ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
            ctx.fill();

            const canDrawBadge =
                badgeEntry &&
                badgeEntry.status === "loaded" &&
                badgeEntry.image &&
                badgeEntry.image.naturalWidth > 0 &&
                badgeEntry.image.naturalHeight > 0;
            if (canDrawBadge) {
                const badgeRadius = innerRadius * 0.9;
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(
                    badgeEntry.image,
                    cx - badgeRadius,
                    cy - badgeRadius,
                    badgeRadius * 2,
                    badgeRadius * 2
                );
                ctx.restore();
            }

            ctx.restore();
        });
    }

    // Export for use in other modules
    window.ScreepsControllerRenderer = {
        drawControllers
    };
})();