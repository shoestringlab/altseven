var a7 = ( function() {
		"use strict";

		return {
			// initialization 
			// 1. sets console and templating options
			// 2. initializes user object
			// 3. checks user auth state
			// 4. renders initial layout
			init : function( options, initResolve, initReject ){
				var p0, p1, p2;

				a7.Model.set( "console", options.console || { enabled: false } );
				a7.Model.set( "useTokens", options.useTokens || true );
				a7.Model.set( "renderer", options.renderer || "mustache" );
				a7.Model.set( "running", false );

				p0 = new Promise( function( resolve, reject ){
					if( a7.Model.get( "console.enabled" ) ){
						a7.Console.init( resolve, reject );
					}else{
						resolve();
					}
				});

				p0
				.then( function(){
					a7.Log.trace( "a7 - log init" );
					a7.Log.init( options );
				})
				.then( function(){
					a7.Log.trace( "a7 - security init" );
					// init user state
					a7.Security.init( options );					
				})
				.then( function(){
					p1 = new Promise( function( resolve, reject ){
						a7.Log.trace( "a7 - layout init" );
						// initialize templating engine
						a7.Layout.init( options, resolve, reject );					
					});

					p1.then( function(){
						p2 = new Promise( function( resolve, reject ){
							a7.Log.trace( "a7 - isSecured" );
							// check whether user is authenticated
							a7.Security.isSecure( resolve, reject );
						});
						
						p2.then( function( secure ){
							a7.Log.info( "Init complete. Authenticated: " + secure );
							//a7.run( secure );
							initResolve();
						});
						
						p2['catch']( function( message ){
							a7.Log.error( message );
							initReject();
						});					
					});					
				});

				p0['catch']( function( message ){
					a7.Log.error( message );
				});	
			},

			deinit: function(){
				// return state to default
				a7.Model.destroy( "user" );
				a7.Model.destroy( "token" );
				a7.Model.destroy( "X-Token" );
				a7.Model.set( "running", false );

				sessionStorage.removeItem( "user" );
				sessionStorage.removeItem( "token" );
			}
		};
	}());
