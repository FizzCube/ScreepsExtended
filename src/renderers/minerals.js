/**
 * Mineral and deposit renderer with special highway deposit handling
 */
(() => {
    const { inferCorridorDepositType } = window.ScreepsRendererUtils;
    const { drawPoints } = window.ScreepsPointRenderer;
    const { getDepositImageEntry, drawTintedImage } = window.ScreepsDepositImageCache;
    const { DEPOSIT_TYPES } = window.ScreepsRendererConfig;

    /**
     * Draw minerals with special handling for highway deposits
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} minerals - Array of [x, y] mineral coordinates
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {string} roomName - Room name for deposit type inference
     */
    function drawMinerals(ctx, minerals, scaleX, scaleY, roomName) {
        if (!Array.isArray(minerals) || minerals.length === 0) return;
        
        const depositType = inferCorridorDepositType(roomName);
        if (!depositType || !DEPOSIT_TYPES[depositType]) {
            drawPoints(ctx, minerals, "m", scaleX, scaleY);
            return;
        }
        
        const typeInfo = DEPOSIT_TYPES[depositType];
        const fillEntry = getDepositImageEntry(depositType, "fill");
        const outlineEntry = getDepositImageEntry(depositType, "outline");
        const fillReady =
            fillEntry &&
            fillEntry.status === "loaded" &&
            fillEntry.image &&
            fillEntry.image.naturalWidth > 0 &&
            fillEntry.image.naturalHeight > 0;
        const outlineReady =
            outlineEntry &&
            outlineEntry.status === "loaded" &&
            outlineEntry.image &&
            outlineEntry.image.naturalWidth > 0 &&
            outlineEntry.image.naturalHeight > 0;
            
        if (!fillReady && !outlineReady) {
            drawPoints(ctx, minerals, "m", scaleX, scaleY);
            return;
        }
        
        const minScale = Math.min(scaleX, scaleY);
        const iconSize = minScale * (typeInfo.size || 2);
        minerals.forEach(([x, y]) => {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            const left = cx - iconSize / 2;
            const top = cy - iconSize / 2;
            if (fillReady) {
                drawTintedImage(
                    ctx,
                    fillEntry.image,
                    left,
                    top,
                    iconSize,
                    typeInfo.fillColor,
                    typeInfo.fillAlpha
                );
            }
            if (outlineReady) {
                drawTintedImage(
                    ctx,
                    outlineEntry.image,
                    left,
                    top,
                    iconSize,
                    typeInfo.outlineColor,
                    typeInfo.outlineAlpha
                );
            }
        });
    }

    // Export for use in other modules
    window.ScreepsMineralRenderer = {
        drawMinerals
    };
})();