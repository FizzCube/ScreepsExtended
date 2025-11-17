(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const STORAGE_KEY = "SMO_ROOM_OBJECTS_V1";
    const MIN_FETCH_INTERVAL_MS = 60 * 1000; // enforce >=60s between fetches per room
    const FETCH_SPACING_MS = 1000; // at most one request per second
    const MAX_CACHED_ROOMS = 120;

    // Keep track of all solid tiles so the overlay can block duplicate markers even
    // when their visuals are rendered by other modules (e.g. walls, power banks).
    const SOLID_STRUCTURE_TYPES = new Set([
        "spawn",
        "extension",
        "tower",
        "storage",
        "terminal",
        "link",
        "lab",
        "factory",
        "powerSpawn",
        "nuker",
        "observer",
        "constructedWall",
        "rampart",
        "controller",
        "extractor",
        "powerBank",
        "invaderCore"
    ]);

    const roomObjectEntries = loadStoredEntries();
    const fetchQueue = [];
    const queuedKeys = new Set();
    const recentFetchAttempts = Object.create(null);

    let fetchInProgress = false;
    let fetchCooldownTimer = null;
    let lastFetchCompletedAt = 0;
    let saveTimer = null;
    let reRenderScheduled = false;

    function getRoomCacheKey(shard, roomName) {
        if (!shard || !roomName) return null;
        return `${shard}:${roomName}`;
    }

    function loadStoredEntries() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return Object.create(null);
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return Object.create(null);
            const target = Object.create(null);
            Object.keys(parsed).forEach((key) => {
                const entry = parsed[key];
                if (!entry || typeof entry !== "object") return;
                target[key] = normalizeEntry(entry);
            });
            return target;
        } catch (err) {
            console.warn("[Screeps Overlay] Failed to load room object cache", err);
            return Object.create(null);
        }
    }

    function normalizeEntry(entry) {
        return {
            shard: entry.shard || null,
            roomName: entry.roomName || null,
            fetchedAt: entry.fetchedAt || 0,
            solidsByType: entry.solidsByType || Object.create(null),
            coordLookup: entry.coordLookup || Object.create(null)
        };
    }

    function scheduleEntrySave() {
        if (saveTimer) return;
        saveTimer = setTimeout(() => {
            saveTimer = null;
            try {
                const serialized = serializeEntries();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
            } catch (err) {
                console.warn("[Screeps Overlay] Failed to persist room object cache", err);
            }
        }, 1000);
    }

    function serializeEntries() {
        const serialized = Object.create(null);
        Object.keys(roomObjectEntries).forEach((key) => {
            const entry = roomObjectEntries[key];
            if (!entry) return;
            serialized[key] = {
                shard: entry.shard,
                roomName: entry.roomName,
                fetchedAt: entry.fetchedAt,
                solidsByType: entry.solidsByType,
                coordLookup: entry.coordLookup
            };
        });
        return serialized;
    }

    function scheduleReRender() {
        if (reRenderScheduled) return;
        reRenderScheduled = true;
        window.requestAnimationFrame(() => {
            reRenderScheduled = false;
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        });
    }

    function enqueueRooms(shard, roomNames) {
        if (!shard || !Array.isArray(roomNames)) return;
        const now = Date.now();
        roomNames.forEach((roomName) => {
            if (!roomName) return;
            const cacheKey = getRoomCacheKey(shard, roomName);
            if (!cacheKey) return;

            const entry = roomObjectEntries[cacheKey];
            const lastSuccess = entry ? entry.fetchedAt : 0;
            const lastAttempt = recentFetchAttempts[cacheKey] || 0;
            if (now - Math.max(lastSuccess, lastAttempt) < MIN_FETCH_INTERVAL_MS) {
                return;
            }
            if (queuedKeys.has(cacheKey)) {
                return;
            }

            fetchQueue.push({ shard, roomName, cacheKey });
            queuedKeys.add(cacheKey);
        });
        processFetchQueue();
    }

    function processFetchQueue() {
        if (fetchInProgress) return;
        if (fetchQueue.length === 0) return;

        const now = Date.now();
        if (lastFetchCompletedAt) {
            const elapsed = now - lastFetchCompletedAt;
            if (elapsed < FETCH_SPACING_MS) {
                if (!fetchCooldownTimer) {
                    fetchCooldownTimer = setTimeout(() => {
                        fetchCooldownTimer = null;
                        processFetchQueue();
                    }, FETCH_SPACING_MS - elapsed);
                }
                return;
            }
        }

        const next = fetchQueue.shift();
        queuedKeys.delete(next.cacheKey);
        if (fetchCooldownTimer) {
            clearTimeout(fetchCooldownTimer);
            fetchCooldownTimer = null;
        }
        fetchInProgress = true;
        recentFetchAttempts[next.cacheKey] = Date.now();

        fetchRoomObjects(next.shard, next.roomName, next.cacheKey)
            .catch((err) => {
                console.warn(`[Screeps Overlay] Room objects fetch failed for ${next.shard}/${next.roomName}`, err);
            })
            .finally(() => {
                fetchInProgress = false;
                lastFetchCompletedAt = Date.now();
                processFetchQueue();
            });
    }

    function fetchRoomObjects(shard, roomName, cacheKey) {
        const url = `https://screeps.com/api/game/room-objects?encoded=false&room=${roomName}&shard=${shard}`;
        return fetch(url, { credentials: "include" })
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error(`Room objects request failed with status ${resp.status}`);
                }
                return resp.json();
            })
            .then((json) => {
                if (!json || json.ok !== 1 || !Array.isArray(json.objects)) {
                    throw new Error("Room objects API returned unexpected payload");
                }
                const { solidsByType, coordLookup } = extractSolidStructures(json.objects);
                roomObjectEntries[cacheKey] = {
                    shard,
                    roomName,
                    fetchedAt: Date.now(),
                    solidsByType,
                    coordLookup
                };
                pruneCache();
                scheduleEntrySave();
                scheduleReRender();
            });
    }

    function extractSolidStructures(objects) {
        const solidsByType = Object.create(null);
        const coordLookup = Object.create(null);

        objects.forEach((obj) => {
            if (!obj || typeof obj !== "object") return;
            const { type, x, y } = obj;
            if (!SOLID_STRUCTURE_TYPES.has(type)) return;
            if (typeof x !== "number" || typeof y !== "number") return;

            if (!solidsByType[type]) {
                solidsByType[type] = [];
            }

            const payload = {
                x,
                y,
                user: obj.user || null
            };
            solidsByType[type].push(payload);

            const positionKey = `${x},${y}`;
            if (!coordLookup[positionKey]) {
                coordLookup[positionKey] = [];
            }
            coordLookup[positionKey].push(type);
        });

        return { solidsByType, coordLookup };
    }

    function pruneCache() {
        const keys = Object.keys(roomObjectEntries);
        if (keys.length <= MAX_CACHED_ROOMS) return;
        keys.sort((a, b) => {
            const aEntry = roomObjectEntries[a];
            const bEntry = roomObjectEntries[b];
            return (aEntry ? aEntry.fetchedAt : 0) - (bEntry ? bEntry.fetchedAt : 0);
        });
        while (keys.length > MAX_CACHED_ROOMS) {
            const oldestKey = keys.shift();
            if (oldestKey) {
                delete roomObjectEntries[oldestKey];
            }
        }
    }

    function getSolidStructures(shard, roomName) {
        const key = getRoomCacheKey(shard, roomName);
        if (!key) return null;
        const entry = roomObjectEntries[key];
        return entry ? entry.solidsByType : null;
    }

    function getSolidStructureLookup(shard, roomName) {
        const key = getRoomCacheKey(shard, roomName);
        if (!key) return null;
        const entry = roomObjectEntries[key];
        return entry ? entry.coordLookup : null;
    }

    function getRoomObjectsMetadata(shard, roomName) {
        const key = getRoomCacheKey(shard, roomName);
        if (!key) return null;
        const entry = roomObjectEntries[key];
        if (!entry) return null;
        return {
            fetchedAt: entry.fetchedAt,
            shard: entry.shard,
            roomName: entry.roomName
        };
    }

    function clearRoomObjectsCache() {
        Object.keys(roomObjectEntries).forEach((key) => delete roomObjectEntries[key]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.warn("[Screeps Overlay] Failed to clear room object cache", err);
        }
    }

    SMO.roomObjects = {
        ensureRoomsQueued: enqueueRooms,
        getSolidStructures,
        getSolidStructureLookup,
        getRoomObjectsMetadata,
        clear: clearRoomObjectsCache
    };
})();