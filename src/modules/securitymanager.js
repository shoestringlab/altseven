class SecurityManager extends Component {
	constructor(options) {
		super();

		a7.log.info("Security initializing...");
		this.useModel = options.model.length > 0 ? true : false;
		this.userArgs = options.security.userArgs ? options.security.userArgs : [];
		let user = this.getUser();
		this.setUser(user);
	}

	async isAuthenticated(resolve, reject) {
		a7.log.info("Checking authenticated state.. ");
		let response = await new Promise((resolve, reject) => {
			a7.remote.invoke("auth.refresh", {
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
		clearTimeout(a7.remote.getSessionTimer());
		a7.remote.invalidateToken();
		let user = new a7.components.User(this.userArgs);
		this.setUser(user);
	}

	setUser(user) {
		if (this.useModel) {
			a7.model.set("user", user);
		}
		sessionStorage.user = JSON.stringify(user);
	}

	getUser() {
		let suser, user;
		let mUser = this.useModel ? a7.model.get("user") : null;
		if (typeof mUser !== "undefined" && mUser !== "" && mUser !== null) {
			user = mUser;
		} else if (sessionStorage.user && sessionStorage.user !== "") {
			suser = JSON.parse(sessionStorage.user);
			user = new a7.components.User(this.userArgs);
			Object.keys(suser).map((key) => (user[key] = suser[key]));
		}
		return user;
	}
}

// Usage example:
// const securityManager = new SecurityManager();
// securityManager.init({ /* your options here */ });
