class RemoteManager extends Component {
	constructor(app) {
		super();
		this.connections = {};
		this.app = app;
		this.options = app.options.remote ? app.options.remote : {};
		this.time = new Date();
		this.sessionTimer;
		this.modules = {};
		this.init(this.options.modules);
		this.token;
		app.log.trace("RemoteManager initializing... ");
	}

	setModule(key, module) {
		this.modules[key] = module;
	}

	// Build & validate a ws/wss URL. Throws on undefined/empty/non-string
	// input so callers fail fast instead of producing `wss://undefined/...`.
	_buildWsUrl(url, isSecure = false) {
		if (typeof url !== "string" || url.length === 0) {
			throw new TypeError(
				`webSocket: 'url' must be a non-empty string (got ${typeof url}: ${url})`,
			);
		}

		let finalUrl;
		if (url.startsWith("ws://") || url.startsWith("wss://")) {
			const urlObj = new URL(url);
			if (this.options.useTokens) {
				urlObj.searchParams.set("token", this.token);
			}
			finalUrl = urlObj.toString();
		} else {
			const cleanUrl = url.replace(/\/+$/, "");
			const protocol = isSecure ? "wss://" : "ws://";
			finalUrl = `${protocol}${cleanUrl}`;
			if (this.options.useTokens) {
				const urlObj = new URL(finalUrl);
				urlObj.searchParams.set("token", this.token);
				finalUrl = urlObj.toString();
			}
		}

		// Sanity-check the result parses; cheap insurance against
		// surprises like an empty host slipping through.
		try {
			const parsed = new URL(finalUrl);
			if (!parsed.host) {
				throw new TypeError("empty host");
			}
		} catch (err) {
			throw new TypeError(
				`webSocket: failed to construct valid URL from input '${url}': ${err.message}`,
			);
		}
		return finalUrl;
	}

	webSocket(url, handleMessage, isSecure = false) {
		const finalUrl = this._buildWsUrl(url, isSecure);

		this.app.log.trace("WebSocket connecting to:", finalUrl);

		const socket = new WebSocket(finalUrl);

		socket.onopen = () => {
			this.app.log.trace(`WebSocket connection to ${finalUrl} established...`);
			this.fireEvent("webSocketOpen", [socket]);
		};

		socket.onerror = (error) => {
			this.app.log.error(`WebSocket error:`, error);
			this.fireEvent("webSocketError", [error]);
		};

		socket.onclose = () => {
			this.app.log.trace(`WebSocket connection to ${finalUrl} closed.`);
			this.fireEvent("webSocketClose", []);
		};

		socket.onmessage = async (event) => {
			const data = JSON.parse(event.data);
			this.app.log.trace(`Received message:`, data);
			if (handleMessage.constructor.name === "AsyncFunction") {
				await handleMessage(data);
			} else {
				handleMessage(data);
			}
			this.fireEvent("webSocketMessage", [data]);
		};

		this.connections[finalUrl] = socket;
		return socket;
	}

	// Managed WebSocket with reconnect, backoff, ping/pong liveness, and
	// network/visibility awareness. Returns a WebSocketSession instance.
	// See WebSocketSession docs (below) for option semantics.
	webSocketSession(options) {
		if (!options || typeof options !== "object") {
			throw new TypeError("webSocketSession: options object required");
		}
		if (typeof options.handleMessage !== "function") {
			throw new TypeError(
				"webSocketSession: options.handleMessage must be a function",
			);
		}
		// Up-front URL validation — caller gets a clear error before any
		// timer or listener has been registered.
		this._buildWsUrl(options.url, options.isSecure ?? true);

		const session = new WebSocketSession(options, this);
		session.start();
		return session;
	}

	getConnection(url) {
		return this.connections[url];
	}

	closeConnection(url) {
		if (this.connections[url]) {
			this.connections[url].close();
			delete this.connections[url];
			this.app.log.trace(`WebSocket connection to ${url} closed.`);
		}
	}

	closeAllConnections() {
		for (const url in this.connections) {
			this.closeConnection(url);
		}
	}

