a7.Remote = ( function(){
	var _options = {},
		_time = new Date(),
		_token,
		_sessionTimer,
		_modules = {},
		hOP = _modules.hasOwnProperty,

		_setModule = function( key, module ){
			_modules[ key ] = module;
		};

	return{
		getToken : function(){
			return _token;
		},
		init: function( _modules ){
			_options = a7.Model.get( "a7.remote" );
			_options.sessionTimeout = a7.Model.get( "a7.auth.sessionTimeout" );
			// set token if valid
			if ( _options.useTokens && sessionStorage.token && sessionStorage.token !== '' ) {
				_token = sessionStorage.token;
			}

			var authModule = {
					login: function( username, password, callback ){
						var headers = new Headers(),
							request,
							params = { 	method: 'POST', 
										headers: {
											"Authorization": "Basic " + a7.Util.base64.encode64( username + ":" + password )
										} 
									};
	
						request = new Request( _options.loginURL , params );
	
						var promise = fetch( request )
	
						promise
							.then( function( response ) {
								var token = response.headers.get("X-Token");
								if( token !== undefined && token !== null ){
									_token = token;
									sessionStorage.token = token;
								}
							});
						if( callback !== undefined ){
							callback( promise );
						}
					},
					refresh: function( params ){
						a7.Remote.fetch( _options.refreshURL, params, true )
						.then( function( response ) {
							return response.json();
						})
						.then( function( json ){
							a7.Log.info( JSON.stringify( json ) );
						});
					}
				};

			_setModule( "auth", authModule );

			Object.keys( _modules ).forEach( function( key ){
				_setModule( key, _modules[ key ] );
			});

		},

		fetch: function( uri, params, secure ){
			a7.Log.info( "fetch: " + uri );
			if( secure ){
				var headers = ( params.headers || new Headers() ),
					currentTime = new Date( ),
					request,
					promise,
					diff = Math.abs( currentTime - _time ), 
					minutes = Math.floor( ( diff / 1000 ) / 60 );
	
				if( minutes > _options.sessionTimeout ){
					// timeout
					
				}else if( _token !== undefined && _token !== null ){
					headers.set( "X-Token", _token );
				}

				if ( _sessionTimer !== undefined ) {
					clearTimeout( _sessionTimer );
					_sessionTimer = undefined;
				}
	
				_time = currentTime;
				
				request = new Request( uri, params );
				promise = fetch( request );
				
				promise
					.then( function( response ){
						var token = response.headers.get( "X-Token" );
						if( token !== undefined && token !== null ){
							_token = token;
							sessionStorage.token = token;
							
							if ( _sessionTimer === undefined ) {
								_sessionTimer = setTimeout( function( ) {
								a7.Events.publish( "auth.refresh" );
								}, _options.sessionTimeout );
							}
							
							if( params.resolve !== undefined ){
								params.resolve( true );
							}
						} else{
							if( params.resolve !== undefined ){
								params.resolve( false );
							}
							a7.Events.publish( "auth.sessionTimeout" );
						}
						//console.log( JSON.stringify( response, null, 4) );
					});
				/*	
				if( json.status === "Not authorized" && json.code === 401 ){
					//abort existing calls and empty the queue
					for( ix = 0; ix < queue.length; ix++ ){
						//don't abort the current request, it is complete.
						if( queue[ ix ] !== jqXHR ){
							queue[ ix ].abort();
						}
					}
					if( this.url === "/index.cfm/api/auth/login" ){
						if( opts.options.loginUI !== undefined ){
							opts.options.loginUI.clearOverlay();
							opts.options.loginUI.selector.effect( "shake" );
						}
						//app.ui.alert( "Authentication", "Login failed. Please check your credentials and try again." );
					}
					$.publish( "app.deinit" );
					queue = [];

				}else{
					console.log( "checking token for url: " + this.url );
					token = jqXHR.getResponseHeader( "X-Token" );
					if( token !== undefined && token !== null ){
						app.model.set( "token", token );
						sessionStorage.token = token;
					}

					if ( app.model.get( "user.userid" ) > 0 ) {
						if ( app.getToken === undefined ) {
							app.getToken = setTimeout( function( ) {
							$.publish( "user.refresh" );
							}, 100000 );
						}
					}				
					deferred.resolve.apply( this, arguments );
				}
			});
			jqXHR.fail( function() {
			    deferred.reject.apply( this, arguments );
			});

			jqXHR.always( function(){
				var ix, data, status, xhr, response, token; 
				if( arguments[1] === 'success' ){
					data = arguments[ 0 ];
					status = arguments[1];
					xhr = arguments[ 2 ];
				}else{
					xhr = arguments[ 0 ];
					status = arguments[1];
					error = arguments[ 2 ];       		
				}
				try{
					response = JSON.parse( xhr.responseText );
				}catch( e ){
					response = { error : false, messages: "" };
				}
				// remove request from the queue
				for( ix = 0; ix < queue.length; ix++ ){
					if( queue[ ix ] === jqXHR ){
						queue.splice( ix, 1 );
					}
				}
			});	*/
			
			return promise;
				
			}else{
				return fetch( uri, params );
			}
				
		},

		// a7.Remote.invoke( 'user.refresh', params );
		invoke: function( moduleAction, params ){
			var mA = moduleAction.split( "." );
			// if no action specified, return the list of actions
			if( mA.length < 2 ){
				a7.Log.error( "No action specified. Valid actions are: " + Object.keys( _modules[ mA[ 0 ] ] ).toString() );
				return;
			}
			if( typeof _modules[ mA[ 0 ] ][ mA[ 1 ] ] === "function" ){
				_modules[ mA[ 0 ] ][ mA[ 1 ] ]( params );
			}
		}
	};
}());