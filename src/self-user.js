(() => {
	const SMO = window.ScreepsMinimalOverlay;
	if (!SMO) return;

	if (!SMO.selfUser) {
		SMO.selfUser = {
			userId: null,
			lastDetectedAt: 0
		};
	}

	function handleUserMeta(event) {
		if (event.source !== window) return;
		const data = event.data;
		if (!data || data.source !== "screeps-hook:user-meta") return;
		if (data.type !== "self-user-id" || typeof data.userId !== "string") return;

		const normalized = data.userId.trim();
		if (!normalized) return;
		if (SMO.selfUser.userId === normalized) {
			SMO.selfUser.lastDetectedAt = Date.now();
			return;
		}

		SMO.selfUser.userId = normalized;
		SMO.selfUser.lastDetectedAt = Date.now();
		if (SMO.config && SMO.config.debug) {
			console.log("[Screeps Overlay] Self user ID detected", normalized);
		}
	}

	window.addEventListener("message", handleUserMeta, false);
})();