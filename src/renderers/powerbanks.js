/**
 * Enhanced power bank renderer with SVG image, red circle, and glow effect
 */
(() => {
    const { TYPE_STYLES } = window.ScreepsRendererConfig;

    // Cache for loaded power bank image
    let powerBankImageCache = null;

    /**
     * Load power bank SVG image
     */
    function loadPowerBankImage() {
        if (powerBankImageCache === null) {
            powerBankImageCache = { status: "loading" };
            const img = new Image();
            img.onload = () => {
                powerBankImageCache = { status: "loaded", image: img };
            };
            img.onerror = () => {
                powerBankImageCache = { status: "error" };
            };
            img.src = "https://screeps.com/a/vendor/renderer/metadata/powerBank.svg";
        }
        return powerBankImageCache;
    }

    /**
     * Draw enhanced power banks with SVG image, red circle, and glow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} powerBankPoints - Array of [x, y] coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawPowerBanks(ctx, powerBankPoints, scaleX, scaleY) {
        if (!Array.isArray(powerBankPoints) || powerBankPoints.length === 0) return;

        const style = TYPE_STYLES.pb || { radius: 1, fill: "rgba(255, 0, 0, 0.9)" };
        const minScale = Math.min(scaleX, scaleY);
        const baseRadius = style.radius * minScale * 0.5;
        const oversizedRadius = baseRadius * 1.9; // Slightly oversized
        const innerRedRadius = baseRadius * 0.6; // Inner red circle
        const glowSize = minScale * 4.5; // 9x9 glow (9/2 = 4.5)

        const powerBankImg = loadPowerBankImage();

        powerBankPoints.forEach(([x, y]) => {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;

            // Draw red glow effect underneath
			ctx.save();
			const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
			gradient.addColorStop(0, "rgba(255, 80, 80, 0.3)");
			gradient.addColorStop(0.3, "rgba(255, 60, 60, 0.2)");
			gradient.addColorStop(0.7, "rgba(255, 40, 40, 0.15)");
			gradient.addColorStop(1, "rgba(255, 20, 20, 0.05)");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();

            // Draw power bank SVG image (oversized)
            if (powerBankImg && powerBankImg.status === "loaded" && powerBankImg.image) {
                ctx.save();
                ctx.drawImage(
                    powerBankImg.image,
                    cx - oversizedRadius,
                    cy - oversizedRadius,
                    oversizedRadius * 2,
                    oversizedRadius * 2
                );
                ctx.restore();
            } else {
                // Fallback: draw a larger gray rectangle for power bank base
                ctx.save();
                ctx.fillStyle = "rgba(80, 80, 80, 0.9)";
                ctx.beginPath();
                const halfSize = oversizedRadius;
                ctx.rect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw red circle in the center
            ctx.save();
            ctx.fillStyle = style.fill;
            ctx.beginPath();
            ctx.arc(cx, cy, innerRedRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    // Export for use in other modules
    window.ScreepsPowerBankRenderer = {
        drawPowerBanks
    };
})();