a7.Security = ( function() {
	"use strict";

	var _options = {},
		_isAuthenticated = function( resolve, reject ){
			a7.Log.info( "Checking authenticated state.. " );
			if( a7.Model.get( "a7.user").userId !== undefined ){
				resolve( true );
			}else{
				if( a7.Model.get( "a7.remote.useTokens" ) ){
					var token = a7.Remote.getToken();
					if( token !== undefined &&  token !== null && token.length > 0 ){
							var timer = a7.Remote.getSessionTimer();
							// if the timer isn't defined, that means the app just reloaded, so we need to refresh against the server
							if( timer === undefined ){
								a7.Log.info( "Refreshing user..." );
								// if there is a valid token, check authentication state with the server
								a7.Events.publish( "auth.refresh", [ resolve, reject ] );
							}else{
								resolve( true );
							}
					}else{
						//a7.Events.publish( "a7.auth.invalidateSession" );
						resolve( false );
					}
				}
			}
		};

	return {
		isAuthenticated : _isAuthenticated,
		// initialization
		// 1. creates a new a7.User object
		// 2. checks sessionStorage for user string
		// 3. populates User object with stored user information in case of
		// 	  browser refresh
		// 4. sets User object into a7.Model

		init : function() {
			a7.Log.info( "Security initializing..." );
			var suser, keys, user = a7.Components.Constructor( a7.Components.User, [], true );
			if ( sessionStorage.user && sessionStorage.user !== '' ) {
				suser = JSON.parse( sessionStorage.user );
				Object.keys( suser ).map( function( key ) {
					user[ key ] = suser[ key ];
				});
			}
			a7.Model.set( "a7.user", user );
		}
	};
}());
