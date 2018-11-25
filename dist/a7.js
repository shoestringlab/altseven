var a7 = (function() {
  "use strict";

  return {
    // initialization
    // 1. sets console and templating options
    // 2. initializes user object
    // 3. checks user auth state
    // 4. renders initial layout
    init: function(options, initResolve, initReject) {
      var pr, p0, p1, p2;

      options.model =
        options.model !== undefined
          ? options.model
          : typeof gadgetui === "object"
          ? "gadgetui"
          : "";
      if (options.model === "") {
        // model required
        initReject("No model specified.");
      }

      pr = new Promise(function(resolve, reject) {
        a7.log.trace("a7 - model init");
        a7.model.init(options, resolve, reject);
      });

      pr.then(function() {
        a7.model.set("a7", {
          auth: {
            sessionTimeout: options.auth.sessionTimeout || 60 * 15 * 1000
          },
          console: {
            enabled: options.console.enabled || false,
            wsServer: options.console.wsServer || "",
            top: options.console.top || 100,
            left: options.console.left || 100,
            width: options.console.width || 500,
            height: options.console.height || 300
          },
          logging: {
            logLevel: options.logging.logLevel || "ERROR,FATAL,INFO"
          },
          model: options.model,
          remote: {
            // modules: ( options.remote.modules | undefined ) // don't set into Model since they are being registered in Remote
            loginURL: options.remote.loginURL || "",
            refreshURL: options.remote.refreshURL || "",
            useTokens: options.auth.useTokens || true
          },
          ui: {
            renderer:
              typeof Mustache === "object"
                ? "Mustache"
                : typeof Handlebars === "object"
                ? "Handlebars"
                : "",
            templates: options.ui.templates || undefined
          },
          ready: false,
          user: ""
        });
      }).then(function() {
        p0 = new Promise(function(resolve, reject) {
          if (a7.model.get("a7.console.enabled")) {
            a7.log.trace("a7 - console init");
            a7.console.init(resolve, reject);
          } else {
            resolve();
          }
        });

        p0.then(function() {
          a7.log.trace("a7 - log init");
          a7.log.init();
        })
          .then(function() {
            a7.log.trace("a7 - security init");
            // init user state
            a7.security.init();
          })
          .then(function() {
            a7.log.trace("a7 - remote init");
            a7.remote.init(options.remote.modules);
          })
          .then(function() {
            a7.log.trace("a7 - events init");
            a7.events.init();
          })
          .then(function() {
            p1 = new Promise(function(resolve, reject) {
              a7.log.trace("a7 - layout init");
              // initialize templating engine
              a7.ui.init(resolve, reject);
            });

            p1.then(function() {
              p2 = new Promise(function(resolve, reject) {
                a7.log.trace("a7 - isSecured");
                // check whether user is authenticated
                a7.security.isAuthenticated(resolve, reject);
              });

              p2.then(function(secure) {
                a7.log.info("Authenticated: " + secure + "...");
                a7.log.info("Init complete...");
                initResolve({
                  secure: secure
                });
              });

              p2["catch"](function(message) {
                a7.log.error(message);
                initReject();
              });
            });
          });

        p0["catch"](function(message) {
          a7.log.error(message);
          initReject();
        });
      });

      pr["catch"](function(message) {
        a7.log.error(message);
        initReject();
      });
    }
    /*	,

		deinit: function(){
			// return state to default
			a7.model.set( "a7.user", "" );
			//a7.model.set( "a7.token", "" );
			sessionStorage.removeItem( "user" );
			sessionStorage.removeItem( "token" );
		}	*/
  };
})();

