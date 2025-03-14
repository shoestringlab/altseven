a7.security = (function () {
	'use strict'

	let _userArgs = []

	var _isAuthenticated = function (resolve, reject) {
			a7.log.info('Checking authenticated state.. ')
			if (a7.model.get('a7').remote.useTokens) {
				var token = a7.remote.getToken()
				if (token !== undefined && token !== null && token.length > 0) {
					var timer = a7.remote.getSessionTimer()
					// if the timer isn't defined, that means the app just reloaded, so we need to refresh against the server
					if (timer === undefined) {
						a7.log.info('Refreshing user...')
						// if there is a valid token, check authentication state with the server
						a7.events.publish('auth.refresh', {
							resolve: resolve,
							reject: reject,
						})
					} else {
						resolve({ authenticated: true })
					}
				} else {
					resolve({ authenticated: false })
				}
			}
		},
		_invalidateSession = function () {
			clearTimeout(a7.remote.getSessionTimer())
			a7.remote.invalidateToken()
			var user = a7.components.Constructor(
				a7.components.User,
				_userArgs,
				true
			)
			sessionStorage.user = JSON.stringify(user)
			a7.model.set('user', user)
		}

	return {
		invalidateSession: _invalidateSession,
		isAuthenticated: _isAuthenticated,
		// initialization
		// 1. creates a new user object
		// 2. checks sessionStorage for user string
		// 3. populates User object with stored user information in case of
		// 	  browser refresh
		// 4. sets User object into a7.model

		init: function (options) {
			a7.log.info('Security initializing...')
			_userArgs = options.userArgs ? options.userArgs : []
			var suser,
				user = a7.components.Constructor(
					a7.components.User,
					_userArgs,
					true
				)
			if (sessionStorage.user && sessionStorage.user !== '') {
				suser = JSON.parse(sessionStorage.user)
				Object.keys(suser).map(function (key) {
					user[key] = suser[key]
				})
			}
			a7.model.set('user', user)
		},
	}
})()
