/**
 * LEGACY RENDERER FILE - REFACTORED INTO MODULAR SYSTEM
 * 
 * This file has been refactored into smaller, more manageable modules:
 * 
 * Configuration:
 *   - src/config/constants.js - All constants and styling configuration
 * 
 * Utilities:
 *   - src/utils/common.js - Common utility functions
 *   - src/utils/deposit-image-cache.js - Deposit image caching
 *   - src/utils/badge-image-cache.js - Badge image caching
 * 
 * Renderers:
 *   - src/renderers/terrain.js - Terrain and background rendering
 *   - src/renderers/points.js - Basic point structures (sources, lairs, etc.)
 *   - src/renderers/roads.js - Road network rendering with connections
 *   - src/renderers/walls.js - Wall network rendering with connections
 *   - src/renderers/minerals.js - Mineral and deposit rendering
 *   - src/renderers/controllers.js - Controller rendering with badges
 * 
 * Main:
 *   - src/renderer-main.js - Main orchestrator that coordinates everything
 *   - src/renderer-loader.js - Module loader (loads all dependencies)
 * 
 * The original functionality is preserved but now split into logical,
 * AI-friendly modules for easier maintenance and development.
 */

console.log('[Screeps Overlay] Legacy renderer.js loaded - functionality moved to modular system');