a7.console = (function() {
  "use strict";

  var title = "Console Window",
    // the div we'll create to host the console content
    consoleDiv,
    // flag whether console is running
    active = false,
    _addMessage = function(message, dt, source, level) {
      var div = document.createElement("div");
      div.setAttribute("class", "a7-console-row-" + source);
      if (level !== undefined) {
        div.innerHTML = level + ": ";
        div.setAttribute(
          "class",
          div.getAttribute("class") + " a7-console-row-" + level
        );
      }
      div.innerHTML +=
        +(dt.getHours() < 10 ? "0" + dt.getHours() : dt.getHours()) +
        ":" +
        (dt.getMinutes() < 10 ? "0" + dt.getMinutes() : dt.getMinutes()) +
        ": " +
        message;
      consoleDiv.appendChild(div);
    };

  return {
    init: function(resolve, reject) {
      var console = a7.model.get("a7.console");

      // check for console state
      if (console.enabled) {
        active = true;
        consoleDiv = document.createElement("div");
        consoleDiv.setAttribute("id", "consoleDiv");
        consoleDiv.setAttribute("class", "a7-console");
        document.body.append(consoleDiv);
        var connection,
          fp = a7.components.Constructor(
            gadgetui.display.FloatingPane,
            [
              consoleDiv,
              {
                width: console.width,
                left: console.left,
                height: console.height,
                title: title,
                top: console.top
              }
            ],
            false
          );

        fp.selector.setAttribute("right", 0);

        window.WebSocket = window.WebSocket || window.MozWebSocket;

        // if browser doesn't support WebSocket, just show some
        // notification and exit
        if (!window.WebSocket) {
          consoleDiv.innerHTML("Your browser doesn't support WebSockets.");
          return;
        }

        // open connection
        connection = new WebSocket(console.wsServer);

        connection.onopen = function() {
          //a7.log.info( "Console initializing..." );
        };

        connection.onerror = function() {
          var message = "Can't connect to the console socket server.";
          if (console.enabled) {
            // just in there were some problems with conenction...
            _addMessage(message, new Date(), "local");
          } else {
            a7.log.error(message);
          }
        };

        // most important part - incoming messages
        connection.onmessage = function(message) {
          var json, ix;
          // try to parse JSON message. Because we know that the
          // server always returns
          // JSON this should work without any problem but we should
          // make sure that
          // the massage is not chunked or otherwise damaged.
          try {
            json = JSON.parse(message.data);
          } catch (er) {
            a7.log.error("This doesn't look like valid JSON: ", message.data);
            return;
          }

          if (json.type === "history") {
            // entire message
            // history
            // insert every single message to the chat window
            for (ix = 0; ix < json.data.length; ix++) {
              _addMessage(
                json.data[ix].text,
                new Date(json.data[ix].time),
                "websocket"
              );
            }
          } else if (json.type === "message") {
            // it's a single
            // message
            _addMessage(json.data.text, new Date(json.data.time), "websocket");
          } else {
            a7.log.error("This doesn't look like valid JSON: ", json);
          }
        };

        window.addEventListener("close", function() {
          connection.close();
        });

        a7.console.addMessage = _addMessage;
        a7.log.info("Console initializing...");
        resolve();
      } else {
        // console init should not run if console is set to false
        reject(
          "Console init should not be called when console option is set to false."
        );
      }
    }
  };
})();

a7.error = (function() {
  "use strict";

  var _captureError = function(msg, url, lineNo, columnNo, error) {
    var string = msg.toLowerCase();
    var substring = "script error";
    if (string.indexOf(substring) > -1) {
      a7.log.error("Script Error: See Browser Console for Detail");
    } else {
      var message = [
        "Message: " + msg,
        "URL: " + url,
        "Line: " + lineNo,
        "Column: " + columnNo,
        "Error object: " + JSON.stringify(error)
      ].join(" - ");

      a7.log.error(message);
    }
  };

  window.onerror = function(msg, url, lineNo, columnNo, error) {
    a7.error.captureError(msg, url, lineNo, columnNo, error);
    return false;
  };

  return {
    capture: function() {},
    captureError: _captureError
  };
})();

// derived from work by David Walsh
// https://davidwalsh.name/pubsub-javascript
// MIT License http://opensource.org/licenses/MIT

