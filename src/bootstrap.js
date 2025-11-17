(() => {
    const namespace = "ScreepsMinimalOverlay";
    const existing = window[namespace];
    if (existing && existing.initialized) {
        return;
    }

    const SMO = (window[namespace] = existing || {});
    SMO.initialized = true;
    SMO.currentRoomState = { shard: null, roomName: null };
    SMO.roomRadarData = Object.create(null);
    // Central configuration and debug toggle
    SMO.config = SMO.config || {};
    SMO.config.debug = SMO.config.debug || true;

    /**
     * Set the debug toggle for content-script logging and the injected page hooks.
     * When enabled, the content script will log additional diagnostic output and
     * the injected hook utilities will be asked to enable their own page-context logging.
     */
    SMO.setDebug = function (enabled) {
        SMO.config.debug = !!enabled;
        try {
            // Inject a small script into the page to update page-scope hook utils debug flag.
            // Do NOT create the `SMOHookUtils` object to avoid blocking the hook script which
            // checks `if (window.SMOHookUtils) return;` on load. Only set debug if the object
            // already exists in the page context.
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = `if (window.SMOHookUtils && typeof window.SMOHookUtils === 'object') { try { window.SMOHookUtils.debug = ${!!enabled}; if (typeof window.SMOHookUtils.setDebug === 'function') window.SMOHookUtils.setDebug(${!!enabled}); } catch (e) { } }`;
            (document.head || document.documentElement).appendChild(script);
            script.remove();
        } catch (e) {
            // ignore errors setting page-scope flag
        }
    };

    const hookScripts = [
        "hooks/hook-utils.js",
        "hooks/hook-roommap.js",
        "hooks/hook-user-directory.js",
        "hooks/hook-roomview.js"
    ];

    function injectHook(path) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(path);
        script.type = "text/javascript";
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    }

    hookScripts.forEach(injectHook);
})();