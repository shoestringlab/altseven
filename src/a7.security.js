a7.Security = ( function() {
	"use strict";

	var _isSecure = function( resolve, reject ){
		a7.Log.info( "Checking secured state.. " );
		if( a7.Model.get( "useTokens" ) ){
			var token = a7.Model.get( "token" );
			if( token !== undefined &&  token !== null && token.length > 0 ){
				// if there is a valid token, check authentication state with the server
				a7.Events.publish( "user.refresh", { resolve: resolve, reject: reject });
			}else{
				//a7.Events.publish( "a7.deinit" );
				resolve( false );
			}
		}
	};

	return {
		isSecure : _isSecure,
		// initialization 
		// 1. creates a new a7.User object
		// 2. checks sessionStorage for user string
		// 3. populates User object with stored user information in case of 
		// 	  browser refresh
		// 4. sets User object into a7.Model

		init : function( options ) {
			a7.Log.info( "Security initializing..." );
			var suser, keys, user = a7.Objects.Constructor( a7.Objects.User, [], true );
			if ( sessionStorage.user && sessionStorage.user !== '' ) {
				suser = JSON.parse( sessionStorage.user );
				Object.keys( suser ).map( function( key ) {
					user[ key ] = suser[ key ];
				});
			}
			a7.Model.set( "user", user );

			// set token if valid
			if ( a7.Model.get( "useTokens" ) && sessionStorage.token && sessionStorage.token !== '' ) {
				a7.Model.set( "token", sessionStorage.token );
			}
		}
	};
}());
