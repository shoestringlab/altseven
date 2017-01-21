var a7 = ( function() {
		"use strict";

		return {
			// initialization 
			// 1. sets debug and templating options
			// 2. initializes user object
			// 3. checks user auth state
			// 4. renders initial layout
			init : function( options ){
				var p0, p1, p2;

				a7.Model.set( "debug", options.debug || { enabled: false } );
				a7.Model.set( "useTokens", options.useTokens || true );
				a7.Model.set( "renderer", options.renderer || "mustache" );
				a7.Model.set( "running", false );

				p0 = new Promise( function( resolve, reject ){
					if( a7.Model.get( "debug.enabled" ) ){
						a7.Debug.init( resolve, reject );
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
						});
						
						p2['catch']( function( message ){
							a7.Log.error( message );
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

a7.Debug = ( function() {
	"use strict";

	var title = "Debug Window", 
		// width of window relative to it's container ( i.e. browser window )
		width = "50%",
		// the div we'll create to host the debug content
		debugDiv,
		// flag whether debug is running
		active = false,
		_addMessage = function( message, dt, source, level ) {
			var div = document.createElement( "div" );
			div.setAttribute( "class", "a7-debug-row-" + source );
			if( level !== undefined ){
				div.innerHTML = level + ": ";
				div.setAttribute( "class", div.getAttribute( "class" ) +  " a7-debug-row-" + level );
			}
			div.innerHTML += +( dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours() ) + ':' + ( dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes() ) + ': ' + message;
			debugDiv.appendChild( div );
		};

	return {
		init : function( resolve, reject ) {
			var debug = a7.Model.get( "debug" ),
				top = ( debug.top === undefined ? 0 : debug.top ), 
				right = ( debug.right === undefined ? 0 : debug.right );
			// check for debug state
			if ( debug.enabled ) {
				active = true;
				debugDiv = document.createElement( "div" );
				debugDiv.setAttribute( "id", "debugDiv" );
				debugDiv.setAttribute( "class", "a7-debug" );
				document.body.append( debugDiv );
				var connection,
					fp = new gadgetui.display.FloatingPane( debugDiv, {
						width : width,
						title : title,
						opacity : 0.7,
						position : "absolute",
						right : right,
						top : top
					} );
				
				fp.selector.setAttribute( "right", 0 );

				window.WebSocket = window.WebSocket || window.MozWebSocket;

				// if browser doesn't support WebSocket, just show some
				// notification and exit
				if ( !window.WebSocket ) {
					debugDiv.innerHTML( "Your browser doesn't support WebSockets." );
					return;
				}

				// open connection
				connection = new WebSocket( debug.wsServer );

				connection.onopen = function() {
					//a7.Log.info( "Debug initializing..." );
				};

				connection.onerror = function( error ) {
					var message =  "Can't connect to the debug socket server.";
					if ( debug.enabled ) {
						// just in there were some problems with conenction...
						_addMessage( message, new Date(), "local" );
					}else{
						a7.Log.error( message );
					}
					
				};

				// most important part - incoming messages
				connection.onmessage = function( message ) {
					var json, ix;
					// try to parse JSON message. Because we know that the
					// server always returns
					// JSON this should work without any problem but we should
					// make sure that
					// the massage is not chunked or otherwise damaged.
					try {
						json = JSON.parse( message.data );
					} catch ( er ) {
						a7.Log.error( "This doesn't look like valid JSON: ", message.data );
						return;
					}

					if ( json.type === 'history' ) { // entire message
														// history
						// insert every single message to the chat window
						for ( ix = 0; ix < json.data.length; ix++ ) {
							_addMessage( json.data[ ix ].text, new Date( json.data[ ix ].time ), "websocket" );
						}
					} else if ( json.type === 'message' ) { // it's a single
															// message
						_addMessage( json.data.text, new Date( json.data.time ), "websocket" );
					} else {
						a7.Log.error( "This doesn't look like valid JSON: ", json );
					}
				};

				window.addEventListener( "close", function( event ) {
					connection.close();
				} );

				a7.Debug.addMessage = _addMessage;
				a7.Log.info( "Debug initializing..." );
				resolve();
			}else{
				// debugging init should not run if debug is set to false
				reject( "Debug init should not be called when debug option is set to false." );
			}

		}
	};

}() );
// courtesy David Walsh
// https://davidwalsh.name/pubsub-javascript
// MIT License http://opensource.org/licenses/MIT

a7.Events = ( function() {
	"use strict";
	var topics = {},
		hOP = topics.hasOwnProperty;

	return {
		subscribe : function( topic, listener ) {
			// Create the topic's object if not yet created
			if ( !hOP.call( topics, topic ) ){
				topics[ topic ] = [];
			}

			// Add the listener to queue
			var index = topics[ topic ].push( listener ) - 1;

			// Provide handle back for removal of topic
			return {
				remove : function() {
					delete topics[ topic ][ index ];
				}
			};
		},
		publish : function( topic, info ) {
			// If the topic doesn't exist, or there's no listeners in queue,
			// just leave
			if ( !hOP.call( topics, topic ) ){
				return;
			}

			// Cycle through topics queue, fire!
			topics[ topic ].forEach( function( item ) {
				item( info || {} );
			} );
		}
	};
}());
a7.Layout = ( function() {
		"use strict";

		var _selectors = {},
			_templateMap = {},

		_setSelector = function( name, selector ){
			_selectors[ name ] = selector;
		},

		_addTemplate = function( key, html ){
			_templateMap[ key ] = html.trim();
		},

		_loadTemplates = function( templates, resolve, reject ){
			var ot = Math.ceil( Math.random( ) * 500 );

			switch( a7.Model.get( "renderer" ) ){
				case "mustache":
					fetch( templates + '?' + ot )
						.then( function( response ) {
							return response.text();
						})
						.then( function( text ){
							a7.Log.info( "Loading Mustache templates... " );
							var parser = new DOMParser(),
								doc = parser.parseFromString( text, "text/html" ),
								scripts = doc.querySelectorAll( "script" );
							scripts.forEach( function( script ){
								_addTemplate( script.getAttribute( "id" ), script.innerHTML );
							});
							resolve();
						});

					break;
				case "handlebars":
					//not implemented
					resolve();
					break;
			}
		},
		
		_render = function( template, params ){
			switch( a7.Model.get( "renderer" ) ){
			case "mustache":
				Mustache.render( _templateMap[ template ], params );
				break;
			}
		};

		return{
			render : _render,
			selectors: _selectors,
			setSelector: _setSelector,
			init : function( options, resolve, reject ){
				var renderers = "handlebars,mustache";
				a7.Log.info( "Layout initializing..." );
				if( renderers.indexOf( a7.Model.get( "renderer" ) ) >=0 ){
					a7.Model.set( "templatesLoaded", false );
					if( options.templates !== undefined ){
						_loadTemplates( options.templates, resolve, reject );
					}
				}else{
					resolve();
				}
			}
		};

}( ) );
a7.Log = ( function(){
	// logging levels ALL < TRACE < INFO < WARN < ERROR < FATAL < OFF
	var logLevel = "ERROR,FATAL,INFO",
		_log = function( message, level ){
			if( logLevel.indexOf( level ) >=0 || logLevel.indexOf( "ALL" ) >=0 ){
				console.log( message );
				if( a7.Model.get( "debug.enabled" ) ){
					a7.Debug.addMessage( message, new Date(), "local", level );
				}
			}
		};

	return{
		init: function( options ){
			logLevel = ( options.logLevel !== undefined ? options.logLevel : "ERROR,FATAL,INFO" );
			a7.Log.info( "Log initializing..." );
		},
		error: function( message ){
			_log( message, "ERROR" );
		},
		fatal: function( message ){
			_log( message, "FATAL" );
		},
		info: function( message ){
			_log( message, "INFO" );
		},
		trace: function( message ){
			_log( message, "TRACE" );
		},
		warn: function( message ){
			_log( message, "WARN" );
		}
	};
}());
a7.Model = gadgetui.model;
a7.Objects = ( function() {"use strict";function Constructor( constructor, args, addBindings ) {
	var ix, 
		returnedObj, 
		obj;

	if( addBindings === true ){
		//bindings = EventBindings.getAll();
		EventBindings.getAll().forEach( function( binding ){
			if( constructor.prototype[ binding ] === undefined ) {
				constructor.prototype[ binding ] = binding.func;
			}
		});
	}

	// construct the object
	obj = Object.create( constructor.prototype );
	returnedObj = constructor.apply( obj, args );
	if( returnedObj === undefined ){
		returnedObj = obj;
	}

	if( addBindings === true ){
		// create specified event list from prototype
		returnedObj.events = {};
		if( constructor.prototype.events !== undefined ){
			constructor.prototype.events.forEach( function( event ){
				returnedObj.events[ event ] = [ ];
			});
		}
	}

	return returnedObj;
	
}

/*
 * EventBindings
 * author: Robert Munn <robert.d.munn@gmail.com>
 * 
 */

var EventBindings = {
	on : function( event, func ){
		if( this.events[ event ] === undefined ){
			this.events[ event ] = [];
		}
		this.events[ event ].push( func );
		return this;
	},
	
	off : function( event ){
		// clear listeners
		this.events[ event ] = [];
		return this;
	},
	
	fireEvent : function( key, args ){
		var _this = this;
		this.events[ key ].forEach( function( func ){
			func( _this, args );
		});
	},
	
	getAll : function(){
		return [ { name : "on", func : this.on }, 
		         { name : "off", func : this.off },
				 { name : "fireEvent", func : this.fireEvent } ];
	}
};
function User(){
	// init User
	return this;
}

User.prototype.getMemento = function(){
	var user = {}, self = this;
	Object.keys( this ).forEach( function( key ){
		user[ key ] = self[ key ];
	});
	return user;
};
return {
	Constructor : Constructor,
	EventBindings : EventBindings,
	User: User
};}());
a7.Remote = ( function(){
	var modules = {},
		hOP = modules.hasOwnProperty;

	return{
		setModule: function( key, module ){
			modules[ key ] = module;
		},

		// a7.Remote.invoke( 'user.refresh', params );
		invoke: function( moduleAction, params ){
			var mA = moduleAction.split( "." );
			// if no action specified, return the list of actions
			if( mA.length < 2 ){
				a7.Log.error( "No action specified. Valid actions are: " + Object.keys( modules[ mA[ 0 ] ] ).toString() );
				return;
			}
			if( typeof modules[ mA[ 0 ] ][ mA[ 1 ] ] === "function" ){
				modules[ mA[ 0 ] ][ mA[ 1 ] ]( params );
			}
		}
	};
}());
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

//# sourceMappingURL=a7.js.map