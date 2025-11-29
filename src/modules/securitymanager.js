class SecurityManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		app.log.info("Security initializing...");
		this.useModel = this.options.model.length > 0 ? true : false;
		this.userArgs = this.options.security.userArgs
			? this.options.security.userArgs
			: {};
		let user = this.getUser();
		this.setUser(user);
	}

	async isAuthenticated() {
		this.app.log.trace("Checking authenticated state.. ");

		// Check if there's an outstanding auth.refresh call
		if (this.authRefreshPromise) {
			this.app.log.trace("Waiting for existing auth.refresh call to complete");
			return await this.authRefreshPromise;
		}

		// Create a new promise for the auth.refresh call
		this.authRefreshPromise = new Promise(async (resolve, reject) => {
			try {
				let response = await this.app.remote.invoke("auth.refresh", {
					resolve: resolve,
					reject: reject,
				});

				if (response.authenticated) {
					this.setUser(response.user);
				}
				this.app.log.trace("Resolving the response... ");
				resolve(response);
			} catch (error) {
				reject(error);
			} finally {
				// Clear the promise reference when done
				this.authRefreshPromise = null;
			}
		});

		// Return the promise so callers can await it
		return await this.authRefreshPromise;
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
		} else if (
			typeof sessionStorage.user !== "undefined" &&
			sessionStorage.user !== ""
		) {
			try {
				//try to parse the user data
				suser = JSON.parse(sessionStorage.user);
				user = new User(this.userArgs);
				Object.keys(suser).map((key) => (user[key] = suser[key]));
			} catch (e) {
				// Handle error parsing user data
				console.error("Error parsing user data:", e);
				user = new User(this.userArgs);
			}
		} else {
			user = new User(this.userArgs);
		}
		return user;
	}
}

// Usage example:
// const securityManager = new SecurityManager();
// securityManager.init({ /* your options here */ });