a7.events = (function() {
  "use strict";
  var topics = {},
    hasProp = topics.hasOwnProperty;

  return {
    subscribe: function(topic, listener) {
      // Create the topic's object if not yet created
      if (!hasProp.call(topics, topic)) {
        topics[topic] = [];
      }

      // Add the listener to queue
      var index = topics[topic].push(listener) - 1;

      // Provide handle back for removal of topic
      return {
        remove: function() {
          delete topics[topic][index];
        }
      };
    },
    init: function() {
      a7.events.subscribe("auth.login", function(params) {
        a7.remote.invoke("auth.login", params);
      });
      a7.events.subscribe("auth.refresh", function(params) {
        a7.remote.invoke("auth.refresh", params);
      });
      a7.events.subscribe("auth.sessionTimeout", function() {
        //	a7.remote.invoke( "auth.sessionTimeout" );
      });
      a7.events.subscribe("auth.invalidateSession", function() {
        //	a7.remote.invoke( "auth.sessionTimeout" );
      });
    },
    publish: function(topic, info) {
      a7.log.trace("event: " + topic);
      // If the topic doesn't exist, or there's no listeners in queue,
      // just leave
      if (!hasProp.call(topics, topic)) {
        return;
      }

      // Cycle through topics queue, fire!
      topics[topic].forEach(function(item) {
        item(info || {});
      });
    }
  };
})();

