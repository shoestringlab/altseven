var app = {
	main: ( function() {
		"use strict";

		return {
			init: function( state ){
				// cache initial selectors from index.html
				a7.UI.setSelector( 'mainDiv', document.querySelector( "div[name='main']" ) );
				a7.UI.setSelector( 'anonDiv', document.querySelector( "div[name='anon']" ) );
				a7.UI.setSelector( 'secureDiv', document.querySelector( "div[name='secure']" ) );
				a7.UI.setSelector( 'header', document.querySelector( "div[name='header']" ) );
				a7.UI.setSelector( 'app', document.querySelector( "div[name='app']" ) );

				app.ui.init();
				app.main.run( state.secure );
			},

			run : function( secure ){
				// render the login form
				var loginForm = a7.Components.Constructor( app.components.LoginForm, [ { selector : a7.UI.selectors[ 'anonDiv' ] } ], true );

				if( secure ){
					var user = a7.Model.get( "a7.user" ),
						header,
						todo;
					header = a7.Components.Constructor( app.components.Header, [ { selector : a7.UI.selectors[ 'header' ], user : user } ], true );
					todo = a7.Components.Constructor( app.components.Todo, [ { selector : a7.UI.selectors[ 'app' ] } ], true );
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
						a7.Security.isAuthenticated( resolve, reject );
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
				a7.UI.selectors[ ( secure ? 'secureDiv' : 'anonDiv' ) ].style.display = 'block';
				a7.UI.selectors[ ( ! secure ? 'secureDiv' : 'anonDiv' ) ].style.display = 'none';
			}
		};
	}())
};
