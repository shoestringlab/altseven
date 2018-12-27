import altseven from '../dist/a7.js';

var a7 = altseven();

var app = {
	main: (function() {
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
				a7.ui.setView( 'loginForm', a7.components.Constructor( app.components.LoginForm, [ { selector : a7.ui.selectors[ 'anonDiv' ] } ], true ) );

				if( secure ){
					var user = a7.model.get( "a7.user" );

					a7.ui.setView( 'header', a7.components.Constructor( app.components.Header, [ { selector : a7.ui.selectors[ 'header' ], user : user } ], true ) );
					a7.ui.setView( 'todo', a7.components.Constructor( app.components.Todo, [ { selector : a7.ui.selectors[ 'app' ] } ], true ) );
				}
				app.ui.setLayout( secure );
			}
		};
	})(),

	auth: (function() {
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
	})(),
	components: (function(){

	  function Todo( props ){
	    this.config( props );
	    this.state = { text : "", items: [] };
	    this.render();
	  }

	  Todo.prototype = {
	    config : function( props ){
	      this.selector = props.selector;
	    },

	    render : function(){
	      this.selector.innerHTML = a7.ui.render( "todoForm", { text : this.state.text, next : this.state.items.length + 1, items :  this.state.items }, { todoList : a7.ui.getTemplate( "todoList" ) } );
	      this.todoSelector = document.querySelector( "div[name='todoForm']" );
	      this.inputSelector = document.querySelector( "input[name='todoInput']" );
	      this.buttonSelector = document.querySelector( "button[name='todoSubmit']" );
	      this.setEventHandlers();
	    },

	    setEventHandlers : function(){
	      var self = this;
	      this.inputSelector.addEventListener( "change", function( event ){
	        self.state.text = event.target.value;
	      });

	      this.buttonSelector.addEventListener( "click", function( event ){
	        event.preventDefault();
	        var newItem = {
	          text: self.state.text,
	          id: Date.now()
	        },
	        newState = {
	          items: self.state.items.concat( newItem ),
	          text: ''};
	        self.state = newState;
	        self.render();
	      });
	    }
	  };

	  function LoginForm( props ){
	    this.config( props );
	    this.state = { username : "", password: "" };
	    this.render();
	  }

	  LoginForm.prototype = {
	    config : function( props ){
	      this.selector = props.selector;
	    },

	    render : function(){
	      // render login
	      this.selector.innerHTML = a7.ui.render( "loginForm", {} );
	      this.selector.innerHTML += a7.ui.render( "instructions", {} );
	      this.setEventHandlers();
	    },

	    setEventHandlers : function(){
	      var loginButton = document.querySelector( "input[name='login']" );

	      loginButton.addEventListener( "click", function( event ){
	        a7.events.publish( "auth.login", { username: 	document.querySelector( "input[name='username']" ).value,
	                                           password:  document.querySelector( "input[name='password']" ).value,
	                                           callback: app.auth.loginHandler } );
	      });
	    }
	  };

	  function Header( props ){
	    this.config( props );
	    this.state = { user : props.user };
	    this.render();
	  }

	  Header.prototype = {
	    config : function( props ){
	      this.selector = props.selector;
	    },

	    render : function(){
	      // render Header
	      this.selector.innerHTML = a7.ui.render( "header", this.state.user );
	      this.setEventHandlers();
	    },

	    setEventHandlers : function(){
	      var signout = document.querySelector( "a[name='signout']" );

	      signout.addEventListener( "click", function( event ){
	        a7.events.publish( "auth.signout", [] );
	      });
	    }
	  };

	  return{
	    Todo : Todo,
	    LoginForm : LoginForm,
	    Header : Header
	  };

	})(),
	remote:{},
	ui: (function() {
		"use strict";

		return {
			setLayout: function( secure ){
				a7.ui.selectors[ ( secure ? 'secureDiv' : 'anonDiv' ) ].style.display = 'block';
				a7.ui.selectors[ ( ! secure ? 'secureDiv' : 'anonDiv' ) ].style.display = 'none';
			}
		};
	})()
};



export default function init(){

	var options = {
			auth: { // sessionTimeout: ( 60 * 15 * 1000 ) // default time in
				//milliseconds to refresh system auth
			},
			console: {
				enabled: true,
				wsServer: 'ws://www.altseven.home:8000',
				top: 100,
				left: 500,
				height: 300,
				width: 500
			},
			logging: {
				logLevel: "INFO,ERROR,FATAL,TRACE"
			},
			remote: {
				modules: app.remote,
				loginURL: "/test/auth.cfc?method=login",
				refreshURL: "/test/auth.cfc?method=refresh",
				useTokens: true // defaults to true for the auth system
			},
			ui: { // renderer: // renderer is implicitly set by existence of the templating library, currently Mustache or Handlebars
				templates: "/test/templates.html"
			}
			};
		var p = new Promise(function(resolve, reject) {
			a7.init(options, resolve, reject);
		});
		p.then(function(state) {
			app.main.init(state);
			console.log( "App init.");
		});
		p['catch'](function(message) {
			console.log(message);
		});

	return app;
};
