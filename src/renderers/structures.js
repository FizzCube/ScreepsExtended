/**
 * Renderer for solid, unwalkable structures captured via the room-objects API
 */
(() => {
    const SMO = window.ScreepsMinimalOverlay;
    if (!SMO) return;

    const config = window.ScreepsRendererConfig || {};
    const rendererUtils = window.ScreepsRendererUtils || {};
    const STRUCTURE_STYLES = config.SOLID_STRUCTURE_STYLES || {};
    const coordKey = typeof rendererUtils.coordKey === "function" ? rendererUtils.coordKey : (x, y) => `${x},${y}`;
    const RAMPART_NEIGHBOURS = config.WALL_NEIGHBOUR_OFFSETS || [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];
    const badgeAPI = window.ScreepsBadgeImageCache || {};
    const getBadgeImageEntry = typeof badgeAPI.getBadgeImageEntry === "function" ? badgeAPI.getBadgeImageEntry : null;
    const SKIP_DIRECT_RENDER_TYPES = new Set(["constructedWall", "powerBank"]);
    // Structure types whose rendering changes every frame (e.g. rotating tower
    // tops). These are drawn on the separate "animated" overlay canvas at ~30fps;
    // the heavy static content (terrain, roads, everything else) is drawn once on
    // the "static" canvas and left alone. Add future animated types here.
    const ANIMATED_TYPES = new Set(["tower"]);
    const RAMPART_LAYER_CACHE = Object.create(null);
    const imageCache = Object.create(null);
    // Ownership outline colours: green when the structure is ours, red otherwise.
    const OWN_COLOR = "#82ca82";
    const HOSTILE_COLOR = "#ff8989";
    // Recoloured SVG art. The Screeps border/body SVGs draw their rim as
    // `stroke:#ffffff`; we fetch the markup once, swap that stroke for the owner
    // colour, and cache the resulting data-URL image keyed by url + colour.
    const svgTextCache = Object.create(null);   // url -> string | null (null = failed)
    const svgTextPending = Object.create(null); // url -> bool
    const tintedImageCache = Object.create(null); // `${url}|${color}` -> Image
    const ASSETS = {
        towerBase: "https://screeps.com/a/vendor/renderer/metadata/tower-base.svg",
        towerTop: "https://screeps.com/a/vendor/renderer/metadata/tower-rotatable.svg",
        linkBorder: "https://screeps.com/a/vendor/renderer/metadata/link-border.svg",
        linkEnergy: "https://screeps.com/a/vendor/renderer/metadata/link-energy.svg",
        nukerBorder: "https://screeps.com/a/vendor/renderer/metadata/nuker-border.svg",
        nukerFill: "https://screeps.com/a/vendor/renderer/metadata/nuker.svg",
        labBase: "https://screeps.com/a/vendor/renderer/metadata/lab.svg",
        labHighlight: "https://screeps.com/a/vendor/renderer/metadata/lab-highlight.svg",
        storageBorder: "https://screeps.com/a/vendor/renderer/metadata/storage-border.svg",
        storageFill: "https://screeps.com/a/vendor/renderer/metadata/storage.svg",
        factoryBorder: "https://screeps.com/a/vendor/renderer/metadata/factory-border.svg",
        factoryHighlight: "https://screeps.com/a/vendor/renderer/metadata/factory-highlight.svg",
        factoryBase: "https://screeps.com/a/vendor/renderer/metadata/factory-lvl0.svg",
        terminalBorder: "https://screeps.com/a/vendor/renderer/metadata/terminal-border.svg",
        terminalHighlight: "https://screeps.com/a/vendor/renderer/metadata/terminal-highlight.svg",
        invaderCore: "https://screeps.com/a/vendor/renderer/metadata/invaderCore.svg"
    };

    const STRUCTURE_RENDERERS = {
        spawn: drawSpawn,
        extension: drawExtension,
        tower: drawTower,
        link: drawLink,
        nuker: drawNuker,
        lab: drawLab,
        storage: drawStorage,
        factory: drawFactory,
        terminal: drawTerminal,
        powerSpawn: drawPowerSpawn,
        observer: drawObserver,
        invaderCore: drawInvaderCore
    };

    function resolveUsername(userId) {
        if (!userId || !SMO.userCache || typeof SMO.userCache.getUsernameById !== "function") {
            return null;
        }
        return SMO.userCache.getUsernameById(String(userId));
    }

    let rerenderQueued = false;
    function requestRerender() {
        if (rerenderQueued) return;
        rerenderQueued = true;
        const run = () => {
            rerenderQueued = false;
            if (SMO && typeof SMO.render === "function") SMO.render();
        };
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(run);
        } else {
            run();
        }
    }

    function ensureSvgText(url) {
        if (url in svgTextCache) return svgTextCache[url]; // string or null
        if (!svgTextPending[url]) {
            svgTextPending[url] = true;
            fetch(url)
                .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
                .then((text) => { svgTextCache[url] = text; requestRerender(); })
                .catch(() => { svgTextCache[url] = null; })
                .then(() => { svgTextPending[url] = false; });
        }
        return null;
    }

    // The Screeps border art draws its rim as a white-ish stroke, in two markup
    // forms: `style="...stroke:#ffffff..."` and `stroke="#fdffff"`. Swap whichever
    // appears for the owner colour, leaving stroke-width / stroke-opacity / etc.
    // and any non-white strokes untouched.
    function recolorWhiteStroke(text, color) {
        return text.replace(/(stroke\s*[:=]\s*["']?)#(?:ffffff|fdffff|fefefe)/gi, `$1${color}`);
    }

    function getStrokeColoredImage(url, color) {
        if (!url || !color) return null;
        const cacheKey = `${url}|${color}`;
        if (tintedImageCache[cacheKey]) return tintedImageCache[cacheKey];
        const text = ensureSvgText(url);
        if (text == null) return null; // still loading, or failed to load
        const recolored = recolorWhiteStroke(text, color);
        const img = new Image();
        img.onload = requestRerender;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolored)}`;
        tintedImageCache[cacheKey] = img;
        return img;
    }

    function isOwnEntry(entry) {
        if (!entry || !entry.user) return false;
        const selfId = SMO.selfUser && SMO.selfUser.userId ? String(SMO.selfUser.userId) : null;
        return selfId ? String(entry.user) === selfId : false;
    }

    // Owner outline colour for an SVG rim, or null when the structure is unowned
    // (leave the original white art untouched).
    function ownerStrokeColor(entry) {
        if (!entry || !entry.user) return null;
        return isOwnEntry(entry) ? OWN_COLOR : HOSTILE_COLOR;
    }

    function getImage(url) {
        if (!url) return null;
        if (!imageCache[url]) {
            const img = new Image();
            img.src = url;
            imageCache[url] = img;
        }
        return imageCache[url];
    }

    function isImageReady(img) {
        return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }

    function drawImageLayer(ctx, url, x, y, scaleX, scaleY, options = {}) {
        let img;
        if (options.strokeColor) {
            img = getStrokeColoredImage(url, options.strokeColor);
            // Fall back to the plain white art while the recoloured version loads.
            if (!isImageReady(img)) img = getImage(url);
        } else {
            img = getImage(url);
        }
        if (!isImageReady(img)) return;
        const width = (options.scaleX || options.scale || 1) * scaleX;
        const height = (options.scaleY || options.scale || 1) * scaleY;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;

        ctx.save();
        ctx.translate(cx, cy);
        if (options.rotation) {
            ctx.rotate(options.rotation);
        }
        if (typeof options.alpha === "number") {
            ctx.globalAlpha = options.alpha;
        }
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.restore();
    }

    function drawSpawn(ctx, entry, scaleX, scaleY) {
        const { x, y } = entry;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;
        const radius = Math.min(scaleX, scaleY) * 0.5;

        ctx.save();
        ctx.fillStyle = "rgba(255, 230, 120, 1)";
        ctx.strokeStyle = ownerStrokeColor(entry) || "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = Math.max(1.5, radius * 1.1);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.lineWidth = Math.max(1.5, radius * 0.65);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawExtension(ctx, entry, scaleX, scaleY) {
        const { x, y } = entry;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;
        const radius = Math.min(scaleX, scaleY) * 0.30;

        ctx.save();
        ctx.fillStyle = "rgba(255, 230, 120, 1)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
        ctx.lineWidth = Math.max(1, radius * 0.45);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Extensions keep the simple faded ownership ring.
        if (entry && entry.user) {
            drawOwnershipOutline(ctx, entry, scaleX, scaleY, isOwnEntry(entry));
        }
    }

    function drawTower(ctx, entry, scaleX, scaleY, now) {
        const rotation = ((now % 5000) / 5000) * Math.PI * 2;
        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.towerBase, entry.x, entry.y, scaleX, scaleY, { scaleX: 1.5, scaleY: 1.5, strokeColor });
        drawImageLayer(ctx, ASSETS.towerTop, entry.x, entry.y, scaleX, scaleY, { rotation });
    }

    function drawLink(ctx, entry, scaleX, scaleY) {
        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.linkBorder, entry.x, entry.y, scaleX, scaleY, { scaleX: 0.8, scaleY: 0.8, strokeColor });
        drawImageLayer(ctx, ASSETS.linkEnergy, entry.x, entry.y, scaleX, scaleY, { scaleX: 0.65, scaleY: 0.65 });
    }

    function drawNuker(ctx, entry, scaleX, scaleY) {
        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.nukerBorder, entry.x, entry.y, scaleX, scaleY, { scaleX: 2.5, scaleY: 2.5, strokeColor });
        drawImageLayer(ctx, ASSETS.nukerFill, entry.x, entry.y, scaleX, scaleY, { scaleX: 2.5, scaleY: 2.5 });
    }

    function drawLab(ctx, entry, scaleX, scaleY) {
        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.labBase, entry.x, entry.y, scaleX, scaleY, { scaleX: 1.8, scaleY: 1.8, strokeColor });
        drawImageLayer(ctx, ASSETS.labHighlight, entry.x, entry.y, scaleX, scaleY, { alpha: 0.5, scaleX: 1.3, scaleY: 1.3 });
    }

    function drawStorage(ctx, entry, scaleX, scaleY) {
        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.storageBorder, entry.x, entry.y, scaleX, scaleY, { scaleX: 1.5, scaleY: 1.5, strokeColor });
        drawImageLayer(ctx, ASSETS.storageFill, entry.x, entry.y, scaleX, scaleY, { scaleX: 1.5, scaleY: 1.5 });
    }

    function drawFactory(ctx, entry, scaleX, scaleY) {
        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.factoryBorder, entry.x, entry.y, scaleX, scaleY, { strokeColor });
        drawImageLayer(ctx, ASSETS.factoryBase, entry.x, entry.y, scaleX, scaleY);
        drawImageLayer(ctx, ASSETS.factoryHighlight, entry.x, entry.y, scaleX, scaleY, { alpha: 0.85 });
    }

    function drawTerminal(ctx, entry, scaleX, scaleY) {
        const { x, y } = entry;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;
        const radius = Math.min(scaleX, scaleY) * 0.55;

        ctx.save();
        const gradient = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
        gradient.addColorStop(0, "rgba(255, 230, 255, 0.95)");
        gradient.addColorStop(1, "rgba(140, 50, 190, 0.95)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const strokeColor = ownerStrokeColor(entry);
        drawImageLayer(ctx, ASSETS.terminalBorder, x, y, scaleX, scaleY, { scaleX: 1.55, scaleY: 1.55, strokeColor });
        drawImageLayer(ctx, ASSETS.terminalHighlight, x, y, scaleX, scaleY, { scaleX: 1.55, scaleY: 1.55, alpha: 0.85 });
    }

    function drawPowerSpawn(ctx, entry, scaleX, scaleY) {
        const { x, y } = entry;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;
        const minScale = Math.min(scaleX, scaleY);
        const outerRadius = minScale * 0.55;
        const ringRadius = outerRadius * 0.85;
        const coreRadius = outerRadius * 0.45;

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        // PowerSpawn has no white rim - show ownership as a coloured outer ring.
        const ownColor = ownerStrokeColor(entry);
        if (ownColor) {
            ctx.strokeStyle = ownColor;
            ctx.lineWidth = Math.max(1.5, outerRadius * 0.18);
            ctx.beginPath();
            ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.strokeStyle = "rgba(200, 0, 0, 0.95)";
        ctx.lineWidth = Math.max(2, outerRadius * 0.35);
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        const username = resolveUsername(entry.user);
        if (username && typeof getBadgeImageEntry === "function") {
            const badgeEntry = getBadgeImageEntry(username);
            if (badgeEntry && badgeEntry.status === "loaded" && badgeEntry.image) {
                const badgeRadius = coreRadius * 0.9;
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(
                    badgeEntry.image,
                    cx - badgeRadius,
                    cy - badgeRadius,
                    badgeRadius * 2,
                    badgeRadius * 2
                );
                ctx.restore();
            }
        }

        ctx.restore();
    }

    function drawObserver(ctx, entry, scaleX, scaleY) {
        const { x, y } = entry;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;
        const minScale = Math.min(scaleX, scaleY);
        const baseRadius = minScale * 0.4;
        const lensRadius = baseRadius * 0.45;
        const offset = baseRadius * 0.55;

        ctx.save();
        ctx.fillStyle = "rgba(5, 5, 5, 0.95)";
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 105, 105, 0.9)";
        ctx.beginPath();
        ctx.arc(cx + offset * 0.6, cy - offset * 0.7, lensRadius, 0, Math.PI * 2);
        ctx.fill();

        // Observer has no white rim - show ownership as a coloured outer ring.
        const ownColor = ownerStrokeColor(entry);
        if (ownColor) {
            ctx.strokeStyle = ownColor;
            ctx.lineWidth = Math.max(1.5, baseRadius * 0.2);
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawInvaderCore(ctx, entry, scaleX, scaleY) {
        drawImageLayer(ctx, ASSETS.invaderCore, entry.x, entry.y, scaleX, scaleY, { scaleX: 1.8, scaleY: 1.8 });
    }

    function drawDefaultStructure(ctx, entry, style, scaleX, scaleY) {
        if (!entry || typeof entry.x !== "number" || typeof entry.y !== "number") return;
        const cx = (entry.x + 0.5) * scaleX;
        const cy = (entry.y + 0.5) * scaleY;
        const minScale = Math.min(scaleX, scaleY);
        const baseSize = Math.max(0.2, style.size || style.radius || 0.8);
        const radius = (baseSize * minScale) / 2;
        const halfWidth = (baseSize * scaleX) / 2;
        const halfHeight = (baseSize * scaleY) / 2;

        ctx.save();
        ctx.fillStyle = style.fill || "rgba(255, 255, 255, 0.9)";
        // Owned fallback structures get an owner-coloured outline; otherwise use
        // the style's own outline (if any).
        const outlineColor = ownerStrokeColor(entry) || style.outline;
        if (outlineColor) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = Math.max(1, radius * 0.25);
        }
        if (style.shadow) {
            ctx.shadowColor = style.shadow;
            ctx.shadowBlur = Math.max(4, radius * 0.8);
        }

        const shape = style.shape || "square";
        ctx.beginPath();
        if (shape === "circle") {
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        } else if (shape === "diamond") {
            ctx.moveTo(cx, cy - halfHeight);
            ctx.lineTo(cx + halfWidth, cy);
            ctx.lineTo(cx, cy + halfHeight);
            ctx.lineTo(cx - halfWidth, cy);
            ctx.closePath();
        } else if (shape === "hex") {
            drawPolygon(ctx, cx, cy, radius, 6, Math.PI / 6);
        } else {
            ctx.rect(cx - halfWidth, cy - halfHeight, halfWidth * 2, halfHeight * 2);
        }

        ctx.fill();
        if (outlineColor) {
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawPolygon(ctx, cx, cy, radius, sides, rotation = 0) {
        if (sides < 3) return;
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i * 2 * Math.PI) / sides;
            const px = cx + radius * Math.cos(angle);
            const py = cy + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    function drawOwnershipOutline(ctx, entry, scaleX, scaleY, isOwn) {
        const { x, y } = entry;
        const cx = (x + 0.5) * scaleX;
        const cy = (y + 0.5) * scaleY;
        const radius = Math.min(scaleX, scaleY) * 0.6;

        ctx.save();
        ctx.strokeStyle = isOwn ? "rgba(130, 202, 130, 0.5)" : "rgba(255, 137, 137, 0.5)";
        ctx.lineWidth = Math.max(1, radius * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawRampartsFallback(ctx, lookup, scaleX, scaleY, selfId) {
        if (!lookup || lookup.size === 0) return;
        const minScale = Math.min(scaleX, scaleY);
        const radius = minScale * 0.55;
        const linkWidth = radius * 0.9;
        const outlineWidth = Math.max(1, radius * 0.25);

        function isOwn(entry) {
            if (!entry || !selfId) return false;
            return String(entry.user || "") === selfId;
        }

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        lookup.forEach((entry) => {
            const cx = (entry.x + 0.5) * scaleX;
            const cy = (entry.y + 0.5) * scaleY;
            const own = isOwn(entry);
            const fillColor = own ? "rgba(110, 255, 140, 1)" : "rgba(255, 110, 140, 1)";

            RAMPART_NEIGHBOURS.forEach(([dx, dy]) => {
                if (dx < 0 || (dx === 0 && dy < 0)) return;
                const neighbour = lookup.get(coordKey(entry.x + dx, entry.y + dy));
                if (!neighbour) return;
                if (isOwn(neighbour) !== own) return;

                const nx = (entry.x + dx + 0.5) * scaleX;
                const ny = (entry.y + dy + 0.5) * scaleY;
                ctx.save();
                ctx.strokeStyle = fillColor;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = linkWidth;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.stroke();
                ctx.restore();
            });
        });

        lookup.forEach((entry) => {
            const cx = (entry.x + 0.5) * scaleX;
            const cy = (entry.y + 0.5) * scaleY;
            const own = isOwn(entry);
            const fillColor = own ? "rgba(110, 255, 140, 1)" : "rgba(255, 110, 140, 1)";
            const outlineColor = own ? "rgba(40, 120, 70, 0.8)" : "rgba(200, 40, 80, 0.85)";

            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.75;
            ctx.lineWidth = outlineWidth;
            ctx.strokeStyle = outlineColor;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore();
    }

    function acquireRampartLayer(key, width, height) {
        if (typeof document === "undefined") {
            return null;
        }
        let entry = RAMPART_LAYER_CACHE[key];
        if (!entry) {
            const canvas = document.createElement("canvas");
            entry = { canvas, ctx: canvas.getContext("2d") };
            RAMPART_LAYER_CACHE[key] = entry;
        }
        if (!entry.ctx) return null;
        if (entry.canvas.width !== width || entry.canvas.height !== height) {
            entry.canvas.width = width;
            entry.canvas.height = height;
        } else {
            entry.ctx.clearRect(0, 0, width, height);
        }
        entry.ctx.setTransform(1, 0, 0, 1, 0, 0);
        return entry;
    }

    function drawRamparts(ctx, entries, scaleX, scaleY, selfId) {
        if (!Array.isArray(entries) || entries.length === 0) return;
        const lookup = new Map();
        entries.forEach((entry) => {
            if (!entry || typeof entry.x !== "number" || typeof entry.y !== "number") return;
            lookup.set(coordKey(entry.x, entry.y), entry);
        });
        if (lookup.size === 0) return;

        const minScale = Math.min(scaleX, scaleY);
        const radius = minScale * 0.5;
        const linkWidth = radius * 2;
        const outlineWidth = Math.max(1, radius * 0.25);
        const destWidth = ctx.canvas && ctx.canvas.width ? ctx.canvas.width : Math.round(scaleX * 50);
        const destHeight = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : Math.round(scaleY * 50);
        const layersInUse = Object.create(null);

        function isOwn(entry) {
            if (!entry || !selfId) return false;
            return String(entry.user || "") === selfId;
        }

        if (typeof document === "undefined" || typeof document.createElement !== "function") {
            drawRampartsFallback(ctx, lookup, scaleX, scaleY, selfId);
            return;
        }

        function getLayerEntry(own) {
            const key = own ? "own" : "hostile";
            if (layersInUse[key]) return layersInUse[key];
            const layer = acquireRampartLayer(key, destWidth, destHeight);
            if (!layer) return null;
            layer.ctx.lineCap = "round";
            layer.ctx.lineJoin = "round";
            layersInUse[key] = layer;
            return layer;
        }

        
        lookup.forEach((entry) => {
            const cx = (entry.x + 0.5) * scaleX;
            const cy = (entry.y + 0.5) * scaleY;
            const own = isOwn(entry);
            const fillColor = own ? "rgba(134, 236, 108, 1)" : "rgba(248, 64, 64, 1)";
            const layerEntry = getLayerEntry(own);
            if (!layerEntry) return;
            const layerCtx = layerEntry.ctx;
            layerCtx.strokeStyle = fillColor;
            layerCtx.lineWidth = linkWidth;

            RAMPART_NEIGHBOURS.forEach(([dx, dy]) => {
                if (dx < 0 || (dx === 0 && dy < 0)) return;
                const neighbour = lookup.get(coordKey(entry.x + dx, entry.y + dy));
                if (!neighbour) return;
                if (isOwn(neighbour) !== own) return;

                const nx = (entry.x + dx + 0.5) * scaleX;
                const ny = (entry.y + dy + 0.5) * scaleY;
                layerCtx.beginPath();
                layerCtx.moveTo(cx, cy);
                layerCtx.lineTo(nx, ny);
                layerCtx.stroke();
            });
        });

        lookup.forEach((entry) => {
            const cx = (entry.x + 0.5) * scaleX;
            const cy = (entry.y + 0.5) * scaleY;
            const own = isOwn(entry);
            const fillColor = own ? "rgba(134, 236, 108, 1)" : "rgba(248, 64, 64, 1)";
            const layerEntry = getLayerEntry(own);
            if (!layerEntry) return;
            const layerCtx = layerEntry.ctx;

            layerCtx.fillStyle = fillColor;
            layerCtx.beginPath();
            layerCtx.arc(cx, cy, radius, 0, Math.PI * 2);
            layerCtx.fill();
        });

        Object.keys(layersInUse).forEach((key) => {
            const layerEntry = layersInUse[key];
            if (!layerEntry || !layerEntry.canvas) return;
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.drawImage(layerEntry.canvas, 0, 0, destWidth, destHeight, 0, 0, destWidth, destHeight);
            ctx.restore();
        });
    }

    // layer: "static" (default) draws everything except ANIMATED_TYPES; "animated"
    // draws only ANIMATED_TYPES. This lets the caller keep the expensive static
    // content on a rarely-redrawn canvas and repaint only the animated bits.
    function drawSolidStructures(ctx, structuresByType, scaleX, scaleY, opts) {
        if (!ctx || !structuresByType || typeof structuresByType !== "object") return;
        const layer = (opts && opts.layer) || "static";
        const now = performance.now();
        const selfId = SMO.selfUser && SMO.selfUser.userId ? String(SMO.selfUser.userId) : null;
        const rampartEntries = [];

        Object.keys(structuresByType).forEach((type) => {
            if (SKIP_DIRECT_RENDER_TYPES.has(type)) return;
            const isAnimated = ANIMATED_TYPES.has(type);
            if (layer === "animated" && !isAnimated) return;
            if (layer === "static" && isAnimated) return;
            const entries = structuresByType[type];
            if (!Array.isArray(entries) || entries.length === 0) return;

            if (type === "rampart") {
                rampartEntries.push(...entries);
                return;
            }

            const renderer = STRUCTURE_RENDERERS[type];
            const fallbackStyle = STRUCTURE_STYLES[type];
            entries.forEach((entry) => {
                if (!entry || typeof entry.x !== "number" || typeof entry.y !== "number") return;
                if (renderer) {
                    // Each renderer applies its own ownership colouring (see
                    // ownerStrokeColor / the per-structure draw functions).
                    renderer(ctx, entry, scaleX, scaleY, now);
                } else if (fallbackStyle) {
                    drawDefaultStructure(ctx, entry, fallbackStyle, scaleX, scaleY);
                }
            });
        });

        if (rampartEntries.length) {
            drawRamparts(ctx, rampartEntries, scaleX, scaleY, selfId);
        }
    }

    window.ScreepsStructureRenderer = {
        drawSolidStructures
    };
})();