	async refreshClientSession() {
		try {
			const response = await this.invoke("auth.refresh", {
				resolve: (json) => {
					if (json.authenticated) {
						// session is still active, no need to do anything else
						this.app.log.trace("Still logged in.");
					} else {
						this.app.log.trace("Session expired.");
						this.app.events.publish("auth.logout");
					}
				},
				reject: (error) => {
					this.app.log.error("Error in refreshClientSession:", error);
					this.app.events.publish("auth.logout");
				},
			});
		} catch (error) {
			this.app.log.error("Error in refreshClientSession:", error);
			this.app.events.publish("auth.logout");
		}
	}

	setToken(token) {
		sessionStorage.token = token;
		this.token = token;
	}

	getToken() {
		return this.token;
	}

	invalidateToken() {
		this.setToken("");
	}

	getSessionTimer() {
		return this.sessionTimer;
	}

	init(modules) {
		let auth = this.app.options.auth;

		this.options.sessionTimeout = auth.sessionTimeout;
		// set token if valid
		if (
			this.options.useTokens &&
			sessionStorage.token &&
			sessionStorage.token !== ""
		) {
			this.token = sessionStorage.token;
		}

		let authModule = {
			login: async (params) => {
				this.app.log.trace("remote call: auth.login");
				const args = {
					method: "POST",
					headers: {
						Authorization:
							"Basic " +
							this.app.util.base64.encode64(
								params.username + ":" + params.password,
							),
						Accept:
							"application/json, application/xml, text/play, text/html, *.*",
						"Content-Type": "application/json; charset=utf-8",
					},
					body: JSON.stringify({
						rememberMe: params.rememberMe || false,
					}),
				};

				if (this.options.credentials) {
					args.credentials = this.options.credentials;
				}

				try {
					const response = await fetch(this.options.loginURL, args);

					if (this.options.useTokens) {
						// set the token into sessionStorage so it is available if the browser is refreshed
						var token =
							this.options.tokenType === "X-Token"
								? response.headers.get("X-Token")
								: response.headers.get("Access_token");
						if (token !== undefined && token !== null) {
							this.setToken(token);
						}
					}
					const json = await response.json();

					if (json.success) {
						var user = this.app.model.get("user");
						// map the response object into the user object
						Object.keys(json.user).map((key) => {
							user[key] = json.user[key];
						});
						// set the user into the sessionStorage and the model
						sessionStorage.user = JSON.stringify(user);
						this.app.model.set("user", user);
						this.app.log.trace("User set into model:", user);
						// handler/function/route based on success
						if (params.success !== undefined) {
							if (typeof params.success === "function") {
								params.success(json);
							} else if (this.app.options.router) {
								this.app.router.open(params.success, json);
							} else {
								this.app.events.publish(params.success, json);
							}
						}
					} else if (params.failure !== undefined) {
						// if login failed
						if (typeof params.failure === "function") {
							params.failure(json);
						} else if (this.app.options.router) {
							this.app.router.open(params.failure, json);
						} else {
							this.app.events.publish(params.failure, json);
						}
					}
					if (params.callback !== undefined) {
						params.callback(json);
					}
				} catch (error) {
					this.app.log.error("Login error:", error);
				}
			},
			logout: async (params) => {
				this.app.log.trace("remote call: auth.logout");
				const args = {
					method: "POST",
					headers: {
						// Authorization:
						// 	"Basic " +
						// 	this.app.util.base64.encode64(
						// 		params.username + ":" + params.password,
						// 	),
					},
				};

				if (this.options.credentials) {
					args.credentials = this.options.credentials;
				}

				try {
					const response = await fetch(this.options.logoutURL, args);
					const json = await response.json();

					if (json.success) {
						this.app.security.invalidateSession();
						if (params.success !== undefined) {
							if (typeof params.success === "function") {
								params.success(json);
							} else if (this.app.options.router) {
								this.app.router.open(params.success, json);
							} else {
								this.app.events.publish(params.success, json);
							}
						}
					} else if (params.failure !== undefined) {
						// if logout failed
						if (typeof params.failure === "function") {
							params.failure(json);
						} else if (this.app.options.router) {
							this.app.router.open(params.failure, json);
						} else {
							this.app.events.publish(params.failure, json);
						}
					}

					if (params.callback !== undefined) {
						params.callback();
					}
				} catch (error) {
					this.app.log.error("Logout error:", error);
				}
			},
			refresh: async (params) => {
				// refresh keeps the client session alive
				try {
					let args = {};
					if (this.options.credentials) {
						args.credentials = this.options.credentials;
					}
					const response = await this.fetch(
						this.options.refreshURL,
						args,
						true,
					);

					// initial fetch needs to parse response
					let json;
					if (response.status === 401) {
						json = { isauthenticated: false };
					} else {
						json = await response.json();
					}

					// then json is handled
					if (params.resolve !== undefined) {
						params.resolve(json);
					}
				} catch (error) {
					if (params.reject) {
						params.reject(error);
					}
				}
			},
		};

		// add the auth module
		this.setModule("auth", authModule);

		// add application modules
		Object.keys(modules).forEach((key) => {
			this.setModule(key, modules[key]);
		});
	}

