var a7 = (function () {
	"use strict";
	return {
		// initialization
		// 1. sets console and templating options
		// 2. initializes user object
		// 3. checks user auth state
		// 4. renders initial layout
		init: function (options, initResolve, initReject) {
			var pr, p0, p1, p2;

			options.model = options.model !== undefined ? options.model : "altseven";
			if (options.model === "") {
				// model required
				initReject("A model is required, but no model was specified.");
			}
			const theOptions = {
				auth: {
					sessionTimeout: options?.auth?.sessionTimeout ?? 15 * 60 * 1000, // 15 minutes
				},
				console: options?.console
					? {
							enabled: options.console.enabled ?? false,
							wsServer: options.console.wsServer ?? "",
							container:
								options.console.container ??
								(typeof gadgetui === "object"
									? gadgetui.display.FloatingPane
									: ""),
							top: options.console.top ?? 100,
							left: options.console.left ?? 500,
							width: options.console.width ?? 500,
							height: options.console.height ?? 300,
						}
					: {},
				logging: {
					logLevel: options?.logging?.logLevel ?? "ERROR,FATAL,INFO",
					toBrowserConsole: options?.logging?.toBrowserConsole ?? false,
				},
				model: options?.model,
				remote: options?.remote
					? {
							loginURL: options.remote.loginURL ?? "",
							logoutURL: options.remote.logoutURL ?? "",
							refreshURL: options.remote.refreshURL ?? "",
							useTokens: options?.auth?.useTokens ?? true,
							tokenType: options.remote.tokenType ?? "X-Token", // Authorization is the other token type
						}
					: { useTokens: true },
				router: options?.router
					? {
							options: {
								useEvents: options.router.useEvents ?? true,
							},
							routes: options.router.routes,
						}
					: undefined,
				// security.userArgs: { userID: "" }, etc..
				security: options?.security
					? {
							enabled: options.security.enabled ?? true,
							options: options.security.options ?? {},
						}
					: { enabled: true, options: {} },

				ui: {
					renderer:
						options?.ui?.renderer ??
						(typeof Mustache === "object"
							? "Mustache"
							: typeof Handlebars === "object"
								? "Handlebars"
								: "templateLiterals"),
					debounceTime: options?.ui?.debounceTime ?? 18,
					timeout: options?.ui?.timeout ?? 600000, // 10 minutes
				},
				ready: false,
			};

			pr = new Promise(function (resolve, reject) {
				a7.log.trace("a7 - model init");
				a7.model.init(theOptions, resolve, reject);
			});

			pr.then(function () {
				a7.model.set("a7", theOptions);
			}).then(function () {
				p0 = new Promise(function (resolve, reject) {
					if (a7.model.get("a7").console.enabled) {
						a7.log.trace("a7 - console init");
						a7.console.init(theOptions, resolve, reject);
					} else {
						resolve();
					}
				});

				p0.then(function () {
					a7.log.trace("a7 - log init");
					a7.log.init();

					if (theOptions.security.enabled) {
						a7.log.trace("a7 - security init");
						// init user state
						// pass security options if they were defined
						a7.security.init(theOptions);
					}
					a7.log.trace("a7 - remote init");
					//pass remote modules if they were defined
					a7.remote.init(
						options.remote && options.remote.modules
							? options.remote.modules
							: {},
					);
					a7.log.trace("a7 - events init");
					a7.events.init();
					// init the router if it is being used
					if (theOptions.router) {
						a7.log.trace("a7 - router init");
						a7.router.init(theOptions.router.options, theOptions.router.routes);
					}
					// init the ui templating engine
					p1 = new Promise(function (resolve, reject) {
						a7.log.trace("a7 - layout init");
						// initialize templating engine
						a7.ui.init(resolve, reject);
					});

					p1.then(function () {
						if (theOptions.security.enabled) {
							p2 = new Promise(function (resolve, reject) {
								a7.log.trace("a7 - isSecured");
								// check whether user is authenticated
								a7.security.isAuthenticated(resolve, reject);
							});

							p2.then(function (response) {
								a7.error.init();
								a7.log.info("Authenticated: " + response.authenticated + "...");
								a7.log.info("Init complete...");
								initResolve(response);
							});

							p2["catch"](function (message) {
								a7.log.error(message);
								initReject();
							});
						} else {
							initResolve({});
						}
					});
				});

				p0["catch"](function (message) {
					a7.log.error(message);
					initReject();
				});
			});

			pr["catch"](function (message) {
				a7.log.error(message);
				initReject();
			});
		},
	};
})();
