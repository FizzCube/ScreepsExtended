/**
 * Image caching system for deposit SVGs
 */
(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const { DEPOSIT_TYPES } = window.ScreepsRendererConfig;

    // Initialize cache if it doesn't exist
    const depositImageCache = SMO.depositImageCache instanceof Map ? SMO.depositImageCache : new Map();
    if (!(SMO.depositImageCache instanceof Map)) {
        SMO.depositImageCache = depositImageCache;
    }

    // Canvas for tinting operations
    let depositTintCanvas = SMO.depositTintCanvas;
    let depositTintCtx = SMO.depositTintCtx;

    /**
     * Ensure the tint context canvas is ready for use
     * @param {number} width - Required canvas width
     * @param {number} height - Required canvas height
     * @returns {CanvasRenderingContext2D|null} Tint context or null if failed
     */
    function ensureDepositTintContext(width, height) {
        if (!(depositTintCanvas instanceof window.HTMLCanvasElement)) {
            depositTintCanvas = document.createElement("canvas");
            depositTintCtx = depositTintCanvas.getContext("2d");
            SMO.depositTintCanvas = depositTintCanvas;
            SMO.depositTintCtx = depositTintCtx;
        }
        if (!depositTintCtx) return null;
        if (depositTintCanvas.width !== width || depositTintCanvas.height !== height) {
            depositTintCanvas.width = width;
            depositTintCanvas.height = height;
        }
        depositTintCtx.setTransform(1, 0, 0, 1, 0, 0);
        depositTintCtx.globalCompositeOperation = "source-over";
        depositTintCtx.globalAlpha = 1;
        depositTintCtx.clearRect(0, 0, width, height);
        return depositTintCtx;
    }

    /**
     * Get or create a cached deposit image entry
     * @param {string} typeKey - Deposit type (biomass, mist, silicon, metal)
     * @param {string} layer - Layer type ("fill" or "outline")
     * @returns {Object|null} Image cache entry or null if invalid
     */
    function getDepositImageEntry(typeKey, layer) {
        const typeInfo = DEPOSIT_TYPES[typeKey];
        if (!typeInfo) return null;
        const url = layer === "fill" ? typeInfo.fillUrl : typeInfo.outlineUrl;
        if (!url) return null;
        const cacheKey = `${typeKey}:${layer}`;
        let entry = depositImageCache.get(cacheKey);
        if (entry) {
            return entry;
        }
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        entry = { status: "loading", image };
        depositImageCache.set(cacheKey, entry);
        image.onload = () => {
            entry.status = "loaded";
        };
        image.onerror = () => {
            entry.status = "error";
        };
        image.src = url;
        return entry;
    }

    /**
     * Draw an image with color tinting
     * @param {CanvasRenderingContext2D} ctx - Target canvas context
     * @param {HTMLImageElement} image - Source image
     * @param {number} left - Left position
     * @param {number} top - Top position
     * @param {number} size - Size to draw
     * @param {string} color - Tint color
     * @param {number} alpha - Alpha value
     */
    function drawTintedImage(ctx, image, left, top, size, color, alpha) {
        if (!ctx || !image || size <= 0) return;
        const imgWidth = image.naturalWidth || 0;
        const imgHeight = image.naturalHeight || 0;
        if (imgWidth === 0 || imgHeight === 0) return;

        const tintCtx = ensureDepositTintContext(imgWidth, imgHeight);
        if (!tintCtx) {
            ctx.save();
            ctx.globalAlpha = typeof alpha === "number" ? alpha : 1;
            ctx.drawImage(image, left, top, size, size);
            ctx.restore();
            return;
        }

        tintCtx.drawImage(image, 0, 0, imgWidth, imgHeight);
        if (color) {
            tintCtx.globalCompositeOperation = "source-atop";
            tintCtx.fillStyle = color;
            tintCtx.fillRect(0, 0, imgWidth, imgHeight);
        }
        tintCtx.globalCompositeOperation = "source-over";

        ctx.save();
        ctx.globalAlpha = typeof alpha === "number" ? alpha : 1;
        ctx.drawImage(depositTintCanvas, left, top, size, size);
        ctx.restore();
    }

    // Export for use in other modules
    window.ScreepsDepositImageCache = {
        getDepositImageEntry,
        drawTintedImage
    };
})();