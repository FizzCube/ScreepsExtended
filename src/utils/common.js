/**
 * Common utility functions shared across the renderer modules
 */

/**
 * Create a coordinate key for lookup purposes
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} Coordinate key in format "x,y"
 */
function coordKey(x, y) {
    return `${x},${y}`;
}

/**
 * Normalize an array of coordinate points and create a lookup set
 * @param {Array} points - Array of [x, y] coordinate tuples
 * @returns {Object} Object with coords array and lookup Set
 */
function normalizePointList(points) {
    const coords = [];
    const lookup = new Set();
    if (!Array.isArray(points)) {
        return { coords, lookup };
    }
    for (const tuple of points) {
        if (!tuple || tuple.length < 2) continue;
        const x = tuple[0];
        const y = tuple[1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const key = coordKey(x, y);
        if (lookup.has(key)) continue;
        lookup.add(key);
        coords.push([x, y]);
    }
    return { coords, lookup };
}

/**
 * Parse a Screeps room name into its components
 * @param {string} roomName - Room name like "W1N1" or "E2S3"
 * @returns {Object|null} Parsed room info or null if invalid
 */
function parseRoomName(roomName) {
    if (typeof roomName !== "string") return null;
    const match = /^([WE])(\d+)([NS])(\d+)$/.exec(roomName);
    if (!match) return null;
    return {
        weDir: match[1],
        weCoord: Number(match[2]),
        nsDir: match[3],
        nsCoord: Number(match[4])
    };
}

/**
 * Check if a room is a corridor room (highway)
 * @param {string} roomName - Room name to check
 * @returns {boolean|null} True if corridor, false if not, null if invalid
 */
function isCorridorRoom(roomName) {
    const parsed = parseRoomName(roomName);
    if (!parsed) return null;
    const isCorridor = parsed.weCoord % 10 === 0 || parsed.nsCoord % 10 === 0;
    return isCorridor;
}

/**
 * Infer the deposit type for a corridor room based on its coordinates
 * @param {string} roomName - Room name to analyze
 * @returns {string|null} Deposit type or null if not applicable
 */
function inferCorridorDepositType(roomName) {
    const parsed = parseRoomName(roomName);
    if (!parsed) return null;
    const isCorridor = isCorridorRoom(roomName);
    if (!isCorridor) return null;
    const combo = `${parsed.weDir}${parsed.nsDir}`;
    switch (combo) {
        case "ES":
            return "biomass";
        case "WS":
            return "metal";
        case "WN":
            return "silicon";
        case "EN":
            return "mist";
        default:
            return null;
    }
}

// Export for use in other modules
window.ScreepsRendererUtils = {
    coordKey,
    normalizePointList,
    parseRoomName,
    isCorridorRoom,
    inferCorridorDepositType
};