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
 * Check if a coordinate is a terrain wall
 * @param {string} terrainString - The terrain string for the room
 * @param {number} x - X coordinate (0-49)
 * @param {number} y - Y coordinate (0-49)
 * @returns {boolean} True if the coordinate is a wall
 */
function isTerrainWall(terrainString, x, y) {
    if (!terrainString || x < 0 || x >= 50 || y < 0 || y >= 50) return false;
    const idx = y * 50 + x;
    const tileCode = terrainString.charCodeAt(idx) - 48;
    return tileCode === 1;
}

/**
 * Build a lookup set of all terrain wall coordinates in a room
 * @param {string} terrainString - The terrain string for the room
 * @returns {Set<string>} Set of coordinate keys for wall positions
 */
function buildTerrainWallLookup(terrainString) {
    const wallLookup = new Set();
    if (!terrainString) return wallLookup;
    
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            if (isTerrainWall(terrainString, x, y)) {
                wallLookup.add(coordKey(x, y));
            }
        }
    }
    return wallLookup;
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
    inferCorridorDepositType,
    isTerrainWall,
    buildTerrainWallLookup
};