/**
 * Main rendering orchestrator that coordinates all rendering modules
 */
(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    // Import all the modules we need
    const { normalizePointList, coordKey, buildTerrainWallLookup, isTerrainWall } = window.ScreepsRendererUtils;
    const { RESERVED_RADAR_KEYS } = window.ScreepsRendererConfig;
    const { drawBackground, drawTerrainLayer } = window.ScreepsTerrainRenderer;
    const { drawPoints } = window.ScreepsPointRenderer;
    const { drawRoadNetwork } = window.ScreepsRoadRenderer;
    const { drawPlayerWalls } = window.ScreepsWallRenderer;
    const { drawMinerals } = window.ScreepsMineralRenderer;
    const { drawControllers } = window.ScreepsControllerRenderer;
    const { drawNPCs } = window.ScreepsNPCRenderer;

    /**
     * Render all room radar data to a canvas
     * @param {string} shard - Shard name
     * @param {string} roomName - Room name
     * @param {HTMLCanvasElement} canvas - Target canvas
     */
    function drawRoomRadarToCanvas(shard, roomName, canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        if (!width || !height) return;
        const scaleX = width / 50;
        const scaleY = height / 50;

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        // Draw background
        drawBackground(ctx, width, height, roomName);

        // Draw terrain
        const terrainString = SMO.terrain.getCachedTerrainString(shard, roomName);
        if (terrainString) {
            drawTerrainLayer(ctx, terrainString, scaleX, scaleY);
        }

        // Get room data
        const shardData = SMO.roomRadarData[shard];
        const roomEntry = shardData && shardData[roomName];
        const data = roomEntry ? roomEntry.raw || {} : null;

        if (data) {
            // Draw structures in rendering order
            drawRoadNetwork(ctx, data.r, scaleX, scaleY);  // roads with connections
            drawPlayerWalls(ctx, data.w, scaleX, scaleY);  // walls with connections
            drawPoints(ctx, data.s, "s", scaleX, scaleY);  // sources
            drawMinerals(ctx, data.m, scaleX, scaleY, roomName);  // minerals / deposits
            drawPoints(ctx, data.k, "k", scaleX, scaleY);  // keeper lairs
            drawPoints(ctx, data.pb, "pb", scaleX, scaleY); // power banks
            drawPoints(ctx, data.p, "p", scaleX, scaleY);   // portals
            
            let roomUserID;

            // Handle controllers
            if (data.c && Array.isArray(data.c) && data.c.length === 1) {
                // Unclaimed room - simple controller drawing
                drawControllers(ctx, data.c, scaleX, scaleY);
            } else {
                // Claimed room or corridors - find controller among player structures
                const terrainStr = SMO.terrain.getCachedTerrainString(shard, roomName);
                if (terrainStr) {
                    const wallLookup = buildTerrainWallLookup(terrainStr);
                    
                    Object.keys(data).forEach((key) => {
                        if (RESERVED_RADAR_KEYS.has(key)) return;
                        const value = data[key];
                        if (Array.isArray(value)) {
                            const { coords } = normalizePointList(value);
                            const mineralLocs = (data.m && Array.isArray(data.m)) ? normalizePointList(data.m).lookup : new Set();
                            
                            // Find controller (structure on wall that's not a mineral)
                            coords.forEach(([x, y]) => {
                                if (wallLookup.has(coordKey(x, y))) {
                                    if (!mineralLocs.has(coordKey(x, y))) {
                                        roomUserID = key;
                                        const controllerUserName = roomUserID ? SMO.userCache.getUsernameById(roomUserID) : null;
                                        
                                        // Debug output
                                        if (roomUserID) {
                                            ctx.save();
                                            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                                            ctx.font = `${Math.max(8, scaleX * 0.3)}px Arial`;
                                            ctx.textAlign = "left";
                                            ctx.textBaseline = "top";
                                            ctx.fillText(`Owner: ${roomUserID}`, 5, 5);
                                            if (controllerUserName) {
                                                ctx.fillText(`Username: ${controllerUserName}`, 5, 5 + Math.max(10, scaleY * 0.4));
                                            }
                                            ctx.restore();
                                        }

                                        drawControllers(ctx, [[x, y]], scaleX, scaleY, controllerUserName);
                                    }
                                }
                            });
                        }
                    });
                }
            }

            // Draw all other player structures (skip those on terrain walls)
            const terrainStr = SMO.terrain.getCachedTerrainString(shard, roomName);
            Object.keys(data).forEach((key) => {
                if (RESERVED_RADAR_KEYS.has(key)) return;
                const value = data[key];
                if (Array.isArray(value)) {
                    // Filter out structures on terrain walls
                    const filteredStructures = terrainStr ? 
                        value.filter(([x, y]) => !isTerrainWall(terrainStr, x, y)) : 
                        value;
                    
                    if (filteredStructures.length > 0) {
                        // Check if this is an NPC user ID
                        if (key === "2") {
                            // Invaders
                            drawNPCs(ctx, filteredStructures, "invader", scaleX, scaleY);
                        } else if (key === "3") {
                            // Source Keepers
                            drawNPCs(ctx, filteredStructures, "sourcekeeper", scaleX, scaleY);
                        } else {
                            // Regular player structures
                            drawPoints(ctx, filteredStructures, "player", scaleX, scaleY);
                        }
                    }
                }
            });
        }

        ctx.restore();
    }

    /**
     * Main render function - orchestrates the entire rendering pipeline
     */
    function render() {
        const roomInfo = SMO.rooms.detectCurrentRoomFromHash();
        if (!roomInfo) return;

        SMO.currentRoomState = roomInfo;
        const { shard, roomName } = roomInfo;

        const neighbours = SMO.rooms.computeNeighbourRooms(roomName);
        SMO.terrain.ensureRoomsQueued(shard, [roomName, ...neighbours.map((n) => n.roomName)]);

        const overlay = SMO.overlay.ensureOverlay();
        if (!overlay) return;

        SMO.overlay.layoutCanvases(neighbours);
        SMO.overlay.cleanupUnusedCanvases(neighbours.map((n) => n.roomName));

        neighbours.forEach(({ roomName: neighbourRoom }) => {
            const canvas = SMO.overlay.getCanvasForRoom(neighbourRoom);
            if (canvas) {
                drawRoomRadarToCanvas(shard, neighbourRoom, canvas);
            }
        });
    }

    // Export the main render function
    SMO.render = render;
})();