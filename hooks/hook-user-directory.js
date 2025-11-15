(function () {
    if (window.__screepsUserDirectoryHookInstalled) return;
    window.__screepsUserDirectoryHookInstalled = true;

    const HOOK_SOURCE = "screeps-hook:user-directory";
    const POLL_INTERVAL_MS = 5000;

    let utils = null;

    let monitoring = false;
    let pollTimer = null;
    let lastSignature = null;

    function log(...args) {
        if (utils && typeof utils.log === "function") {
            utils.log(...args);
        }
    }

    function postHookMessage(payload) {
        if (utils && typeof utils.postMessage === "function") {
            utils.postMessage(payload);
        } else {
            window.postMessage(payload, "*");
        }
    }

    function waitForHookUtils(timeoutMs = 15000, intervalMs = 50) {
        return new Promise((resolve, reject) => {
            if (window.SMOHookUtils) {
                return resolve(window.SMOHookUtils);
            }

            const start = Date.now();
            const timer = setInterval(() => {
                if (window.SMOHookUtils) {
                    clearInterval(timer);
                    return resolve(window.SMOHookUtils);
                }
                if (Date.now() - start >= timeoutMs) {
                    clearInterval(timer);
                    return reject(new Error("SMOHookUtils not detected before timeout"));
                }
            }, intervalMs);
        });
    }

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

        postHookMessage({
            source: HOOK_SOURCE,
            type: "users-update",
            users,
            timestamp: Date.now()
        });
    }

    function scanDirectory() {
        if (!utils) return;
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
        log("[UserDirectory] Monitoring started");
        scanDirectory();
        scheduleNextPoll();
    }

    function stopMonitoring() {
        monitoring = false;
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
        log("[UserDirectory] Monitoring stopped");
    }

    function handleNavigationChange() {
        if (utils && typeof utils.isMapPage === "function" && utils.isMapPage()) {
            startMonitoring();
        } else {
            stopMonitoring();
        }
    }

    function bootstrap() {
        utils.waitForAngular()
            .then(() => {
                log("[UserDirectory] Hook ready (Angular detected)");
                postHookMessage({ source: HOOK_SOURCE, type: "hook-ready" });
                window.addEventListener("hashchange", handleNavigationChange);
                handleNavigationChange();
            })
            .catch((error) => {
                console.warn("[Screeps Overlay][UserDirectory] Angular wait failed", error);
            });
    }

    waitForHookUtils()
        .then((availableUtils) => {
            utils = availableUtils;
            bootstrap();
        })
        .catch((err) => {
            console.warn("[Screeps Overlay][UserDirectory] Hook utilities not found", err);
        });
})();