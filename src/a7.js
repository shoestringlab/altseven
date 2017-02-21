var a7 = ( function() {
	"use strict";

	return {
		// initialization
		// 1. sets console and templating options
		// 2. initializes user object
		// 3. checks user auth state
		// 4. renders initial layout
		init : function( options, initResolve, initReject ){
			var pr, p0, p1, p2;

			options.model = ( options.model !== undefined ? options.model : ( typeof gadgetui === 'object' ? "gadgetui" : "" ) );
			if( options.model === "" ){
				// model required
				initReject( "No model specified." );
			}

			pr = new Promise( function( resolve, reject ){
				a7.Log.trace( "a7 - model init" );
				a7.Model.init( options, resolve, reject );
			});

			pr
			.then( function(){
				a7.Model.set( "a7", {
					auth: {
						sessionTimeout : ( options.auth.sessionTimeout || ( 60 * 15 * 1000 ) )
					},
					console : {
						enabled : ( options.console.enabled || false ),
						wsServer : ( options.console.wsServer || "" ),
						top : ( options.console.top || 0 ),
						right : ( options.console.right || 0 )
					},
					logging : {
						logLevel: ( options.logging.logLevel || "ERROR,FATAL,INFO" )
					},
					model : options.model,
					remote: {
						// modules: ( options.remote.modules | undefined ) // don't set into Model since they are being registered in Remote
						loginURL : ( options.remote.loginURL || "" ),
						refreshURL : ( options.remote.refreshURL || "" ),
						useTokens : ( options.auth.useTokens || true )
					},
					UI: {
						renderer : ( typeof Mustache === 'object' ? "Mustache" : ( typeof Handlebars === 'object' ? "Handlebars" : "" ) ),
						templates : ( options.UI.templates || undefined )
					},
					ready : false,
					user : ""
				});
			})

			.then( function(){
				p0 = new Promise( function( resolve, reject ){
					if( a7.Model.get( "a7.console.enabled" ) ){
						a7.Log.trace( "a7 - console init" );
						a7.Console.init( resolve, reject );
					}else{
						resolve();
					}
				});

				p0
				.then( function(){
					a7.Log.trace( "a7 - log init" );
					a7.Log.init();
				})
				.then( function(){
					a7.Log.trace( "a7 - security init" );
					// init user state
					a7.Security.init();
				})
				.then( function(){
					a7.Log.trace( "a7 - remote init" );
					a7.Remote.init( options.remote.modules );
				})
				.then( function(){
					a7.Log.trace( "a7 - events init" );
					a7.Events.init();
				})
				.then( function(){
					p1 = new Promise( function( resolve, reject ){
						a7.Log.trace( "a7 - layout init" );
						// initialize templating engine
						a7.UI.init( resolve, reject );
					});

					p1.then( function(){
						p2 = new Promise( function( resolve, reject ){
							a7.Log.trace( "a7 - isSecured" );
							// check whether user is authenticated
							a7.Security.isAuthenticated( resolve, reject );
						});

						p2.then( function( secure ){
							a7.Log.info( "Authenticated: " + secure + "..." );
							a7.Log.info( "Init complete..." );
							initResolve( { secure : secure } );
						});

						p2['catch']( function( message ){
							a7.Log.error( message );
							initReject();
						});
					});
				});

				p0['catch']( function( message ){
					a7.Log.error( message );
					initReject();
				});
			});

			pr['catch']( function( message ){
				a7.Log.error( message );
				initReject();
			});
		}
	/*	,

		deinit: function(){
			// return state to default
			a7.Model.set( "a7.user", "" );
			//a7.Model.set( "a7.token", "" );
			sessionStorage.removeItem( "user" );
			sessionStorage.removeItem( "token" );
		}	*/
	};
}());
