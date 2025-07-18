export class Application extends Component {
	constructor(options) {
		super();
		this.options = this._initializeOptions(options);
		this.name = this.options.name;
		this.util = new Util();
		this.init();
		this.log.info("Application initialized...");
	}

	_initializeOptions(options) {
		return {
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
			events: options?.events ?? {},
			logging: {
				logLevel: options?.logging?.logLevel ?? "ERROR,FATAL,INFO",
				toBrowserConsole: options?.logging?.toBrowserConsole ?? false,
			},
			model: options?.model ?? "altseven",
			name: options?.name ?? "a7",
			remote: options?.remote
				? {
						loginURL: options.remote.loginURL ?? "",
						logoutURL: options.remote.logoutURL ?? "",
						refreshURL: options.remote.refreshURL ?? "",
						useTokens: options?.auth?.useTokens ?? true,
						tokenType: options.remote.tokenType ?? "X-Token", // Authorization is the other token type
						modules: options.remote.modules ?? {},
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
	}

	init() {
		this.log = new LogManager(this);
		this.log.trace("application log init");

		this.log.trace("application services init");
		this.services = new ServiceManager(this);

		this.log.trace("application dataproviders init");
		this.dataproviders = new DataProviderManager(this);

		this.log.trace("application model init");
		this.model = new ModelManager(this);
		//await a7.model.init(this.options);
		// if there is an applicationName set, use that for the options store
		this.model.set(this.options?.applicationName ?? "a7", this.options);

		if (this.options.console.enabled) {
			this.log.trace("application console init");
			this.console = new Console(this);
		}

		if (this.options.security.enabled) {
			this.log.trace("application security init");
			// init user state
			// pass security options if they were defined
			this.security = new SecurityManager(this);
		}

		this.log.trace("application remote init");
		//pass remote modules if they were defined
		this.remote = new RemoteManager(this);

		this.log.trace("application events init");
		this.events = new EventManager(this);

		if (this.options.router) {
			this.log.trace("application router init");
			this.router = new RouterManager(this);
		}

		this.log.trace("application ui init");
		// initialize templating engine
		this.ui = new UIManager(this);

		if (this.options.security.enabled) {
			this.log.trace("application security init");
			this.security = new SecurityManager(this);
			this.error = new ErrorManager(this);
			// check whether user is authenticated

			var p = new Promise((resolve, reject) => {
				this.security.isAuthenticated(resolve, reject);
			});
			p.then((response) => {
				this.log.info(`Authenticated: ${response.authenticated}...`);
			});
		}

		return {};
	}
}
