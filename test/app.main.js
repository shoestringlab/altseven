var app = {
	main: ( function() {
		"use strict";

		return {
			init: function( state ){
				// cache initial selectors from index.html
				a7.ui.setSelector( 'mainDiv', document.querySelector( "div[name='main']" ) );
				a7.ui.setSelector( 'anonDiv', document.querySelector( "div[name='anon']" ) );
				a7.ui.setSelector( 'secureDiv', document.querySelector( "div[name='secure']" ) );
				a7.ui.setSelector( 'header', document.querySelector( "div[name='header']" ) );
				a7.ui.setSelector( 'app', document.querySelector( "div[name='app']" ) );

				app.main.run( state.secure );
			},

			run : function( secure ){
				// render the login form
				var loginForm = a7.components.Constructor( app.components.LoginForm, [ { selector : a7.ui.selectors[ 'anonDiv' ] } ], true );

				if( secure ){
					var user = a7.model.get( "a7.user" ),
							header = a7.components.Constructor( app.components.Header, [ { selector : a7.ui.selectors[ 'header' ], user : user } ], true ),
							todo = a7.components.Constructor( app.components.Todo, [ { selector : a7.ui.selectors[ 'app' ] } ], true );
				}
				app.ui.setLayout( secure );
			}
		};
	}()),

	auth: ( function() {
		"use strict";

			var _authenticate = function(){
					var promise = new Promise( function( resolve, reject ){
						// check whether user is authenticated
						a7.security.isAuthenticated( resolve, reject );
					});

					promise.then( function( secure ){
						app.main.run( secure );
					});
			};

		return {
			authenticate : _authenticate,
			loginHandler: function( json ){
				app.main.run( json.success );
			}
		};
	}()),

	ui: ( function() {
		"use strict";

		return {
			setLayout: function( secure ){
				a7.ui.selectors[ ( secure ? 'secureDiv' : 'anonDiv' ) ].style.display = 'block';
				a7.ui.selectors[ ( ! secure ? 'secureDiv' : 'anonDiv' ) ].style.display = 'none';
			}
		};
	}())
};
