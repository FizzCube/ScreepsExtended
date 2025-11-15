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

    const hookScripts = [
        "hooks/hook-utils.js",
        "hooks/hook-roommap.js",
        "hooks/hook-user-directory.js"
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