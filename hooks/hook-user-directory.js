(function () {
    if (window.__screepsUserDirectoryHookInstalled) return;
    window.__screepsUserDirectoryHookInstalled = true;

    const utils = window.SMOHookUtils;
    if (!utils) {
        console.warn("[Screeps Overlay][UserDirectory] Hook utilities not found");
        return;
    }

    const HOOK_SOURCE = "screeps-hook:user-directory";
    const POLL_INTERVAL_MS = 5000;

    let monitoring = false;
    let pollTimer = null;
    let lastSignature = null;

    function extractUsers(roomUsers) {
        const result = Object.create(null);
        let count = 0;

        if (!roomUsers || typeof roomUsers !== "object") return { users: result, userCount: 0 };

        Object.keys(roomUsers).forEach((userId) => {
            const entry = roomUsers[userId];
            if (!entry || typeof entry !== "object") return;

            const username = entry.username;
            if (!username || typeof username !== "string") return;

            result[userId] = username;
            count++;
        });

        return { users: result, userCount: count };
    }

    function buildSignature(users) {
        return Object.keys(users)
            .sort()
            .map((id) => `${id}:${users[id]}`)
            .join("|");
    }

    function emitUsers(users) {
        const signature = buildSignature(users);
        if (signature === lastSignature) return;
        lastSignature = signature;

        utils.postMessage({
            source: HOOK_SOURCE,
            type: "users-update",
            users,
            timestamp: Date.now()
        });
    }

    function scanDirectory() {
        const scope = utils.getAngularScopeByClass("page-content");
        if (!scope) return;

        const roomUsers = utils.deepGet(scope, "WorldMap.roomUsers");
        const { users, userCount } = extractUsers(roomUsers);

        if (userCount > 0) {
            emitUsers(users);
        }
    }

    function scheduleNextPoll() {
        if (!monitoring) return;
        pollTimer = setTimeout(() => {
            try {
                scanDirectory();
            } catch (error) {
                console.warn("[Screeps Overlay][UserDirectory] scan error", error);
            }
            scheduleNextPoll();
        }, POLL_INTERVAL_MS);
    }

    function startMonitoring() {
        if (monitoring) return;
        monitoring = true;
        utils.log("[UserDirectory] Monitoring started");
        scanDirectory();
        scheduleNextPoll();
    }

    function stopMonitoring() {
        monitoring = false;
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
        utils.log("[UserDirectory] Monitoring stopped");
    }

    function handleNavigationChange() {
        if (utils.isMapPage()) {
            startMonitoring();
        } else {
            stopMonitoring();
        }
    }

    utils.waitForAngular()
        .then(() => {
            utils.log("[UserDirectory] Hook ready (Angular detected)");
            utils.postMessage({ source: HOOK_SOURCE, type: "hook-ready" });
            window.addEventListener("hashchange", handleNavigationChange);
            handleNavigationChange();
        })
        .catch((error) => {
            console.warn("[Screeps Overlay][UserDirectory] Angular wait failed", error);
        });
})();