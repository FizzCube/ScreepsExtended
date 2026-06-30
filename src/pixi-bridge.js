/**
 * PixiBridge (page context). Targets PixiJS v7.x.
 *
 * We do NOT render anything in WebGL anymore - that gets captured by Screeps'
 * zoom frame-feedback and shows up as recursive shrunken copies. Instead this
 * file only READS the room stage's camera transform each frame and posts it to
 * the content script, which draws the neighbour rooms as plain DOM canvases
 * layered over the game (browser-composited, immune to the feedback).
 */
(function (global) {
	const SMO = global.ScreepsMinimalOverlay = global.ScreepsMinimalOverlay || {};
	const LOG_PREFIX = "[SMO][PixiBridge]";
	const MIN_STAGE_CHILDREN = 4;

	class PixiBridge {
		constructor() {
			this.stage = null;
			this.renderer = null;
			this.isInitialized = false;
			this.stageDumped = false;
			this._sigs = new Set();

			// Master kill switch:  ScreepsMinimalOverlay.PixiBridge.enabled = false
			this.enabled = true;
			this.debug = false;
		}

		log(...args) { if (this.debug) console.log(LOG_PREFIX, ...args); }
		redump() { this.stageDumped = false; this.dumpStage(); }

		init() {
			if (this.isInitialized) return;
			this.log("Initializing...");
			this.waitForPixi().then((ok) => {
				if (!ok) { console.warn(LOG_PREFIX, "window.PIXI never appeared."); return; }
				this.installPatches();
			});
			this.isInitialized = true;
		}

		waitForPixi() {
			return new Promise((resolve) => {
				if (global.PIXI) return resolve(true);
				const iv = setInterval(() => { if (global.PIXI) { clearInterval(iv); resolve(true); } }, 50);
				setTimeout(() => { clearInterval(iv); resolve(!!global.PIXI); }, 30000);
			});
		}

		installPatches() {
			const PIXI = global.PIXI;
			if (!PIXI || !PIXI.Renderer || !PIXI.Renderer.prototype.render) {
				console.warn(LOG_PREFIX, "Renderer.prototype.render not found.");
				return;
			}
			this.log(`PIXI v${PIXI.VERSION} found.`);
			// Idempotency guard: if this file runs more than once (all_frames
			// re-injection, extension reload without a page reload, dev hot-reload),
			// re-wrapping render would capture the already-wrapped function as its
			// "original" and stack a second wrapper, running applyTransform twice per
			// frame. Tag the patched function and bail if it's already ours.
			if (PIXI.Renderer.prototype.render.__smoPatched) {
				this.log("Renderer.prototype.render already patched; skipping.");
				return;
			}
			const self = this;
			const originalRender = PIXI.Renderer.prototype.render;
			PIXI.Renderer.prototype.render = function (displayObject, options) {
				let apply = false;
				try { if (self.enabled) apply = self.beforeRender(this, displayObject, options); }
				catch (e) { if (self.debug) console.warn(LOG_PREFIX, "beforeRender", e); }

				const result = originalRender.apply(this, arguments);

				// Apply AFTER the game's render: worldTransform is only recomputed
				// during render(), so reading it beforehand gives last frame's matrix
				// (a one-frame pan lag). After render it's the matrix for THIS frame.
				if (apply) {
					try { self.applyTransform(this, displayObject); }
					catch (e) { if (self.debug) console.warn(LOG_PREFIX, "applyTransform", e); }
				}
				return result;
			};
			PIXI.Renderer.prototype.render.__smoPatched = true;
			this.log("Patched Renderer.prototype.render");
		}

		beforeRender(renderer, root, options) {
			const boundTarget = renderer && renderer.renderTexture && renderer.renderTexture.current;
			const toTexture = !!(options && options.renderTexture) || !!boundTarget;
			this.logRenderSignatureOnce(renderer, root, toTexture);
			if (toTexture) return false;            // ignore render-to-texture passes
			this.considerStage(root, renderer);
			return root === this.stage;             // apply transform after this pass
		}

		roomViewReady() {
			return !!document.querySelector(".pixijs-renderer__stage");
		}

		considerStage(root, renderer) {
			if (!this.roomViewReady()) return;
			if (!root || root.parent) return;
			if (!root.children || root.children.length < MIN_STAGE_CHILDREN) return;
			if (root === this.stage && !this.stage._destroyed) return;
			const first = !this.stage;
			this.stage = root;
			this.renderer = renderer;
			this.log(first ? "STAGE CAPTURED." : "STAGE re-captured (room change).",
				{ children: root.children.length });
			if (first) this.dumpStage();
		}

		// Drive the overlay container's CSS transform DIRECTLY, synchronously, in
		// the same render call the game uses. The overlay's child canvases sit at
		// LOCAL coords (dx*5000, dy*5000); this matrix maps LOCAL -> viewport px:
		//   screenX = viewLeft + (a*localX + tx) * (viewWidth / screenW)
		// i.e. matrix(a*sx, 0, 0, d*sy, tx*sx + viewLeft, ty*sy + viewTop).
		// Because we write it inside the game's render (not via postMessage on a
		// separate rAF), the overlay composites in the SAME frame - no pan lag.
		applyTransform(renderer, root) {
			const el = document.getElementById("smo-overlay");
			if (!el) return; // content script hasn't created it yet
			const wt = root.worldTransform;
			const screenW = renderer.screen && renderer.screen.width;
			const screenH = renderer.screen && renderer.screen.height;
			if (!wt || !screenW || !screenH) return;

			let rect = { left: 0, top: 0, width: screenW, height: screenH };
			const view = renderer.view;
			if (view && typeof view.getBoundingClientRect === "function") {
				rect = view.getBoundingClientRect();
			}

			const sx = rect.width / screenW;   // CSS px per renderer logical unit
			const sy = rect.height / screenH;
			const m11 = wt.a * sx;
			const m22 = wt.d * sy;
			const m41 = wt.tx * sx + rect.left;
			const m42 = wt.ty * sy + rect.top;
			el.style.transform = `matrix(${m11}, 0, 0, ${m22}, ${m41}, ${m42})`;
		}

		logRenderSignatureOnce(renderer, root, toTexture) {
			if (!this.debug) return;
			const name = root && root.constructor ? root.constructor.name : "null";
			const ch = root && root.children ? root.children.length : 0;
			const screen = renderer && renderer.screen
				? `${Math.round(renderer.screen.width)}x${Math.round(renderer.screen.height)}` : "?";
			const sig = `${name} ch=${ch} rt=${toTexture} screen=${screen} ready=${this.roomViewReady()}`;
			if (this._sigs.has(sig)) return;
			this._sigs.add(sig);
			this.log("render pass:", sig);
		}

		dumpStage(maxDepth = 3) {
			if (this.stageDumped || !this.stage) return;
			this.stageDumped = true;
			try {
				const lines = ["=== SMO scene-graph dump ==="];
				if (this.renderer) {
					const r = this.renderer;
					const screen = r.screen ? `${Math.round(r.screen.width)}x${Math.round(r.screen.height)}` : "?";
					const view = r.view ? `${r.view.width}x${r.view.height}` : "?";
					lines.push(`renderer: screen=${screen} resolution=${r.resolution} canvas=${view}`);
				}
				const wt = this.stage.worldTransform;
				if (wt) lines.push(`stage world=[a${wt.a} d${wt.d} tx${Math.round(wt.tx)} ty${Math.round(wt.ty)}]`);
				console.log(LOG_PREFIX + "\n" + lines.join("\n"));
			} catch (e) { this.log("dumpStage failed", e); }
		}
	}

	// Reuse an existing instance if this script runs again, so we don't discard a
	// live bridge (the prototype patch itself is also guarded in installPatches).
	SMO.PixiBridge = SMO.PixiBridge || new PixiBridge();
	SMO.PixiBridge.init();

})(window);