	async fetch(uri, params, secure) {
		this.app.log.trace("fetch: " + uri);
		var request;
		var response;

		//if secure and tokens, we need to check timeout and add Authorization header
		if (secure && this.options.useTokens) {
			var currentTime = new Date(),
				diff = Math.abs(currentTime - this.time),
				minutes = Math.floor(diff / 1000 / 60);

			if (minutes > this.options.sessionTimeout) {
				// timeout
				this.app.events.publish("auth.sessionTimeout");
				return;
			} else if (this.token !== undefined && this.token !== null) {
				// set Authorization: Bearer header
				if (params.headers === undefined) {
					if (this.options.tokenType === "X-Token") {
						params.headers = {
							"X-Token": this.token,
						};
					} else {
						params.headers = {
							Authorization: "Bearer " + this.getToken(),
						};
					}

					//							'Content-Type': 'application/json',
				} else {
					if (this.options.tokenType === "X-Token") {
						params.headers["X-Token"] = this.token;
					} else {
						params.headers["Authorization"] = `Bearer ${this.getToken()}`;
					}
				}
			}

			this.time = currentTime;
		}

		// Add credentials option if configured
		if (this.options.credentials) {
			params.credentials = this.options.credentials;
		}

		request = new Request(uri, params);
		//calling the native JS fetch method ...
		try {
			response = await fetch(request);

			if (secure && this.options.useTokens) {
				// according to https://www.rfc-editor.org/rfc/rfc6749#section-5.1
				// the access_token response key should be in the body. we're going to include it as a header for non-oauth implementations
				var token =
					this.options.tokenType === "X-Token"
						? response.headers.get("X-Token")
						: response.headers.get("Access_token");
				if (token !== undefined && token !== null) {
					this.setToken(token);

					if (this.sessionTimer !== undefined) {
						clearTimeout(this.sessionTimer);
					}
					this.sessionTimer = setTimeout(() => {
						this.refreshClientSession();
					}, this.options.sessionTimeout);
				} else {
					this.app.events.publish("auth.sessionTimeout");
				}
			}

			return response;
		} catch (error) {
			this.app.log.error(error);
			throw error;
		}
	}

	async genericFetch(method, url, body = null, headers = {}) {
		const params = {
			method: method,
			headers: headers,
		};

		if (body) {
			params.body = JSON.stringify(body);
		}

		return await this.fetch(url, params, true);
	}

	async readAll(moduleConfig) {
		return await this.genericFetch("GET", moduleConfig.url);
	}

	async create(moduleConfig, body) {
		const headers = {
			Accept: "application/json, application/xml, text/play, text/html, *.*",
			"Content-Type": "application/json; charset=utf-8",
		};
		return await this.genericFetch("POST", moduleConfig.url, body, headers);
	}

	async read(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		return await this.genericFetch("GET", fullUrl);
	}

