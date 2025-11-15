(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    function detectCurrentRoomFromHash() {
        const hash = window.location.hash || "";
        const match = hash.match(/#!\/room\/([^/]+)\/([EW]\d+[NS]\d+)/);
        if (!match) return null;
        return { shard: match[1], roomName: match[2] };
    }

    function roomNameToWorldCoords(name) {
        const m = name.match(/^([EW])(\d+)([NS])(\d+)$/);
        if (!m) return null;
        const [, horDir, horNumStr, verDir, verNumStr] = m;
        let x = parseInt(horNumStr, 10);
        let y = parseInt(verNumStr, 10);
        if (horDir === "W") x = -x - 1;
        if (verDir === "N") y = -y - 1;
        return { x, y };
    }

    function worldCoordsToRoomName(x, y) {
        const horDir = x < 0 ? "W" : "E";
        const verDir = y < 0 ? "N" : "S";
        const horNum = horDir === "W" ? -x - 1 : x;
        const verNum = verDir === "N" ? -y - 1 : y;
        return `${horDir}${horNum}${verDir}${verNum}`;
    }

    function computeNeighbourRooms(roomName) {
        const coords = roomNameToWorldCoords(roomName);
        if (!coords) return [];
        const results = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = coords.x + dx;
                const ny = coords.y + dy;
                const neighbourName = worldCoordsToRoomName(nx, ny);
                results.push({ dx, dy, roomName: neighbourName });
            }
        }
        return results;
    }

    SMO.rooms = {
        detectCurrentRoomFromHash,
        computeNeighbourRooms
    };
})();