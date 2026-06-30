/**
 * Source keeper lair renderer.
 *
 * Static layer: a slightly oversized black circle marking the lair.
 * Animated layer: a red ring that pulses outward on a 2 second loop -
 *   it starts as a small, thin, faint ring near the centre, grows until its
 *   outer edge reaches the black circle while thinning into a donut (red ring
 *   over a transparent centre), then fades out. The cycle then repeats.
 */
(() => {
    const { TYPE_STYLES } = window.ScreepsRendererConfig;

    const PULSE_PERIOD_MS = 2000;

    /**
     * Outer radius of the black base circle for a keeper lair.
     * @param {number} scaleX - X scale factor
     * @returns {number} radius in pixels
     */
    function baseRadius(scaleX) {
        const style = TYPE_STYLES.k || { radius: 0.8 };
        // Slightly oversized compared to the old plain keeper-lair circle.
        return ((style.radius * scaleX) || scaleX) * 1;
    }

    /**
     * Draw the static oversized black circle for each keeper lair.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} points - Array of [x, y] coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawKeeperLairBase(ctx, points, scaleX, scaleY) {
        if (!Array.isArray(points) || points.length === 0) return;

        const radius = baseRadius(scaleX);

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
        for (const [x, y] of points) {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * Draw the animated pulsing red ring for each keeper lair.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} points - Array of [x, y] coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {number} now - Animation timestamp (performance.now())
     */
    function drawKeeperLairPulse(ctx, points, scaleX, scaleY, now) {
        if (!Array.isArray(points) || points.length === 0) return;

        const maxRadius = baseRadius(scaleX);

        // Phase of the loop, 0 -> 1 over PULSE_PERIOD_MS.
        const t = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;

        // Outer edge grows from near the centre out to the black circle.
        const outer = maxRadius * (0.1 + 0.9 * t);
        // Inner edge keeps the ring at 50% of the outer radius (the donut),
        // leaving a transparent centre that reveals the black circle beneath.
        const inner = outer * 0.5;
        const mid = (outer + inner) / 2;
        const lineWidth = outer - inner;
        if (lineWidth <= 0) return;

        // Opacity envelope: fade in over the first 30%, then fade out over the
        // remaining 70% so the ring dims as it reaches full size.
        let alpha;
        if (t < 0.3) {
            alpha = t / 0.3;
        } else {
            alpha = 1 - (t - 0.3) / 0.7;
        }
        alpha = Math.max(0, Math.min(1, alpha)) * 0.85;
        if (alpha <= 0) return;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 40, 40, ${alpha})`;
        ctx.lineWidth = lineWidth;
        for (const [x, y] of points) {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            ctx.beginPath();
            ctx.arc(cx, cy, mid, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Export for use in other modules
    window.ScreepsKeeperRenderer = {
        drawKeeperLairBase,
        drawKeeperLairPulse
    };
})();
