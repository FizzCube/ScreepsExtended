/**
 * Controller renderer with user badge support
 */
(() => {
    const { getBadgeImageEntry } = window.ScreepsBadgeImageCache;
    const { TYPE_STYLES } = window.ScreepsRendererConfig;

    // Cache for loaded controller image
    let controllerImageCache = null;

    /**
     * Load controller SVG image
     */
    function loadControllerImage() {
        if (controllerImageCache === null) {
            controllerImageCache = { status: "loading" };
            const img = new Image();
            img.onload = () => {
                controllerImageCache = { status: "loaded", image: img };
            };
            img.onerror = () => {
                controllerImageCache = { status: "error" };
            };
            img.src = "https://screeps.com/a/vendor/renderer/metadata/controller.svg";
        }
        return controllerImageCache;
    }

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
        const oversizedRadius = minScale * 1;
        const innerRadius = minScale * 0.4; // Badge area
        const glowSize = minScale * 3; // 6x6 glow effect
        const outerFill = style.fill || "rgba(0, 0, 0, 1)";

        const normalizedUserName = typeof userName === "string" ? userName.trim() : "";
        const shouldDrawBadge = normalizedUserName.length > 0;
        const badgeEntry = shouldDrawBadge ? getBadgeImageEntry(normalizedUserName) : null;

        const controllerImg = loadControllerImage();

        controllerPoints.forEach(([x, y]) => {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;

            // Draw white glow effect
            ctx.save();
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
            gradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
            gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.1)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw controller SVG image (oversized and colored black)
            if (controllerImg && controllerImg.status === "loaded" && controllerImg.image) {
                ctx.save();
                
                // Create a black version of the white SVG
                ctx.globalCompositeOperation = "source-over";
                ctx.filter = "brightness(0%)"; // Convert white to black, preserve transparency
                
                ctx.drawImage(
                    controllerImg.image,
                    cx - oversizedRadius,
                    cy - oversizedRadius,
                    oversizedRadius * 2,
                    oversizedRadius * 2
                );
                
                ctx.restore();
            } else {
                // Fallback: draw manual 8-sided shape if SVG fails to load
                const halfSize = oversizedRadius;
                const cornerCut = halfSize * 0.35;
                
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
            }

            // Draw badge if username is provided
            if (shouldDrawBadge && badgeEntry && badgeEntry.status === "loaded" && 
                badgeEntry.image && badgeEntry.image.naturalWidth > 0 && badgeEntry.image.naturalHeight > 0) {
                
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
            } else {
				// Draw inner circle if no badge
				ctx.save();
				ctx.fillStyle = style.innerFill || "rgba(100, 100, 100, 1)";
				ctx.beginPath();
				ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
        });
    }

    // Export for use in other modules
    window.ScreepsControllerRenderer = {
        drawControllers
    };
})();