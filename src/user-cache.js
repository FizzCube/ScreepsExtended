(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const STORAGE_KEY = "SMO_USER_CACHE_V1";
    const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
    const HOOK_SOURCE = "screeps-hook:user-directory";

    let cacheUpdateTimer = null;
    let cacheLastUpdated = 0;
    let userCache = loadUserCache();

    function loadUserCache() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return Object.create(null);

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return Object.create(null);

            cacheLastUpdated = parsed.lastUpdated || 0;
            const cacheAge = Date.now() - cacheLastUpdated;
            if (cacheAge > CACHE_EXPIRY_MS) {
                console.log("[Screeps Overlay] User cache expired, clearing");
                cacheLastUpdated = 0;
                return Object.create(null);
            }

            return parsed.users || Object.create(null);
        } catch (err) {
            console.warn("[Screeps Overlay] Failed to load user cache:", err);
            cacheLastUpdated = 0;
            return Object.create(null);
        }
    }

    function saveUserCache() {
        if (cacheUpdateTimer) return;
        cacheUpdateTimer = setTimeout(() => {
            cacheUpdateTimer = null;
            try {
                cacheLastUpdated = Date.now();
                const data = {
                    users: userCache,
                    lastUpdated: cacheLastUpdated
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                console.log(`[Screeps Overlay] Saved ${Object.keys(userCache).length} users to cache`);
            } catch (err) {
                console.warn("[Screeps Overlay] Failed to save user cache:", err);
            }
        }, 1000);
    }

    function mergeUsersFromHook(usersFromHook) {
        if (!usersFromHook || typeof usersFromHook !== "object") {
            return 0;
        }

        const newUsers = Object.create(null);
        let userCount = 0;

        Object.keys(usersFromHook).forEach((userId) => {
            const username = usersFromHook[userId];
            if (!username || typeof username !== "string") return;

            if (!userCache[userId] || userCache[userId] !== username) {
                newUsers[userId] = username;
                userCount++;
            }
        });

        if (userCount === 0) {
            return 0;
        }

        Object.keys(newUsers).forEach((userId) => {
            userCache[userId] = newUsers[userId];
        });

        saveUserCache();
        return userCount;
    }

    function handleHookMessage(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== HOOK_SOURCE) return;

        if (data.type === "hook-ready") {
            console.log("[Screeps Overlay] User directory hook ready");
            return;
        }

        if (data.type !== "users-update") return;

        try {
            const updates = mergeUsersFromHook(data.users);
            if (updates > 0) {
                console.log(`[Screeps Overlay] User cache updated with ${updates} entries from hook`);
            }
        } catch (error) {
            console.warn("[Screeps Overlay] Failed to process user update:", error);
        }
    }

    window.addEventListener("message", handleHookMessage, false);

    // Public API
    function getUsernameById(userId) {
        if (!userId || typeof userId !== "string") return null;
        return userCache[userId] || null;
    }

    function getAllCachedUsers() {
        return { ...userCache };
    }

    function getCacheStats() {
        return {
            userCount: Object.keys(userCache).length,
            lastUpdated: cacheLastUpdated || null
        };
    }

    function clearCache() {
        userCache = Object.create(null);
        cacheLastUpdated = 0;
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log("[Screeps Overlay] User cache cleared");
        } catch (err) {
            console.warn("[Screeps Overlay] Failed to clear user cache:", err);
        }
    }

    // Expose API
    SMO.userCache = {
        getUsernameById,
        getAllCachedUsers,
        getCacheStats,
        clearCache
    };

    console.log(`[Screeps Overlay] User cache initialized with ${Object.keys(userCache).length} cached users`);
})();