	async update(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		const headers = {
			Accept: "application/json, application/xml, text/play, text/html, *.*",
			"Content-Type": "application/json; charset=utf-8",
		};
		return await this.genericFetch("PUT", fullUrl, params, headers);
	}

	async destroy(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		return await this.genericFetch("DELETE", fullUrl);
	}

	async invoke(moduleAction, params) {
		var mA = moduleAction.split(".");
		if (mA.length < 2) {
			this.app.log.error(
				"No action specified. Valid actions are: " +
					Object.keys(this.modules[mA[0]]).toString(),
			);
			return;
		}

		const moduleKey = mA[0];
		const actionKey = mA[1];

		if (typeof this.modules[moduleKey][actionKey] === "function") {
			return await this.modules[moduleKey][actionKey](params);
		} else if (typeof this.modules[moduleKey][actionKey] === "object") {
			const moduleConfig = this.modules[moduleKey][actionKey];
			switch (actionKey) {
				case "read":
					return await this.read(moduleConfig, params.toFlatObject());
				case "readAll":
					return await this.readAll(moduleConfig);
				case "create":
					return await this.create(moduleConfig, params.toFlatObject());
				case "update":
					return await this.update(moduleConfig, params.toFlatObject());
				case "destroy":
					return await this.destroy(moduleConfig, params.toFlatObject());
				default:
					// Handle custom methods
					return await this.invokeCustomMethod(moduleConfig, params);
			}
		} else {
			this.app.log.error(`Invalid action: ${actionKey}`);
		}
	}

	async invokeCustomMethod(moduleConfig, params) {
		// Extract method and URL from module config
		const method = (moduleConfig.params && moduleConfig.params.method) || "GET";
		const url = moduleConfig.url;

		// Prepare the full URL with parameters
		let fullUrl = url;
		if (typeof params === "object" && params !== null) {
			Object.keys(params).forEach((key) => {
				// Replace :key placeholders with actual values
				fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
			});
		}

		// Prepare headers and body
		const headers = {};
		let body = null;

		// Handle request body if present in params
		if (params.body) {
			body = JSON.stringify(params.body);
			headers["Content-Type"] = "application/json; charset=utf-8";
		}

		// Handle additional headers from module config
		if (moduleConfig.params && moduleConfig.params.headers) {
			Object.assign(headers, moduleConfig.params.headers);
		}

		const fetchParams = {
			method: method.toUpperCase(),
			headers: headers,
		};

		if (body) {
			fetchParams.body = body;
		}

		return await this.fetch(fullUrl, fetchParams, true);
	}
}

/**
 * Managed WebSocket session.
 *
 * Options:
 *   url             string, required — base URL or full ws[s]:// URL
 *   isSecure        boolean, default true — used when url has no scheme
 *   handleMessage   function(data), required — invoked on each parsed message
 *   onOpen          function(socket), optional — called after each successful open
 *                                       (use this to send subscribe/auth messages)
 *   ping            object, optional — { interval, timeout, send, isPong }
 *                     interval: ms between pings
 *                     timeout:  ms to wait for matching pong before force-closing
 *                     send:     function(socket) — emits the ping
 *                     isPong:   function(data) -> boolean — identifies pong messages
 *   beforeReconnect async function() -> boolean | void
 *                     Resolves true (or undefined) to proceed with reconnect.
 *                     Resolves false to give up permanently (e.g. user logged out).
 *                     Throws to treat as transient — backoff applies, will retry.
 *   backoff         { initial, max, jitter }, default { 1000, 30000, true }
 *   maxAttempts     number, default Infinity — give up after N consecutive failures
 *
 * Public API:
 *   .state          "idle" | "connecting" | "open" | "reconnecting" | "closed"
 *   .socket         current WebSocket (may be null between attempts)
 *   .send(data)     true if sent, false if not currently open
 *   .close()        explicit shutdown — no more reconnects
 */