a7.log = ( function(){
	// logging levels ALL < TRACE < INFO < WARN < ERROR < FATAL < OFF
	var _ready = false,
		_deferred = [],
		_logLevel = "ERROR,FATAL,INFO",
		_log = function( message, level ){
			if( _ready && _logLevel.indexOf( level ) >=0 || _logLevel.indexOf( "ALL" ) >=0 ){
				//console.log( message );
				if( a7.model.get( "a7.console.enabled" ) ){
					a7.console.addMessage( message, new Date(), "local", level );
				}
			} else if( ! _ready ){
				// store log messages before init so they can be logged after init
				_deferred.push( { message: message, level: level } );
			}
		};

	return{
		init: function(){

			_logLevel = a7.model.get( "a7.logging" ).logLevel;
			_ready = true;
			_deferred.forEach( function( item ){
				_log( item.message, item.level );
			});
			_deffered = [];
			a7.log.info( "Log initializing..." );
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

a7.model = ( function() {
	"use strict";
	var _model,
		_methods = {};

	return {
		create : function(){
			return _methods[ "create" ].apply( _model, arguments );
		},
		destroy : function(){
			return _methods[ "destroy" ].apply( _model, arguments );
		},
		get : function(){
			return _methods[ "get" ].apply( _model, arguments );
		},
		set : function(){
			return _methods[ "set" ].apply( _model, arguments );
		},
		exists : function(){
			return _methods[ "exists" ].apply( _model, arguments );
		},
		bind : function(){
			return _methods[ "bind" ].apply( _model, arguments );
		},
		init: function( options, resolve ){
			a7.log.info( "Model initializing... " );
			switch( options.model ){
				case "gadgetui":
					_model = gadgetui.model;
					// gadgetui maps directly, so we can loop on the keys
					Object.keys( gadgetui.model ).forEach( function( key ){
						if( key !== "BindableObject" ){
							_methods[ key ] = gadgetui.model[ key ];
						}
					});
					break;
			}
			resolve();
		}
	};

}() );

a7.components = (function() {
  "use strict";
  function Constructor(constructor, args, addBindings) {
    var returnedObj, obj;

    if (addBindings === true) {
      //bindings = EventBindings.getAll();
      EventBindings.getAll().forEach(function(binding) {
        if (constructor.prototype[binding] === undefined) {
          constructor.prototype[binding] = binding.func;
        }
      });
    }

    // construct the object
    obj = Object.create(constructor.prototype);
    returnedObj = constructor.apply(obj, args);
    if (returnedObj === undefined) {
      returnedObj = obj;
    }

    if (addBindings === true) {
      // create specified event list from prototype
      returnedObj.events = {};
      if (constructor.prototype.events !== undefined) {
        constructor.prototype.events.forEach(function(event) {
          returnedObj.events[event] = [];
        });
      }
    }

    return returnedObj;
  }

  /*
 * EventBindings
 * author: Robert Munn <robertdmunn@gmail.com>
 *
 */

  var EventBindings = {
    on: function(event, func) {
      if (this.events[event] === undefined) {
        this.events[event] = [];
      }
      this.events[event].push(func);
      return this;
    },

    off: function(event) {
      // clear listeners
      this.events[event] = [];
      return this;
    },

    fireEvent: function(key, args) {
      var _this = this;
      this.events[key].forEach(function(func) {
        func(_this, args);
      });
    },

    getAll: function() {
      return [
        { name: "on", func: this.on },
        { name: "off", func: this.off },
        { name: "fireEvent", func: this.fireEvent }
      ];
    }
  };

  function User() {
    // init User
    return this;
  }

  User.prototype.getMemento = function() {
    var user = {},
      self = this;
    Object.keys(this).forEach(function(key) {
      user[key] = self[key];
    });
    return user;
  };

  return {
    Constructor: Constructor,
    EventBindings: EventBindings,
    User: User
  };
})();
//

a7.remote = ( function(){
	var _options = {},
		_time = new Date(),
		_token,
		_sessionTimer,
		_modules = {},

		_setModule = function( key, module ){
			_modules[ key ] = module;
		};

	return{
		getToken : function(){
			return _token;
		},

		getSessionTimer : function(){
				return _sessionTimer;
		},

		init: function( _modules ){
			_options = a7.model.get( "a7.remote" );
			_options.sessionTimeout = a7.model.get( "a7.auth" ).sessionTimeout;
			// set token if valid
			if( _options.useTokens && sessionStorage.token && sessionStorage.token !== '' ) {
				_token = sessionStorage.token;
			}

			var authModule = {
					login: function( username, password, callback ){
						var request,
								params = { 	method: 'POST',
										headers: {
											"Authorization": "Basic " + a7.util.base64.encode64( username + ":" + password )
										}
								};

						request = new Request( _options.loginURL , params );

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
								var user = a7.model.get( "a7.user" );
								Object.keys( json.user ).map( function( key ) {
									user[ key ] = json.user[ key ];
								});
								sessionStorage.user = JSON.stringify( user );
								a7.model.set( "a7.user", user );
								if( callback !== undefined ){
									callback( json );
								}
							});


					},
					refresh: function( resolve ){
						a7.remote.fetch( _options.refreshURL, {}, true )
						.then( function( response ){
							return response.json();
						})
						.then( function( json ){
							if( resolve !== undefined ){
								resolve( json.success );
							}
						});
					}
				};

			// add the auth module
			_setModule( "auth", authModule );

			// add application modules
			Object.keys( _modules ).forEach( function( key ){
				_setModule( key, _modules[ key ] );
			});

		},

		fetch: function( uri, params, secure ){
			a7.log.info( "fetch: " + uri );
			var request,
					promise;
			if( secure && _options.useTokens ){
				var currentTime = new Date( ),
						diff = Math.abs( currentTime - _time ),
						minutes = Math.floor( ( diff / 1000 ) / 60 );

				if( minutes > _options.sessionTimeout ){
					// timeout
					a7.events.publish( "auth.sessionTimeout" );
					return;
				}else if( _token !== undefined && _token !== null ){
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
				_modules[ mA[ 0 ] ][ mA[ 1 ] ].apply( _modules[ mA[ 0 ] ][ mA[ 1 ] ], params );
			}
		}
	};
}());

a7.security = (function() {
  "use strict";

  var _isAuthenticated = function(resolve, reject) {
    a7.log.info("Checking authenticated state.. ");
    if (a7.model.get("a7.remote.useTokens")) {
      var token = a7.remote.getToken();
      if (token !== undefined && token !== null && token.length > 0) {
        var timer = a7.remote.getSessionTimer();
        // if the timer isn't defined, that means the app just reloaded, so we need to refresh against the server
        if (timer === undefined) {
          a7.log.info("Refreshing user...");
          // if there is a valid token, check authentication state with the server
          a7.events.publish("auth.refresh", [resolve, reject]);
        } else {
          resolve(true);
        }
      } else {
        resolve(false);
      }
    }
  };

  return {
    isAuthenticated: _isAuthenticated,
    // initialization
    // 1. creates a new a7.User object
    // 2. checks sessionStorage for user string
    // 3. populates User object with stored user information in case of
    // 	  browser refresh
    // 4. sets User object into a7.model

    init: function() {
      a7.log.info("Security initializing...");
      var suser,
        user = a7.components.Constructor(a7.components.User, [], true);
      if (sessionStorage.user && sessionStorage.user !== "") {
        suser = JSON.parse(sessionStorage.user);
        Object.keys(suser).map(function(key) {
          user[key] = suser[key];
        });
      }
      a7.model.set("a7.user", user);
    }
  };
})();

a7.ui = (function() {
  "use strict";

  var _options = {},
    _selectors = {},
    _templateMap = {},
    _setSelector = function(name, selector) {
      _selectors[name] = selector;
    },
    _getSelector = function(name) {
      return _selectors[name];
    },
    _addTemplate = function(key, html) {
      switch (_options.renderer) {
        case "Mustache":
          _templateMap[key] = html.trim();
          break;
        case "Handlebars":
          _templateMap[key] = Handlebars.compile(html.trim());
          break;
      }
    },
    _loadTemplates = function(resolve) {
      var ot = Math.ceil(Math.random() * 500);

      switch (_options.renderer) {
        case "Mustache":
        case "Handlebars":
          fetch(_options.templates + "?" + ot)
            .then(function(response) {
              return response.text();
            })
            .then(function(text) {
              a7.log.info("Loading " + _options.renderer + " templates... ");
              var parser = new DOMParser(),
                doc = parser.parseFromString(text, "text/html"),
                scripts = doc.querySelectorAll("script");
              scripts.forEach(function(script) {
                _addTemplate(script.getAttribute("id"), script.innerHTML);
              });
              resolve();
            });
          break;
      }
    },
    _render = function(template, params, partials) {
      switch (_options.renderer) {
        case "Mustache":
          //return Mustache.to_html( _templateMap[ template ], params, _templateMap );
          return Mustache.render(_templateMap[template], params, partials);
        case "Handlebars":
          return _templateMap[template](params);
      }
    };

  return {
    render: _render,
    selectors: _selectors,
    getSelector: _getSelector,
    setSelector: _setSelector,

    getTemplate: function(template) {
      return _templateMap[template];
    },

    init: function(resolve, reject) {
      var renderers = "Handlebars,Mustache";
      _options = a7.model.get("a7.ui");

      a7.log.info("Layout initializing...");
      if (renderers.indexOf(_options.renderer) >= 0) {
        a7.model.set("a7.ui.templatesLoaded", false);
        if (_options.templates !== undefined) {
          _loadTemplates(resolve, reject);
        }
      } else {
        resolve();
      }
    }
  };
})();

a7.util = ( function(){


	return{
		// split by commas, used below
		split : function( val ) {
			return val.split( /,\s*/ );
		},

		// return the last item from a comma-separated list
		extractLast : function( term ) {
			return this.split( term ).pop();
		},

		// encode and decode base64
		base64 : {
			keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

			encode64 : function( input ) {
				if ( !String( input ).length ) {
					return false;
				}
				var output = "", chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				do {
					chr1 = input.charCodeAt( i++ );
					chr2 = input.charCodeAt( i++ );
					chr3 = input.charCodeAt( i++ );

					enc1 = chr1 >> 2;
					enc2 = ( ( chr1 & 3 ) << 4 ) | ( chr2 >> 4 );
					enc3 = ( ( chr2 & 15 ) << 2 ) | ( chr3 >> 6 );
					enc4 = chr3 & 63;

					if ( isNaN( chr2 ) ) {
						enc3 = enc4 = 64;
					} else if ( isNaN( chr3 ) ) {
						enc4 = 64;
					}

					output = output + this.keyStr.charAt( enc1 )
							+ this.keyStr.charAt( enc2 )
							+ this.keyStr.charAt( enc3 )
							+ this.keyStr.charAt( enc4 );
				} while ( i < input.length );

				return output;
			},

			decode64 : function( input ) {
				if ( !input ) {
					return false;
				}
				var output = "", chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
				input = input.replace( /[^A-Za-z0-9\+\/\=]/g, "" );

				do {
					enc1 = this.keyStr.indexOf( input.charAt( i++ ) );
					enc2 = this.keyStr.indexOf( input.charAt( i++ ) );
					enc3 = this.keyStr.indexOf( input.charAt( i++ ) );
					enc4 = this.keyStr.indexOf( input.charAt( i++ ) );

					chr1 = ( enc1 << 2 ) | ( enc2 >> 4 );
					chr2 = ( ( enc2 & 15 ) << 4 ) | ( enc3 >> 2 );
					chr3 = ( ( enc3 & 3 ) << 6 ) | enc4;

					output = output + String.fromCharCode( chr1 );

					if ( enc3 !== 64 ) {
						output = output + String.fromCharCode( chr2 );
					}
					if ( enc4 !== 64 ) {
						output = output + String.fromCharCode( chr3 );
					}
				} while ( i < input.length );

				return output;
			}
		},

		// add a leading zero to single numbers so the string is at least two characters
		leadingZero : function( n ) {
			return ( n < 10 ) ? ( "0" + n ) : n;
		},

		dynamicSort : function( property ) {
			var sortOrder = 1;
			if ( property[ 0 ] === "-" ) {
				sortOrder = -1;
				property = property.substr( 1 );
			}
			return function( a, b ) {
				var result = ( a[ property ] < b[ property ] ) ? -1
						: ( a[ property ] > b[ property ] ) ? 1 : 0;
				return result * sortOrder;
			};
		},

		// return yes|no for 1|0
		yesNo : function( val ) {
			return parseInt( val, 10 ) < 1 ? "No" : "Yes";
		},

		// validate a javascript date object
		isValidDate : function( d ) {
			if ( Object.prototype.toString.call( d ) !== "[object Date]" ) {
				return false;
			}
			return !isNaN( d.getTime() );
		},

		// generate a pseudo-random ID
		id : function() {
			return ( ( Math.random() * 100 ).toString() + ( Math.random() * 100 )
					.toString() ).replace( /\./g, "" );
		},

		// try/catch a function
		tryCatch : function( fn, ctx, args ) {
			var errorObject = {
				value : null
			};
			try {
				return fn.apply( ctx, args );
			} catch ( e ) {
				errorObject.value = e;
				return errorObject;
			}
		},

		// return a numeric representation of the value passed
		getNumberValue : function( pixelValue ) {
			return ( isNaN( Number( pixelValue ) ) ? Number( pixelValue.substring( 0, pixelValue.length - 2 ) ) : pixelValue );
		},

		// check whether a value is numeric
		isNumeric : function( num ) {
			return !isNaN( parseFloat( num ) ) && isFinite( num );
		},

		// get top/left offset of a selector on screen
		getOffset : function( selector ) {
			var rect = selector.getBoundingClientRect();

			return {
				top : rect.top + document.body.scrollTop,
				left : rect.left + document.body.scrollLeft
			};
		}
	};
}());

//# sourceMappingURL=a7.js.map