/**
 * Creep rendering functions
 */
(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const { isCorridorRoom, isMiddleRoom } = window.ScreepsRendererUtils;
    const { getBadgeImageEntry } = window.ScreepsBadgeImageCache;

    /**
     * Draw creeps for a player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} creepPositions - Array of [x, y] positions
     * @param {string} userID - User ID for badge lookup
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    function drawCreeps(ctx, creepPositions, userID, scaleX, scaleY) {
        if (!creepPositions || !Array.isArray(creepPositions)) return;

        const creepSize = Math.min(scaleX, scaleY) * 0.98;
        const badgeSize = creepSize * 0.6;

        // Get username for badge
        const username = SMO.userCache.getUsernameById(userID);
        const badgeEntry = username ? getBadgeImageEntry(username) : null;

        creepPositions.forEach(([x, y]) => {
            const centerX = x * scaleX + scaleX / 2;
            const centerY = y * scaleY + scaleY / 2;

            // Draw black circle for creep body
            ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
            ctx.beginPath();
            ctx.arc(centerX, centerY, creepSize / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Draw light border
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw badge if available
            if (badgeEntry && badgeEntry.status === "loaded" && badgeEntry.image) {
                ctx.drawImage(
                    badgeEntry.image,
                    centerX - badgeSize / 2,
                    centerY - badgeSize / 2,
                    badgeSize,
                    badgeSize
                );
            }
        });
    }

    // Export for use in other modules
    window.ScreepsCreepRenderer = {
        drawCreeps
    };
})();