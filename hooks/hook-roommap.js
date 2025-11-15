(function () {
    if (window.__screepsRoomMapHookInstalled) return;
    window.__screepsRoomMapHookInstalled = true;

    const utils = window.SMOHookUtils;
    const log = utils && utils.log ? utils.log : console.log.bind(console, "[Screeps Overlay]");

    log("[RoomMap Hook] Installing...");

    const OriginalWebSocket = window.WebSocket;

    function unwrapScreepsData(data) {
        if (typeof data !== "string") return null;

        const safeParse = (value) => {
            try {
                return JSON.parse(value);
            } catch {
                return null;
            }
        };

        let outer = safeParse(data);
        if (!outer && data.startsWith("a[")) {
            outer = safeParse(data.slice(1));
        }

        if (!outer) return null;

        if (Array.isArray(outer) && typeof outer[0] === "string" && outer[0].startsWith("roomMap2:")) {
            return outer;
        }

        if (
            Array.isArray(outer) &&
            outer.length === 1 &&
            typeof outer[0] === "string" &&
            outer[0].startsWith('["roomMap2:')
        ) {
            return safeParse(outer[0]);
        }

        return null;
    }

    function WrappedWebSocket(url, protocols) {
        const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

        try {
            if (typeof url === "string" && url.includes("/socket/")) {
                log("[RoomMap Hook] WebSocket hook attached to:", url);

                ws.addEventListener("message", (evt) => {
                    const parsed = unwrapScreepsData(evt.data);
                    if (!parsed) return;

                    const [channel, payload] = parsed;
                    if (typeof channel !== "string" || !channel.startsWith("roomMap2:")) return;

                    window.postMessage(
                        {
                            source: "screeps-roommap",
                            channel,
                            payload
                        },
                        "*"
                    );
                });
            }
        } catch (error) {
            console.warn("[Screeps Overlay] Error wiring WebSocket listener:", error);
        }

        return ws;
    }

    Object.keys(OriginalWebSocket).forEach((key) => {
        try {
            WrappedWebSocket[key] = OriginalWebSocket[key];
        } catch {}
    });

    WrappedWebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket = WrappedWebSocket;

    log("[RoomMap Hook] Installed successfully");
})();