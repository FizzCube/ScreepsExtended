(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const STORAGE_KEY = "SMO_TERRAIN_CACHE_V1";
    const terrainCacheEntries = loadTerrainCacheEntries();
    const terrainFetchPromises = Object.create(null);
    let terrainCacheSaveTimer = null;
    let terrainReRenderScheduled = false;

    function loadTerrainCacheEntries() {
        const empty = Object.create(null);
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return empty;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return empty;
            const target = Object.create(null);
            Object.keys(parsed).forEach((key) => {
                target[key] = parsed[key];
            });
            return target;
        } catch (err) {
            console.warn("[Screeps Overlay] Failed to load terrain cache", err);
            return empty;
        }
    }

    function scheduleTerrainCacheSave() {
        if (terrainCacheSaveTimer) return;
        terrainCacheSaveTimer = setTimeout(() => {
            terrainCacheSaveTimer = null;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(terrainCacheEntries));
            } catch (err) {
                console.warn("[Screeps Overlay] Failed to persist terrain cache", err);
            }
        }, 500);
    }

    function scheduleTerrainReRender() {
        if (terrainReRenderScheduled) return;
        terrainReRenderScheduled = true;
        window.requestAnimationFrame(() => {
            terrainReRenderScheduled = false;
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        });
    }

    function getTerrainCacheKey(shard, roomName) {
        return `${shard || ""}:${roomName || ""}`;
    }

    function getCachedTerrainString(shard, roomName) {
        const key = getTerrainCacheKey(shard, roomName);
        const entry = terrainCacheEntries[key];
        return entry ? entry.terrain : null;
    }

    function extractTerrainString(response) {
        if (!response || typeof response !== "object") return null;
        if (!Array.isArray(response.terrain) || response.terrain.length === 0) return null;
        const first = response.terrain[0];
        if (!first || typeof first.terrain !== "string") return null;
        return first.terrain;
    }

    function requestTerrainIfMissing(shard, roomName) {
        if (!shard || !roomName) return;
        const key = getTerrainCacheKey(shard, roomName);
        if (terrainCacheEntries[key] || terrainFetchPromises[key]) return;

        const url = `https://screeps.com/api/game/room-terrain?encoded=true&room=${roomName}&shard=${shard}`;

        const fetchPromise = fetch(url, { credentials: "include" })
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error(`Terrain request failed with status ${resp.status}`);
                }
                return resp.json();
            })
            .then((json) => {
                if (json.ok !== 1) {
                    throw new Error("Terrain API returned non-ok response");
                }
                const terrainString = extractTerrainString(json);
                if (!terrainString) {
                    throw new Error("Terrain API returned no terrain string");
                }
                terrainCacheEntries[key] = {
                    terrain: terrainString,
                    fetchedAt: Date.now()
                };
                scheduleTerrainCacheSave();
                scheduleTerrainReRender();
            })
            .catch((err) => {
                console.warn("[Screeps Overlay] Terrain fetch failed", err);
            })
            .finally(() => {
                delete terrainFetchPromises[key];
            });

        terrainFetchPromises[key] = fetchPromise;
    }

    function ensureRoomsQueued(shard, roomNames) {
        if (!Array.isArray(roomNames)) return;
        const unique = new Set(roomNames.filter(Boolean));
        unique.forEach((roomName) => requestTerrainIfMissing(shard, roomName));
    }

    SMO.terrain = {
        getCachedTerrainString,
        ensureRoomsQueued
    };
})();