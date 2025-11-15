(function () {
    if (window.SMOHookUtils) return;

    const LOG_PREFIX = "[Screeps Overlay][Hook]";
    // Per-page debug toggle; set via injected script or via content script using SMO.setDebug
    let DEBUG = !!(window.SMOHookUtils && window.SMOHookUtils.debug);

    function setDebug(enabled) {
        DEBUG = !!enabled;
        try { window.SMOHookUtils.debug = DEBUG; } catch (e) { }
    }

    function log(...args) {
        if (!DEBUG) return;
        console.log(LOG_PREFIX, ...args);
    }

    function waitForAngular(timeoutMs = 15000, intervalMs = 100) {
        return new Promise((resolve, reject) => {
            const start = Date.now();

            function check() {
                if (window.angular && window.angular.element) {
                    return resolve(window.angular);
                }
                if (Date.now() - start >= timeoutMs) {
                    return reject(new Error("Angular was not detected before timeout"));
                }
                setTimeout(check, intervalMs);
            }

            check();
        });
    }

    function getAngularScopeBySelector(selector) {
        if (!window.angular || !window.angular.element) return null;
        try {
            const el = document.querySelector(selector);
            if (!el) return null;
            return window.angular.element(el).scope();
        } catch (error) {
            return null;
        }
    }

    function getAngularScopeByClass(className) {
        return getAngularScopeBySelector(`.${className}.ng-scope`);
    }

    function deepGet(obj, path) {
        if (!obj || !path) return obj;
        const segments = path.split(".");
        let target = obj;
        for (let i = 0; i < segments.length; i++) {
            if (!target) return undefined;
            target = target[segments[i]];
        }
        return target;
    }

    function isMapPage() {
        const hash = window.location.hash || "";
        return hash.includes("#!/map");
    }

    function isRoomPage() {
        const hash = window.location.hash || "";
        return hash.includes("#!/room/");
    }

    function postMessage(payload) {
        window.postMessage(payload, "*");
    }

    window.SMOHookUtils = {
        log,
        waitForAngular,
        getAngularScopeBySelector,
        getAngularScopeByClass,
        deepGet,
        isMapPage,
        isRoomPage,
        setDebug,
        get debug() { return DEBUG; },
        postMessage
    };

    log("Utilities ready");
})();