class SecurityManager extends Component {
	constructor(app) {
		super();
		this.app = app;

		this.app.log.info("Security initializing...");
		this.useModel = this.app.options.model.length > 0 ? true : false;
		this.userArgs = this.app.options.security.userArgs
			? this.app.options.security.userArgs
			: [];
		let user = this.getUser();
		this.setUser(user);
	}

	async isAuthenticated(resolve, reject) {
		this.app.log.info("Checking authenticated state.. ");
		let response = await new Promise((resolve, reject) => {
			this.app.remote.invoke("auth.refresh", {
				resolve: resolve,
				reject: reject,
			});
		});

		if (response.authenticated) {
			this.setUser(response.user);
		}
		resolve(response);
	}

	invalidateSession() {
		clearTimeout(this.app.remote.getSessionTimer());
		this.app.remote.invalidateToken();
		let user = new User(this.userArgs);
		this.setUser(user);
	}

	setUser(user) {
		if (this.useModel) {
			this.app.model.set("user", user);
		}
		sessionStorage.user = JSON.stringify(user);
	}

	getUser() {
		let suser, user;
		let mUser = this.useModel ? this.app.model.get("user") : null;
		if (typeof mUser !== "undefined" && mUser !== "" && mUser !== null) {
			user = mUser;
		} else if (sessionStorage.user && sessionStorage.user !== "") {
			suser = JSON.parse(sessionStorage.user);
			user = new User(this.userArgs);
			Object.keys(suser).map((key) => (user[key] = suser[key]));
		}
		return user;
	}
}

// Usage example:
// const securityManager = new SecurityManager();
// securityManager.init({ /* your options here */ });
