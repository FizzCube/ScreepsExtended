/**
 * Configuration constants for the renderer
 */

/**
 * Reserved radar data keys that should not be treated as player data
 */
const RESERVED_RADAR_KEYS = new Set(["w", "r", "s", "m", "k", "pb", "p", "c"]);

/**
 * Visual styles for different structure/object types
 */
const TYPE_STYLES = {
    w: { radius: 0.8, fill: "rgba(200, 200, 200, 0.7)" },
    r: { radius: 1, fill: "rgba(150, 150, 150, 0.7)" },
    s: { radius: 0.8, fill: "rgba(255, 215, 0, 0.9)" },
    m: { radius: 1, fill: "rgba(100, 100, 100, 0.9)", outline: "rgba(200, 200, 200, 0.8)" },
    k: { radius: 0.8, fill: "rgba(255, 150, 0, 0.9)" },
    pb: { radius: 1, fill: "rgba(255, 0, 0, 0.9)" },
    p: { radius: 0.8, fill: "rgba(70, 150, 216, 0.9)" },
    c: {
        size: 1.2,
        fill: "rgba(0, 0, 0, 1)",
        innerFill: "rgba(60, 60, 60, 1)",
        innerScale: 0.5,
        glow: "rgba(180, 180, 180, 0.2)",
        glowOffset: 0.2
    },
    player: { radius: 0.7, fill: "rgba(0, 255, 0, 0.9)" },
    invader: { 
        radius: 0.8, 
        fill: "rgba(255, 50, 50, 0.9)", 
        outline: "rgba(200, 0, 0, 1)",
        imageUrl: "https://screeps.com/a/vendor/renderer/metadata/creep-npc.svg"
    },
    sourcekeeper: { 
        radius: 0.8, 
        fill: "rgba(255, 150, 0, 0.9)", 
        outline: "rgba(200, 100, 0, 1)",
        imageUrl: "https://screeps.com/a/vendor/renderer/metadata/creep-npc.svg"
    }
};

/**
 * Configuration for different deposit types in highway rooms
 */
const DEPOSIT_TYPES = {
    biomass: {
        fillUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-biomass-fill.svg",
        outlineUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-biomass.svg",
        fillColor: "rgba(70, 200, 120, 1)",
        outlineColor: "rgba(50, 180, 105, 1)",
        fillAlpha: 0.45,
        outlineAlpha: 0.95,
        size: 2.4
    },
    mist: {
        fillUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-mist-fill.svg",
        outlineUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-mist.svg",
        fillColor: "rgba(180, 110, 255, 1)",
        outlineColor: "rgba(150, 80, 220, 1)",
        fillAlpha: 0.45,
        outlineAlpha: 0.95,
        size: 2.4
    },
    silicon: {
        fillUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-silicon-fill.svg",
        outlineUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-silicon.svg",
        fillColor: "rgba(110, 170, 255, 1)",
        outlineColor: "rgba(80, 135, 215, 1)",
        fillAlpha: 0.45,
        outlineAlpha: 0.95,
        size: 2.4
    },
    metal: {
        fillUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-metal-fill.svg",
        outlineUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-metal.svg",
        fillColor: "rgba(180, 120, 60, 1)",
        outlineColor: "rgba(150, 95, 40, 1)",
        fillAlpha: 0.45,
        outlineAlpha: 0.95,
        size: 2.4
    }
};

/**
 * Connection patterns for roads (for drawing connected road networks)
 */
const ROAD_CONNECTIONS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
];

/**
 * Neighbor offsets for checking road connectivity
 */
const ROAD_NEIGHBOUR_OFFSETS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
];

/**
 * Connection patterns for walls
 */
const WALL_CONNECTIONS = [
    [1, 0],
    [0, 1]
];

/**
 * Neighbor offsets for checking wall connectivity
 */
const WALL_NEIGHBOUR_OFFSETS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
];

/**
 * Base URL for user badge images
 */
const USER_BADGE_BASE_URL = "https://screeps.com/api/user/badge-svg?username=";

// Export for use in other modules
window.ScreepsRendererConfig = {
    RESERVED_RADAR_KEYS,
    TYPE_STYLES,
    DEPOSIT_TYPES,
    ROAD_CONNECTIONS,
    ROAD_NEIGHBOUR_OFFSETS,
    WALL_CONNECTIONS,
    WALL_NEIGHBOUR_OFFSETS,
    USER_BADGE_BASE_URL
};