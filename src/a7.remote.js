a7.remote = ( function(){
	var _options = {},
		_time = new Date(),
		_token,
		_sessionTimer,
		_modules = {},

		_setModule = function( key, module ){
			_modules[ key ] = module;
		};

	var _webSocket = function( wsServer, messageHandler, isJSON ){
		if( wsServer ){
			window.WebSocket = window.WebSocket || window.MozWebSocket;

			// if browser doesn't support WebSocket, just show some
			// notification and exit
			if (!window.WebSocket) {
				a7.log.error( "Your browser doesn't support WebSockets." );
				return;
			}

			// open connection
			let connection = new WebSocket( wsServer );

			connection.onopen = function() {
				a7.log.info( "Connecting to the socket server at " + wsServer );
			};

			connection.onerror = function() {
				var message = "Can't connect to the socket server at " + wsServer;
				a7.log.error( message );
			};

			// most important part - incoming messages
			connection.onmessage = function( message ) {
				if( isJSON ){
					var json;
					// try to parse JSON message. Because we know that the
					// server always returns
					// JSON this should work without any problem but we should
					// make sure that
					// the message is not chunked or otherwise damaged.
					try {
						json = JSON.parse( message.data );
					} catch (er) {
						a7.log.error( "This doesn't look like valid JSON: ", message.data );
						return;
					}
					messageHandler( message, json );
				} else{
					messageHandler( message );
				}

			};

			window.addEventListener("close", function() {
				connection.close();
			});

			return connection;
		}
	}

	return{

		webSocket : _webSocket,
		getToken : function(){
			return _token;
		},

		getSessionTimer : function(){
				return _sessionTimer;
		},

		init: function( modules ){
			var auth = a7.model.get( "a7" ).auth;
			_options = a7.model.get( "a7" ).remote;

			_options.sessionTimeout = auth.sessionTimeout;
			// set token if valid
			if( _options.useTokens && sessionStorage.token && sessionStorage.token !== '' ) {
				_token = sessionStorage.token;
			}

			var authModule = {
					login: function( params ){
						a7.log.trace( "remote call: auth.login" );
						var request,
								args = { 	method: 'POST',
										headers: {
											"Authorization": "Basic " + a7.util.base64.encode64( params.username + ":" + params.password )
										}
								};

						request = new Request( _options.loginURL , args );

						var promise = fetch( request );

						promise
							.then( function( response ) {
								var token = response.headers.get("X-Token");
								if( token !== undefined && token !== null ){
									_token = token;
									sessionStorage.token = token;
								}
								return response.json();
							})
							.then( function( json ){
								var user = a7.model.get( "user" );
								Object.keys( json.user ).map( function( key ) {
									user[ key ] = json.user[ key ];
								});
								sessionStorage.user = JSON.stringify( user );
								a7.model.set( "user", user );
								if( params.callback !== undefined ){
									params.callback( json );
								}
							});
					},
					logout: function( params ){
						a7.log.trace( "remote call: auth.logout" );
						var request,
								args = { 	method: 'POST',
										headers: {
											"Authorization": "Basic " + a7.util.base64.encode64( params.username + ":" + params.password )
										}
								};

						request = new Request( _options.logoutURL , args );

						var promise = fetch( request );

						promise
							.then( function( response ) {
								var token = "";
								if( token !== undefined && token !== null ){
									_token = token;
									sessionStorage.token = token;
								}
								return response.json();
							})
							.then( function( json ){
								var user = a7.components.Constructor(a7.components.User, [], true);
								sessionStorage.user = JSON.stringify( user );
								a7.model.set( "user", user );
								if( params.callback !== undefined ){
									params.callback();
								}
							});
					},
					refresh: function( params ){
						a7.remote.fetch( _options.refreshURL, {}, true )
						// initial fetch needs to parse response
						.then( function( response ){
							return response.json();
						})
						.then( function( json ){
							// then json is handled
							if( params.resolve !== undefined ){
								params.resolve( json.success );
							}
						});
					}
				};

			// add the auth module
			_setModule( "auth", authModule );

			// add application modules
			Object.keys( modules ).forEach( function( key ){
				_setModule( key, modules[ key ] );
			});
		},

		fetch: function( uri, params, secure ){
			a7.log.info( "fetch: " + uri );
			var request,
					promise;

			//if secure and tokens, we need to check timeout and add X-Token header
			if( secure && _options.useTokens ){
				var currentTime = new Date( ),
						diff = Math.abs( currentTime - _time ),
						minutes = Math.floor( ( diff / 1000 ) / 60 );

				if( minutes > _options.sessionTimeout ){
					// timeout
					a7.events.publish( "auth.sessionTimeout" );
					return;
				}else if( _token !== undefined && _token !== null ){
					// set X-Token
					if( params.headers === undefined ){
						params.headers = {
							"X-Token": _token
						};
					}else{
						params.headers["X-Token"] = _token;
					}
				}

				_time = currentTime;
			}
			request = new Request( uri, params );
			//calling the native JS fetch method ...
			promise = fetch( request );

			promise
				.then( function( response ){
					if( secure && _options.useTokens ){
						var token = response.headers.get( "X-Token" );
						if( token !== undefined && token !== null ){
							_token = token;
							sessionStorage.token = token;

							if( _sessionTimer !== undefined ){
								clearTimeout( _sessionTimer );
							}
							_sessionTimer =	setTimeout( function(){ a7.remote.invoke( "auth.refresh" ); }, _options.sessionTimeout );

						} else{
							a7.events.publish( "auth.sessionTimeout" );
						}
					}
				});

			return promise;
		},

		invoke: function( moduleAction, params ){
			var mA = moduleAction.split( "." );
			// if no action specified, return the list of actions
			if( mA.length < 2 ){
				a7.log.error( "No action specified. Valid actions are: " + Object.keys( _modules[ mA[ 0 ] ] ).toString() );
				return;
			}
			if( typeof _modules[ mA[ 0 ] ][ mA[ 1 ] ] === "function" ){
			//	_modules[ mA[ 0 ] ][ mA[ 1 ] ].apply( _modules[ mA[ 0 ] ][ mA[ 1 ] ].prototype, params );
				_modules[ mA[ 0 ] ][ mA[ 1 ] ]( params );
			}
		}
	};
}());