class WebSocketSession {
	constructor(options, manager) {
		this._manager = manager;
		this._url = options.url;
		this._isSecure = options.isSecure ?? true;
		this._handleMessage = options.handleMessage;
		this._onOpen = options.onOpen;
		this._ping = options.ping;
		this._beforeReconnect = options.beforeReconnect;
		this._backoff = options.backoff || {
			initial: 1000,
			max: 30000,
			jitter: true,
		};
		this._maxAttempts = options.maxAttempts ?? Infinity;

		this._socket = null;
		this._state = "idle";
		this._attempts = 0;
		this._reconnectTimer = null;
		this._pingTimer = null;
		this._pongTimer = null;
		this._stableTimer = null;

		this._onlineHandler = () => this._onNetworkAvailable("online");
		this._visibilityHandler = () => {
			if (!document.hidden) this._onNetworkAvailable("visibility");
		};
	}

	get state() {
		return this._state;
	}
	get socket() {
		return this._socket;
	}

	start() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", this._onlineHandler);
		}
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", this._visibilityHandler);
		}
		this._connect();
	}

	send(data) {
		if (this._socket && this._socket.readyState === WebSocket.OPEN) {
			this._socket.send(data);
			return true;
		}
		return false;
	}

	close() {
		this._state = "closed";
		this._cleanupTimers();
		if (typeof window !== "undefined") {
			window.removeEventListener("online", this._onlineHandler);
		}
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", this._visibilityHandler);
		}
		if (this._socket && this._socket.readyState <= WebSocket.OPEN) {
			try {
				this._socket.close();
			} catch (e) {
				/* ignore — already closing */
			}
		}
		this._socket = null;
	}

	_connect() {
		if (this._state === "closed") return;

		let finalUrl;
		try {
			finalUrl = this._manager._buildWsUrl(this._url, this._isSecure);
		} catch (err) {
			// URL became invalid (e.g. token cleared mid-flight). Surface
			// and stop — retrying with the same input won't help.
			this._manager.app.log.error(
				"webSocketSession: URL build failed, stopping",
				err,
			);
			this._state = "closed";
			return;
		}

		this._state = "connecting";
		this._manager.app.log.trace(
			`webSocketSession: connecting (attempt ${this._attempts + 1}) to ${finalUrl}`,
		);

		let socket;
		try {
			socket = new WebSocket(finalUrl);
		} catch (err) {
			this._manager.app.log.error(
				"webSocketSession: WebSocket constructor threw",
				err,
			);
			this._scheduleReconnect();
			return;
		}
		this._socket = socket;

		socket.onopen = () => {
			this._state = "open";
			this._manager.app.log.trace("webSocketSession: open");
			this._manager.fireEvent("webSocketOpen", [socket]);
			if (this._onOpen) {
				try {
					this._onOpen(socket);
				} catch (err) {
					this._manager.app.log.error(
						"webSocketSession: onOpen threw",
						err,
					);
				}
			}
			this._startPing();
			// Only reset the attempt counter after the connection has
			// proven *stable* (open for STABLE_MS). Without this, a
			// server that drops the connection immediately after open
			// would keep `_attempts` at 1 forever and the reconnect
			// backoff would never grow past its initial delay (~1Hz
			// hammering). The cleanup path clears this timer if we
			// close before it fires, so flapping connections back off
			// properly.
			this._stableTimer = setTimeout(() => {
				this._attempts = 0;
				this._stableTimer = null;
			}, WebSocketSession.STABLE_MS);
		};

		socket.onerror = (error) => {
			this._manager.app.log.error("webSocketSession: error", error);
			this._manager.fireEvent("webSocketError", [error]);
			// Don't trigger reconnect here — onclose fires next.
		};

		socket.onclose = (event) => {
			this._manager.app.log.trace(
				`webSocketSession: closed (code ${event.code}, reason "${event.reason}")`,
			);
			this._manager.fireEvent("webSocketClose", [event]);
			this._cleanupTimers();
			if (this._state === "closed") return;
			this._scheduleReconnect();
		};

		socket.onmessage = async (event) => {
			let data;
			try {
				data = JSON.parse(event.data);
			} catch (err) {
				this._manager.app.log.error(
					"webSocketSession: message parse failed",
					err,
				);
				return;
			}
			if (this._ping && this._ping.isPong && this._ping.isPong(data)) {
				this._clearPongTimer();
			}
			try {
				const result = this._handleMessage(data);
				if (result && typeof result.then === "function") await result;
			} catch (err) {
				this._manager.app.log.error(
					"webSocketSession: handleMessage threw",
					err,
				);
			}
			this._manager.fireEvent("webSocketMessage", [data]);
		};
	}

	async _scheduleReconnect() {
		this._socket = null;
		this._cleanupTimers();
		if (this._state === "closed") return;
		if (this._attempts >= this._maxAttempts) {
			this._manager.app.log.error(
				"webSocketSession: max reconnect attempts exceeded, giving up",
			);
			this._state = "closed";
			return;
		}

		this._state = "reconnecting";
		this._attempts += 1;

		if (this._beforeReconnect) {
			try {
				const result = await this._beforeReconnect();
				if (result === false) {
					this._manager.app.log.trace(
						"webSocketSession: beforeReconnect returned false, stopping",
					);
					this._state = "closed";
					return;
				}
			} catch (err) {
				this._manager.app.log.error(
					"webSocketSession: beforeReconnect threw — treating as transient, will back off",
					err,
				);
				// fall through to schedule with backoff
			}
		}

		if (this._state === "closed") return;

		const delay = this._computeDelay();
		this._manager.app.log.trace(
			`webSocketSession: reconnect in ${delay}ms (attempt ${this._attempts})`,
		);
		this._reconnectTimer = setTimeout(() => {
			this._reconnectTimer = null;
			this._connect();
		}, delay);
	}

	_computeDelay() {
		const { initial, max, jitter } = this._backoff;
		const base = Math.min(
			initial * Math.pow(2, this._attempts - 1),
			max,
		);
		if (!jitter) return base;
		return Math.floor(base / 2 + Math.random() * (base / 2));
	}

	_onNetworkAvailable(source) {
		if (this._state !== "reconnecting" || !this._reconnectTimer) return;
		clearTimeout(this._reconnectTimer);
		this._reconnectTimer = null;
		this._manager.app.log.trace(
			`webSocketSession: ${source} signal — reconnecting now`,
		);
		this._connect();
	}

	_startPing() {
		if (!this._ping || !this._ping.send || !this._ping.interval) return;
		this._pingTimer = setInterval(() => {
			if (!this._socket || this._socket.readyState !== WebSocket.OPEN) return;
			try {
				this._ping.send(this._socket);
			} catch (err) {
				this._manager.app.log.error(
					"webSocketSession: ping send failed",
					err,
				);
				return;
			}
			if (this._ping.timeout && this._ping.isPong) {
				this._clearPongTimer();
				this._pongTimer = setTimeout(() => {
					this._manager.app.log.trace(
						"webSocketSession: pong timeout, force-closing",
					);
					if (this._socket && this._socket.readyState <= WebSocket.OPEN) {
						try {
							this._socket.close();
						} catch (e) {
							/* ignore */
						}
					}
				}, this._ping.timeout);
			}
		}, this._ping.interval);
	}

	_clearPongTimer() {
		if (this._pongTimer) {
			clearTimeout(this._pongTimer);
			this._pongTimer = null;
		}
	}

	_cleanupTimers() {
		if (this._pingTimer) {
			clearInterval(this._pingTimer);
			this._pingTimer = null;
		}
		this._clearPongTimer();
		if (this._reconnectTimer) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
		if (this._stableTimer) {
			clearTimeout(this._stableTimer);
			this._stableTimer = null;
		}
	}
}

// How long a WebSocket must stay open before we count it as a stable
// connection (and reset the reconnect attempt counter). 30s is enough
// to disambiguate "real connection" from "server is closing us in the
// first second"; if you find legitimate brief connections being treated
// as flapping, tune this down.
WebSocketSession.STABLE_MS = 30000;
