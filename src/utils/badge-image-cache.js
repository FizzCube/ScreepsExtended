/**
 * Image caching system for user badges
 */
(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const { USER_BADGE_BASE_URL } = window.ScreepsRendererConfig;

    // Initialize cache if it doesn't exist
    const badgeImageCache = SMO.badgeImageCache instanceof Map ? SMO.badgeImageCache : new Map();
    if (!(SMO.badgeImageCache instanceof Map)) {
        SMO.badgeImageCache = badgeImageCache;
    }

    /**
     * Get or create a cached badge image entry
     * @param {string} username - Username to get badge for
     * @returns {Object|null} Image cache entry or null if invalid
     */
    function getBadgeImageEntry(username) {
        if (!username || typeof username !== "string") return null;
        const trimmed = username.trim();
        if (!trimmed) return null;

        let entry = badgeImageCache.get(trimmed);
        if (entry) {
            return entry;
        }

        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";

        entry = { status: "loading", image };
        badgeImageCache.set(trimmed, entry);

        image.onload = () => {
            entry.status = "loaded";
        };

        image.onerror = () => {
            entry.status = "error";
        };

        image.src = `${USER_BADGE_BASE_URL}${encodeURIComponent(trimmed)}`;
        return entry;
    }

    // Export for use in other modules
    window.ScreepsBadgeImageCache = {
        getBadgeImageEntry
    };
})();