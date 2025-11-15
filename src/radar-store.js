(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    console.log("[Screeps Overlay] Radar store initialized");

    function handleRoomMapMessage(channel, payload) {
        // console.log("[Screeps Overlay] Raw message received:", channel, payload);
        
        const match = channel.match(/^roomMap2:([^/]+)\/([EW]\d+[NS]\d+)$/);
        if (!match) {
            // console.log("[Screeps Overlay] Channel didn't match roomMap2 pattern:", channel);
            return;
        }

        const shard = match[1];
        const roomName = match[2];

        // console.log(`[Screeps Overlay] Processing roomMap2 data for ${shard}/${roomName}:`, payload);

        if (!SMO.roomRadarData[shard]) SMO.roomRadarData[shard] = Object.create(null);
        SMO.roomRadarData[shard][roomName] = {
            raw: payload,
            lastUpdated: Date.now()
        };

        const { shard: currentShard, roomName: currentRoom } = SMO.currentRoomState || {};
        if (currentShard === shard && currentRoom) {
            // console.log(`[Screeps Overlay] Triggering render for current room ${currentRoom}`);
            if (typeof SMO.render === "function") {
                SMO.render();
            }
        }
    }

    window.addEventListener(
        "message",
        (event) => {
            if (event.source !== window) return;
            const data = event.data;
            
            // Log all messages from our page hook
            if (data && data.source === "screeps-roommap") {
                // console.log("[Screeps Overlay] Message from page hook:", data);
                handleRoomMapMessage(data.channel, data.payload);
            }
        },
        false
    );

    console.log("[Screeps Overlay] Message listener attached");
})();