/**
 * NPC renderer for invaders and source keepers
 */
(() => {
    const { TYPE_STYLES } = window.ScreepsRendererConfig;
    
    // Cache for loaded NPC images
    const imageCache = new Map();
    const imageLoadPromises = new Map();

    /**
     * Load an NPC image and cache it
     * @param {string} url - Image URL to load
     * @returns {Promise<HTMLImageElement>} Promise that resolves to the loaded image
     */
    function loadNPCImage(url) {
        if (imageCache.has(url)) {
            return Promise.resolve(imageCache.get(url));
        }

        if (imageLoadPromises.has(url)) {
            return imageLoadPromises.get(url);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                imageCache.set(url, img);
                imageLoadPromises.delete(url);
                resolve(img);
            };
            img.onerror = () => {
                imageLoadPromises.delete(url);
                reject(new Error(`Failed to load NPC image: ${url}`));
            };
            img.src = url;
        });

        imageLoadPromises.set(url, promise);
        return promise;
    }

    /**
     * Draw NPC structures (invaders and source keepers)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} points - Array of [x, y] coordinates
     * @param {string} npcType - Type of NPC ("invader" or "sourcekeeper")
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawNPCs(ctx, points, npcType, scaleX, scaleY) {
        if (!Array.isArray(points) || points.length === 0) return;

        const imageUrl = "https://screeps.com/a/vendor/renderer/metadata/creep-npc.svg";
        const size = Math.min(scaleX, scaleY) * 1.2; // Make NPCs slightly larger than regular structures

        // Try to draw with image, fallback to colored circles
        if (imageCache.has(imageUrl)) {
            const img = imageCache.get(imageUrl);
            drawNPCsWithImage(ctx, points, img, size, scaleX, scaleY, npcType);
        } else {
            // Load image asynchronously for future use
            loadNPCImage(imageUrl).catch(() => {
                // Silently fail - we'll use fallback rendering
            });
            
            // Use fallback rendering
            drawNPCsFallback(ctx, points, npcType, scaleX, scaleY);
        }
    }

    /**
     * Draw NPCs using the loaded image
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} points - Array of [x, y] coordinates
     * @param {HTMLImageElement} img - Loaded NPC image
     * @param {number} size - Size to draw the image
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {string} npcType - Type of NPC for color tinting
     */
    function drawNPCsWithImage(ctx, points, img, size, scaleX, scaleY, npcType) {
        ctx.save();
        
        for (const [x, y] of points) {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            
            // Add a subtle colored background circle to distinguish NPC types
            ctx.fillStyle = npcType === "invader" ? "rgba(255, 100, 100, 0.3)" : "rgba(255, 150, 0, 0.3)";
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw the NPC image
            ctx.drawImage(
                img,
                cx - size / 2,
                cy - size / 2,
                size,
                size
            );
        }
        
        ctx.restore();
    }

    /**
     * Draw NPCs using fallback colored circles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} points - Array of [x, y] coordinates
     * @param {string} npcType - Type of NPC
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawNPCsFallback(ctx, points, npcType, scaleX, scaleY) {
        const style = TYPE_STYLES[npcType] || TYPE_STYLES.invader;
        const radius = ((style.radius * scaleX) || scaleX) * 0.5;
        
        ctx.save();
        ctx.fillStyle = style.fill;
        if (style.outline) {
            ctx.strokeStyle = style.outline;
            ctx.lineWidth = Math.max(1, radius * 0.2);
        }
        
        for (const [x, y] of points) {
            const cx = (x + 0.5) * scaleX;
            const cy = (y + 0.5) * scaleY;
            
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
            if (style.outline) {
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }

    // Export for use in other modules
    window.ScreepsNPCRenderer = {
        drawNPCs
    };
})();