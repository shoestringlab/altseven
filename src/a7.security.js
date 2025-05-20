a7.security = (function () {
	"use strict";

	let _userArgs = [],
		_useModel = false;

	var _isAuthenticated = async function (resolve, reject) {
			a7.log.info("Checking authenticated state.. ");
			let response = await new Promise((resolve, reject) => {
				a7.remote.invoke("auth.refresh", {
					resolve: resolve,
					reject: reject,
				});
			});

			if (response.authenticated) {
				_setUser(response.user);
			}
			resolve(response);
		},
		_invalidateSession = function () {
			clearTimeout(a7.remote.getSessionTimer());
			a7.remote.invalidateToken();
			var user = new a7.components.User(_userArgs);
			_setUser(user);
		},
		_setUser = function (user) {
			// if the app uses a model, set the user into the model
			if (_useModel) {
				a7.model.set("user", user);
			}
			sessionStorage.user = JSON.stringify(user);
		},
		_getUser = function () {
			// create a base user
			let suser, user;
			let mUser = _useModel ? a7.model.get("user") : null;
			if (typeof mUser !== "undefined" && mUser !== "" && mUser !== null) {
				user = mUser;
			} else if (sessionStorage.user && sessionStorage.user !== "") {
				suser = JSON.parse(sessionStorage.user);
				user = new a7.components.User(_userArgs);
				Object.keys(suser).map(function (key) {
					user[key] = suser[key];
				});
			}
			return user;
		};

	return {
		invalidateSession: _invalidateSession,
		isAuthenticated: _isAuthenticated,
		setUser: _setUser,
		getUser: _getUser,
		// initialization
		// 1. creates a new user object
		// 2. checks sessionStorage for user string
		// 3. populates User object with stored user information in case of
		// 	  browser refresh
		// 4. sets User object into a7.model

		init: function (theOptions) {
			a7.log.info("Security initializing...");
			let options = theOptions.security.options;
			let _useModel = theOptions.model.length > 0 ? true : false;
			// initialize and set the user
			_userArgs = options.userArgs ? options.userArgs : [];
			let user = _getUser(_userArgs);
			_setUser(user);
		},
	};
})();
