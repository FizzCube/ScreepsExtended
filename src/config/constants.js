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

const SOLID_STRUCTURE_STYLES = {
    spawn: { shape: "circle", radius: 1, fill: "rgba(124, 226, 164, 0.95)", outline: "rgba(19, 120, 63, 0.9)", shadow: "rgba(124, 226, 164, 0.4)" },
    extension: { shape: "circle", radius: 0.7, fill: "rgba(255, 150, 210, 0.95)", outline: "rgba(139, 30, 90, 0.9)" },
    tower: { shape: "hex", radius: 0.85, fill: "rgba(170, 200, 255, 0.95)", outline: "rgba(70, 90, 160, 0.9)" },
    storage: { shape: "square", size: 0.95, fill: "rgba(150, 110, 70, 0.95)", outline: "rgba(90, 60, 30, 0.9)" },
    terminal: { shape: "diamond", size: 0.95, fill: "rgba(230, 170, 255, 0.95)", outline: "rgba(140, 50, 190, 0.9)" },
    link: { shape: "diamond", size: 0.85, fill: "rgba(120, 210, 255, 0.95)", outline: "rgba(30, 115, 170, 0.9)" },
    lab: { shape: "circle", radius: 0.8, fill: "rgba(255, 255, 215, 0.95)", outline: "rgba(190, 190, 130, 0.9)" },
    factory: { shape: "square", size: 1, fill: "rgba(130, 140, 155, 0.95)", outline: "rgba(60, 70, 80, 0.9)" },
    powerSpawn: { shape: "circle", radius: 0.95, fill: "rgba(255, 120, 95, 0.95)", outline: "rgba(160, 45, 25, 0.9)" },
    nuker: { shape: "hex", radius: 0.95, fill: "rgba(255, 210, 135, 0.95)", outline: "rgba(185, 115, 35, 0.9)" },
    observer: { shape: "circle", radius: 0.75, fill: "rgba(115, 255, 210, 0.95)", outline: "rgba(20, 150, 120, 0.9)" },
    constructedWall: { shape: "square", size: 0.85, fill: "rgba(170, 170, 170, 0.95)", outline: "rgba(80, 80, 80, 0.9)" },
    rampart: { shape: "hex", radius: 0.9, fill: "rgba(110, 255, 140, 0.25)", outline: "rgba(110, 255, 140, 0.85)" },
    controller: { shape: "diamond", size: 1.15, fill: "rgba(0, 188, 212, 0.95)", outline: "rgba(0, 121, 107, 0.9)" },
    extractor: { shape: "hex", radius: 0.85, fill: "rgba(255, 235, 150, 0.95)", outline: "rgba(180, 160, 70, 0.9)" },
    powerBank: { shape: "circle", radius: 0.95, fill: "rgba(255, 90, 90, 0.85)", outline: "rgba(140, 0, 0, 0.9)" },
    invaderCore: { shape: "square", size: 1, fill: "rgba(255, 110, 160, 0.9)", outline: "rgba(150, 30, 70, 0.9)" }
};

/**
 * Configuration for different deposit types in highway rooms
 */
const DEPOSIT_TYPES = {
    biomass: {
        fillUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-biomass-fill.svg",
        outlineUrl: "https://screeps.com/a/vendor/renderer/metadata/deposit-biomass.svg",
        fillColor: "rgba(11, 167, 31, 1)",
        outlineColor: "rgba(0, 255, 0, 1)",
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
        fillColor: "rgba(122, 70, 17, 1)",
        outlineColor: "rgba(224, 154, 83, 1)",
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
    SOLID_STRUCTURE_STYLES,
    DEPOSIT_TYPES,
    ROAD_CONNECTIONS,
    ROAD_NEIGHBOUR_OFFSETS,
    WALL_CONNECTIONS,
    WALL_NEIGHBOUR_OFFSETS,
    USER_BADGE_BASE_URL
};