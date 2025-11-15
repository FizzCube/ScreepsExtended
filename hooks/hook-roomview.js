(function () {
    if (window.__screepsRoomViewHookInstalled) return;
    window.__screepsRoomViewHookInstalled = true;

    const HOOK_SOURCE = "screeps-hook:room-view";
    let utils = null;

    function log(...args) {
        if (utils && typeof utils.log === "function") {
            utils.log(...args);
        }
    }

    function postRoomViewEvent(type, extra = {}) {
        const payload = {
            source: HOOK_SOURCE,
            type,
            timestamp: Date.now(),
            ...extra
        };
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

    // Minimal: patch prototype $broadcast to detect 'resize' / zoom broadcasts and trigger SMO.render() immediately
    function patchBroadcastProtoToTriggerRender(scopeExample) {
        try {
            if (!scopeExample) return;
            const proto = Object.getPrototypeOf(scopeExample);
            if (!proto || proto.__smo_broadcast_proto_patched) return;
            if (typeof proto.$broadcast !== 'function') return;

            proto.__smo_broadcast_proto_patched = true;
            const origProtoBroadcast = proto.$broadcast;

            proto.$broadcast = function (name) {
                try {
                    if (name === 'resize' || name === 'zoom' || name === 'zoom:changed') {
                        // Only trigger overlay render when in room view
                        if (utils && typeof utils.isRoomPage === 'function' && utils.isRoomPage()) {
                            postRoomViewEvent('broadcast-detected', { name });
                        }
                    }
                } catch (err) { }
                return origProtoBroadcast.apply(this, arguments);
            };
        } catch (err) {
            // nothing
        }
    }

    function initBroadcastPatch() {
        // Find any scope instance and patch its prototype for broadcasts
        try {
            const el = document.querySelector('.ng-scope') || document.body;
            const scope = window.angular && window.angular.element ? window.angular.element(el).scope() : null;
            if (!scope) return;
            patchBroadcastProtoToTriggerRender(scope);
        } catch (err) {
            // ignore
        }
    }

    function startMonitoring() {
        log('[RoomView Hook] Starting monitoring (minimal)');
        initBroadcastPatch();

        window.addEventListener('hashchange', () => {
            // Reinitialize when navigation changes; patch again if needed
            if (utils && typeof utils.isRoomPage === 'function' && utils.isRoomPage()) initBroadcastPatch();
        });

        const observer = new MutationObserver(() => {
            if (utils && typeof utils.isRoomPage === 'function' && utils.isRoomPage()) initBroadcastPatch();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function bootstrap() {
        utils.waitForAngular()
            .then(() => {
                log('[RoomView Hook] Angular detected, starting (minimal patch)');
                startMonitoring();
            })
            .catch((err) => {
                console.warn('[Screeps Overlay][RoomView] Angular wait failed', err);
            });
    }

    waitForHookUtils()
        .then((availableUtils) => {
            utils = availableUtils;
            bootstrap();
        })
        .catch((err) => {
            console.warn('[Screeps Overlay][RoomView] Hook utilities not found', err);
        });
})();
