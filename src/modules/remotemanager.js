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

	webSocket(url, handleMessage) {
		const socket = new WebSocket(url);

		socket.onopen = () => {
			this.app.log.trace(`WebSocket connection to ${url} established.`);
			this.fireEvent("webSocketOpen", [socket]);
		};

		socket.onerror = (error) => {
			this.app.log.error(`WebSocket error:`, error);
			this.fireEvent("webSocketError", [error]);
		};

		socket.onclose = () => {
			this.app.log.trace(`WebSocket connection to ${url} closed.`);
			this.fireEvent("webSocketClose", []);
		};

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this.app.log.trace(`Received message:`, data);
			handleMessage(data);
			this.fireEvent("webSocketMessage", [data]);
		};

		this.connections[url] = socket;
		return socket;
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

	refreshClientSession() {
		var promise = new Promise((resolve, reject) => {
			this.invoke("auth.refresh", {
				resolve: resolve,
				reject: reject,
			});
		});

		promise
			.then((response) => {
				if (response.authenticated) {
					// session is still active, no need to do anything else
					this.app.log.trace("Still logged in.");
				}
			})
			.catch((error) => {
				this.app.events.publish("auth.logout");
			});
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
			login: (params) => {
				this.app.log.trace("remote call: auth.login");
				var request,
					args = {
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

				request = new Request(this.options.loginURL, args);

				var promise = fetch(request);

				promise
					.then((response) => {
						// set the token into sessionStorage so it is available if the browser is refreshed
						//
						var token =
							this.options.tokenType === "X-Token"
								? response.headers.get("X-Token")
								: response.headers.get("Access_token");
						if (token !== undefined && token !== null) {
							this.setToken(token);
						}
						return response.json();
					})
					.then((json) => {
						if (json.success) {
							var user = this.app.model.get("user");
							// map the response object into the user object
							Object.keys(json.user).map((key) => {
								user[key] = json.user[key];
							});
							// set the user into the sessionStorage and the model
							sessionStorage.user = JSON.stringify(user);
							this.app.model.set("user", user);

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
					});
			},
			logout: (params) => {
				this.app.log.trace("remote call: auth.logout");
				var request,
					args = {
						method: "POST",
						headers: {
							Authorization:
								"Basic " +
								this.app.util.base64.encode64(
									params.username + ":" + params.password,
								),
						},
					};

				request = new Request(this.options.logoutURL, args);

				var promise = fetch(request);

				promise
					.then((response) => {
						return response.json();
					})
					.then((json) => {
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
					});
			},
			refresh: (params) => {
				// refresh keeps the client session alive
				this.fetch(this.options.refreshURL, {}, true)
					// initial fetch needs to parse response
					.then((response) => {
						if (response.status === 401) {
							return { isauthenticated: false };
						} else {
							return response.json();
						}
					})
					.then((json) => {
						// then json is handled
						if (params.resolve !== undefined) {
							params.resolve(json);
						}
					})
					.catch((error) => {
						if (params.reject) {
							params.reject(error);
						}
					});
			},
		};

		// add the auth module
		this.setModule("auth", authModule);

		// add application modules
		Object.keys(modules).forEach((key) => {
			this.setModule(key, modules[key]);
		});
	}

	fetch(uri, params, secure) {
		this.app.log.trace("fetch: " + uri);
		var request, promise;

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
		request = new Request(uri, params);
		//calling the native JS fetch method ...
		promise = fetch(request);

		promise
			.then((response) => {
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
						this.sessionTimer = setTimeout(
							() => {
								this.refreshClientSession();
							},

							this.options.sessionTimeout,
						);
					} else {
						this.app.events.publish("auth.sessionTimeout");
					}
				}
			})
			.catch((error) => {
				this.app.log.error(error);
			});

		return promise;
	}
	genericFetch(method, url, body = null, headers = {}) {
		const params = {
			method: method,
			headers: headers,
		};

		if (body) {
			params.body = JSON.stringify(body);
		}

		return this.fetch(url, params, true);
	}

	readAll(moduleConfig) {
		return this.genericFetch("GET", moduleConfig.url);
	}

	create(moduleConfig, body) {
		const headers = {
			Accept: "application/json, application/xml, text/play, text/html, *.*",
			"Content-Type": "application/json; charset=utf-8",
		};
		return this.genericFetch("POST", moduleConfig.url, body, headers);
	}
	read(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		return this.genericFetch("GET", fullUrl);
	}

	update(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		const headers = {
			Accept: "application/json, application/xml, text/play, text/html, *.*",
			"Content-Type": "application/json; charset=utf-8",
		};
		return this.genericFetch("PUT", fullUrl, params, headers);
	}

	destroy(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		return this.genericFetch("DELETE", fullUrl);
	}

	invoke(moduleAction, params) {
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
			return this.modules[moduleKey][actionKey](params);
		} else if (typeof this.modules[moduleKey][actionKey] === "object") {
			const moduleConfig = this.modules[moduleKey][actionKey];
			switch (actionKey) {
				case "read":
					return this.read(moduleConfig, params.toFlatObject());
				case "readAll":
					return this.readAll(moduleConfig);
				case "create":
					return this.create(moduleConfig, params.toFlatObject());
				case "update":
					return this.update(moduleConfig, params.toFlatObject());
				case "destroy":
					return this.destroy(moduleConfig, params.toFlatObject());
				default:
					// Handle custom methods
					return this.invokeCustomMethod(moduleConfig, params);
			}
		} else {
			this.app.log.error(`Invalid action: ${actionKey}`);
		}
	}

	invokeCustomMethod(moduleConfig, params) {
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

		return this.fetch(fullUrl, fetchParams, true);
	}
}
// Usage example:
// const remoteManager = new RemoteManager();
// remoteManager.init({}, () => { console.log('RemoteManager initialized'); });
// remoteManager.webSocket('ws://example.com/socket', (message) => { console.log(message); });
