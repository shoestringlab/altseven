
export var a7 = a7;

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

      options.model = ( options.model !== undefined ? options.model : "altseven" );
      if (options.model === "") {
        // model required
        initReject("A model is required, but no model was specified.");
      }

      var theOptions = {
        auth: {
          sessionTimeout: (options.auth && options.auth.sessionTimeout ? options.auth.sessionTimeout : 60 * 15 * 1000 )
        },
        console: ( options.console ? {
          enabled: options.console.enabled || false,
          wsServer: options.console.wsServer || "",
          container: options.console.container || ( typeof gadgetui === "object" ? gadgetui.display.FloatingPane : "" ),
          top: options.console.top || 100,
          left: options.console.left || 500,
          width: options.console.width || 500,
          height: options.console.height || 300
        } : {} ),
        logging: {
          logLevel: ( options.logging && options.logging.logLevel ? options.logging.logLevel : "ERROR,FATAL,INFO" ),
          toBrowserConsole: (  options.logging && options.logging.toBrowserConsole ? options.logging.toBrowserConsole  : false )
        },
        model: options.model,
        remote: ( options.remote ? {
          // modules: ( options.remote.modules | undefined ) // don't set into Model since they are being registered in Remote
          loginURL: options.remote.loginURL || "",
          logoutURL: options.remote.logoutURL || "",
          refreshURL: options.remote.refreshURL || "",
          useTokens: ( options.auth && options.auth.useTokens ? options.auth.useTokens : true )
        } : { useTokens: true } ),
        router: ( options.router ? {
          options: { useEvents: options.router.useEvents || true },
          routes: options.router.routes || undefined
        } : undefined ),
        ui: {
          renderer: ( options.ui ?
            options.ui.renderer ||
            ( typeof Mustache === "object"
              ? "Mustache"
              : typeof Handlebars === "object"
              ? "Handlebars"
              : "templateLiterals" )
            : "templateLiterals" ),
            debounceTime: ( options.ui && options.ui.debounceTime ? options.ui.debounceTime : 18 ),
            timeout : ( options.ui && options.ui.timeout ? options.ui.timeout : 600000 ) // default 10 minute check for registered views
        },
        ready: false,
        user: ""
      };

      pr = new Promise(function(resolve, reject) {
        a7.log.trace("a7 - model init");
        a7.model.init( theOptions, resolve, reject );
      });

      pr.then(function() {
        a7.model.set("a7", theOptions );
      }).then(function() {
        p0 = new Promise(function(resolve, reject) {
          if (a7.model.get("a7").console.enabled) {
            a7.log.trace("a7 - console init");
            a7.console.init( theOptions, resolve, reject);
          } else {
            resolve();
          }
        });

        p0.then(function() {
          a7.log.trace("a7 - log init");
          a7.log.init();
            a7.log.trace("a7 - security init");
            // init user state
            // pass security options if they were defined
            a7.security.init( ( options.security && options.security.options ? options.security.options : {} ) );
            a7.log.trace("a7 - remote init");
            //pass remote modules if they were defined
            a7.remote.init( ( options.remote && options.remote.modules ? options.remote.modules : {} ) );
            a7.log.trace("a7 - events init");
            a7.events.init();
            // init the router if it is being used
            if( theOptions.router ){
              a7.log.trace("a7 - router init");
              a7.router.init( theOptions.router.options, theOptions.router.routes );
            }
            // init the ui templating engine
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
                a7.error.init();
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

  var _handleMessage = function( message, json ){
    var ix = 0;
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
  }

  return {
    init: function( options, resolve, reject) {
      var console = options.console;
      if( console.container === "" ) reject( "You must specify a container object for the console display." );

      // check for console state
      if ( console.enabled ) {
        active = true;
        consoleDiv = document.createElement("div");
        consoleDiv.setAttribute("id", "consoleDiv");
        consoleDiv.setAttribute("class", "a7-console");
        document.body.append(consoleDiv);

        var fp = a7.components.Constructor(
            console.container,
            [
              consoleDiv,
              {
                width: console.width,
                left: console.left,
                height: console.height,
                title: title,
                top: console.top,
                enableShrink: false,
                enableClose: true
              }
            ],
            false
          );

        fp.selector.setAttribute("right", 0);

        if( console.wsServer ){
          var connection = a7.remote.webSocket( console.wsServer, _handleMessage );
        }

        a7.console.addMessage = _addMessage;
        a7.log.info("Console initializing...");
        resolve();
      } else {
        // console init should not run if console is set to false
        reject( "Console init should not be called when console option is set to false." );
      }
    }
  };
})();

a7.error = (function() {
  "use strict";

  // add event bindings so devs can listen for window script errors
  var _bindings = {};

  var events = { scriptError : [] };

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

      a7.error.fireEvent( "scriptError", [msg, url, lineNo, columnNo, error] );
      a7.log.error(message);
    }
  };

  window.onerror = function(msg, url, lineNo, columnNo, error) {
    a7.error.captureError(msg, url, lineNo, columnNo, error);
    return false;
  };

  return {
    events: events,
    capture: function() {},
    captureError: _captureError,
    init: function(){
      a7.components.EventBindings.getAll().forEach( function( binding ){
        if( _bindings[ binding ] === undefined ) {
          _bindings[ binding.name ] = binding.func;
        }
        a7.error.on = _bindings.on;
        a7.error.off = _bindings.off;
        a7.error.fireEvent = _bindings.fireEvent;
      });
    }
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
      a7.events.subscribe("auth.logout", function(params) {
        a7.remote.invoke("auth.logout", params);
      });
      a7.events.subscribe("auth.refresh", function(params) {
        a7.remote.invoke("auth.refresh", params);
      });
      a7.events.subscribe("auth.sessionTimeout", function() {
        a7.security.invalidateSession();
      });
      a7.events.subscribe("auth.invalidateSession", function() {
        a7.security.invalidateSession();
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
		_toBrowserConsole = false,
		_consoleEnabled = false,
		_deferred = [],
		_logLevel = "ERROR,FATAL,INFO",
		_log = function( message, level ){
			if( _ready && _logLevel.indexOf( level ) >=0 || _logLevel.indexOf( "ALL" ) >=0 ){
				if( _consoleEnabled ){
					a7.console.addMessage( message, new Date(), "local", level );
				}
				if( _toBrowserConsole ){
					console.log( message );
				}
			} else if( ! _ready ){
				// store log messages before init so they can be logged after init
				_deferred.push( { message: message, level: level } );
			}
		};

	return{
		init: function(){
			_logLevel = a7.model.get( "a7" ).logging.logLevel;
			_toBrowserConsole = a7.model.get( "a7" ).logging.toBrowserConsole;
			_consoleEnabled = a7.model.get( "a7" ).console.enabled;
			_ready = true;
			_deferred.forEach( function( item ){
				_log( item.message, item.level );
			});
			//_deffered = [];
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
		init: function( options, resolve ){
			a7.log.info( "Model initializing... " );

			if( typeof options.model == "string" ){
				switch( options.model ){
					case "altseven":
						_model = a7.components.Model;
						_model.init( options );
						break;
					case "gadgetui":
						_model = gadgetui.model;
						break;
				}
			}else if( typeof options.model == "object" ){
				_model = options.model;
			}
			a7.log.trace( "Model set: " + _model );
			// gadgetui maps directly, so we can loop on the keys
			Object.keys( _model ).forEach( function( key ){
				_methods[ key ] = _model[ key ];
			});

			resolve();
		}
	};
}() );

a7.components = ( function() {"use strict";function Constructor( constructor, args, addBindings ) {
	var returnedObj,
		obj;

	// add bindings for custom events
	// this section pulls the bindings ( on, off, fireEvent ) from the
	// EventBindings object and add them to the object being instantiated
	if( addBindings === true ){
		//bindings = EventBindings.getAll();
 		EventBindings.getAll().forEach( function( binding ){
			if( constructor.prototype[ binding ] === undefined ) {
				constructor.prototype[ binding.name ] = binding.func;
			}
		});
	}

	// construct the object
	obj = Object.create( constructor.prototype );

	// this section adds any events specified in the prototype as events of
	// the object being instantiated
	// you can then trigger an event from the object by calling:
	// <object>.fireEvent( eventName, args );
	// args can be anything you want to send with the event
	// you can then listen for these events using .on( eventName, function(){});
	// <object>.on( eventName, function(){ })
	if( addBindings === true ){
		// create specified event list from prototype
		obj.events = {};
		if( constructor.prototype.events !== undefined ){
			constructor.prototype.events.forEach( function( event ){
				obj.events[ event ] = [ ];
			});
		}
	}

	returnedObj = constructor.apply( obj, args );
	if( returnedObj === undefined ){
		returnedObj = obj;
	}
	//returnedObj.prototype = constructor.prototype;
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
		if( this.events[ key ] !== undefined ){
			this.events[ key ].forEach( function( func ){
				func( _this, args );
			});
		}
	},

	getAll : function(){
		return [ 	{ name : "on", func : this.on },
							{ name : "off", func : this.off },
							{ name : "fireEvent", func : this.fireEvent } ];
	}
};

var Model = ( function() {
	"use strict";

	var _model = {};
	var _mementos = [];
	var _maxEntries = 20;
	var _currentIndex = 0;

	function BindableObject( data, element ) {
		this.data = data;
		this.elements = [ ];
		if ( element !== undefined ) {
			this.bind( element );
		}
	}

	BindableObject.prototype.handleEvent = function( ev ) {
		var ix, obj;
		switch ( ev.type ) {
			case "change":
				for( ix = 0; ix < this.elements.length; ix++ ){
					obj = this.elements[ ix ];
					if( ev.originalSource === undefined ){
						ev.originalSource = "BindableObject.handleEvent['change']";
					}
					if( ev.target.name === obj.prop && ev.originalSource !== 'BindableObject.updateDomElement' ){
						//select box binding
						if( ev.target.type.match( /select/ ) ){
							this.change( { 	id : ev.target.value,
									text : ev.target.options[ev.target.selectedIndex].innerHTML
								}, ev, obj.prop );
						}
						else{
						// text input binding
						this.change( ev.target.value, ev, obj.prop );
						}
					}
				}

		}
	};

	// for each bound control, update the value
	BindableObject.prototype.change = function( value, event, property ) {
		var ix, obj;
		if( event.originalSource === undefined ){
			event.originalSource = "BindableObject.change";
		}
		console.log( "change : Source: " + event.originalSource );

		// this code changes the value of the BinableObject to the incoming value
		if ( property === undefined ) {
			// Directive is to replace the entire value stored in the BindableObject
			// update the BindableObject value with the incoming value
			// value could be anything, simple value or object, does not matter
			this.data = value;
		}
		else if ( typeof this.data === 'object' ) {
			//Directive is to replace a property of the value stored in the BindableObject
			// verifies _this "data" is an object and not a simple value
			// update the BindableObject's specified property with the incoming value
			// value could be anything, simple value or object, does not matter

			if( this.data[ property ] === undefined ){
				throw( "Property '" + property + "' of object is undefined." );
			}
			else{
				this.data[ property ] = value;
			}
			// check if we are updating only a single property or the entire object

		}
		else {
			throw "Attempt to treat a simple value as an object with properties. Change fails.";
		}

		// check if there are other dom elements linked to the property
		for( ix = 0; ix < this.elements.length; ix++ ){
			obj = this.elements[ ix ];
			if( ( property === undefined || property === obj.prop ) && ( event.target !== undefined && obj.elem != event.target ) ){
				this.updateDomElement( event,  obj.elem, value );
			}
		}
	};

	BindableObject.prototype.updateDom = function( event, value, property ){
		var ix, obj, key;
		if( event.originalSource === undefined ){
			event.originalSource = 'BindableObject.updateDom';
		}
		// this code changes the value of the DOM element to the incoming value
		for( ix = 0; ix < this.elements.length; ix++ ){
			obj = this.elements[ ix ];

			if ( property === undefined  ){
				if( typeof value === 'object' ){
					for( key in value ){
						if( this.elements[ ix ].prop === key ){
							this.updateDomElement( event, obj.elem, value[ key ] );
						}
					}
				}else{
					// this code sets the value of each control bound to the BindableObject
					// to the correspondingly bound property of the incoming value
					this.updateDomElement( event, obj.elem, value );
				}

				//break;
			}else if ( obj.prop === property ){
				this.updateDomElement( event, obj.elem, value );
			}
		}
	};

	BindableObject.prototype.updateDomElement = function( event, selector, newValue ){
		var valueElements = "INPUT";
		var arrayElements = "OL,UL,SELECT";
		var wrappingElements = "DIV,SPAN,H1,H2,H3,H4,H5,H6,P,TEXTAREA,LABEL,BUTTON";

		var _updateOptions = function(){
			switch( selector.tagName ){
				case "SELECT":
					while (selector.firstChild) {
						selector.removeChild(selector.firstChild);
					}
					var idx = 0;
					newValue.forEach( function( item ){
						var opt = document.createElement("option");
						if( typeof item === 'object' ){
							opt.value = item.id;
							opt.text = item.text;
						}else{
							opt.text = item;
						}
						selector.appendChild( opt );
						idx++;
					});
				break;
				case "UL":
				case "OL":
					while (selector.firstChild) {
						selector.removeChild(selector.firstChild);
					}
					newValue.forEach( function( item ){
						var opt = document.createElement("li");
						opt.textContent = item;
						selector.appendChild( opt );
					});
				break;
			}
		};

		if( event.originalSource === undefined ){
			event.originalSource = "BindableObject.updateDomElement";
		}
		//console.log( "updateDomElement : selector: { type: " + selector.nodeName + ", name: " + selector.name + " }" );
		//console.log( "updateDomElement : Source: " + event.originalSource );

		// updating the bound DOM element requires understanding what kind of DOM element is being updated
		// and what kind of data we are dealing with

		if( typeof newValue === 'object' ){
			// select box objects are populated with { text: text, id: id }
			if( valueElements.indexOf( selector.tagName ) >=0 ){
				selector.value = newValue.id;
			}else if( arrayElements.indexOf( selector.tagName ) >=0 ){
				_updateOptions();
			}else{
				selector.textContent = newValue.text;
			}
		}else{
			if( valueElements.indexOf( selector.tagName ) >=0 ){
				selector.value = newValue;
			}else if( arrayElements.indexOf( selector.tagName ) >=0 ){
				_updateOptions();
			}else{
				selector.textContent = newValue;
			}
		}

		// we have three ways to update values
		// 1. via a change event fired from changing the DOM element
		// 2. via model.set() which should change the model value and update the dom element(s)
		// 3. via a second dom element, e.g. when more than one dom element is linked to the property
		//    we need to be able to update the other dom elements without entering an infinite loop
		if( event.originalSource !== 'model.set' ){
			var ev = new Event( "change" );
			ev.originalSource = 'model.updateDomElement';
			selector.dispatchEvent( ev );
		}
	};

	// bind an object to an HTML element
	BindableObject.prototype.bind = function( element, property ) {
		var e, _this = this;

		if ( property === undefined ) {
			// BindableObject holds a simple value
			// set the DOM element value to the value of the Bindable object
			element.value = this.data;
			e = {
				elem : element,
				prop : ""
			};
		}
		else {
			// Bindable object holds an object with properties
			// set the DOM element value to the value of the specified property in the
			// Bindable object
			element.value = this.data[ property ];
			e = {
				elem : element,
				prop : property
			};
		}
		//add an event listener so we get notified when the value of the DOM element
		// changes
		//element[ 0 ].addEventListener( "change", this, false );
		//IE 8 support
		if (element.addEventListener) {
			element.addEventListener( "change", this, false);
		}
		else {
			// IE8
			element.attachEvent("onpropertychange", function( ev ){
				if( ev.propertyName === 'value'){
					var el = ev.srcElement, val = ( el.nodeName === 'SELECT' ) ? { id: el.value, text: el.options[el.selectedIndex].innerHTML } : el.value;
					_this.change( val, { target: el }, el.name );
				}
			});
		}
		this.elements.push( e );
	};

	var _setModelValue = function( name, value ){
		a7.log.trace( "Set key: " + name + " = " + JSON.stringify( value ) );

		switch( typeof value ){
			case "undefined":
			case "number":
			case "boolean":
			case "function":
			case "Symbol":
			case "string":
				// simple values are copied by value
				// functions and symbols
				_model[ name ] = value;
				break;
			case "object":
				// null objects are set to null
				if( value === null ){
					_model[ name ] = null;
				}else if( value.constructor === Map){
						_model[ name ] = new Map(value);
				}else{
						// deep copying objects (will not copy method definitions, but we expect only data )
						_model[ name ] = JSON.parse( JSON.stringify( value ) );
				}
				break;
		}
		// save the state of the model
		_setMemento();
	};

	var _keyExists = function( object, key ){
		return ( object.hasOwnProperty( key ) );
	};

	var _getMemento = function( index ){
		return JSON.parse( JSON.stringify( _mementos[ index ] ) );
	};

	var _setMemento = function(){
		a7.log.trace( "Set memento" );
		if( _currentIndex < _mementos.length - 1 ){
			_mementos = _mementos.slice( 0, _currentIndex );
		}
		if( _mementos.length === _maxEntries ){
			a7.log.trace( "model - moving an item off the stack history." );
			// push the oldest entry off the stack
			_mementos.shift();
		}
		_mementos.push( JSON.parse( JSON.stringify( _model ) ) );
		// we saved last model state, set index to latest entry
		_currentIndex = _mementos.length -1;
	};

	var _rewind = function( steps ){
		var myIndex = 0;
		steps = ( steps !== undefined ? steps : 1 );
		a7.log.trace( "Move back in history index by " + steps + " operations " );
		myIndex = _currentIndex - steps;
		_setCurrentIndex( myIndex );
	};

	var _fastForward = function( steps ){
		var myIndex = 0;
		steps = ( steps !== undefined ? steps : 1 );
		a7.log.trace( "Move forward in history index by " + steps + " operations " );
		myIndex = _currentIndex + steps;
		_setCurrentIndex( myIndex );
	};

	var _undo = function( steps ){
		_rewind( steps );
		_model = _getMemento( _currentIndex );
	};

	var _redo = function( steps ){
		_fastForward( steps );
		_model = _getMemento( _currentIndex );
	};

	var _setCurrentIndex = function( index ){
		_currentIndex = ( index < 0 ? 0 : index > _mementos.length - 1 ? _mementos.length - 1 : index );
	};

	return {
		undo: _undo,
		redo: _redo,
		init: function( options ){
			_maxEntries = ( options !== undefined && options.maxEntries !== undefined ? options.maxEntries : 20 );
		},
		destroy: function( name ){
			_setMemento();
			delete _model[ name ];
		},
		exists: function( name ){
			return _keyExists( _model, name );
		},
		get: function( name ) {
			if( _model[ name ] === undefined ){
				return;
			}else{
				try{
					if(_model[ name ].constructor === Map){
						return new Map( _model[ name ] );
					}else{
						return JSON.parse( JSON.stringify( _model[ name ] ) );
					}
				}catch( e ){
					a7.log.error( e );
					throw( e );
				}
			}
		},
		set: function( name, value ){
			_setModelValue( name, value );
			return;
		}
	};
}() );

function User(args){
	// init User
	// if you pass an args structure into the function, the elements of args will be added to the User object
	
	Object.assign( this, args );
	return this;
}

User.prototype.getMemento = function(){
	var user = {}, self = this;
	Object.keys( this ).forEach( function( key ){
		user[ key ] = self[ key ];
	});
	return user;
};

function View( props ){
	this.renderer = a7.model.get("a7").ui.renderer;
	this.type = 'View';
	this.timeout;
	this.timer;
	this.element; // html element the view renders into
	this.props = props;
	this.isTransient = props.isTransient || false;
	this.state = {};
	this.skipRender = false;
	this.children = {}; // child views
	this.components = {}; // register objects external to the framework so we can address them later
	this.config();
	this.fireEvent( "mustRegister" );
}

View.prototype = {
	config: function(){

		this.on( "mustRegister", function(){
			a7.log.trace( 'mustRegister: ' + this.props.id );
			a7.ui.register( this );
			if( a7.ui.getView( this.props.parentID ) ){
				a7.ui.getView( this.props.parentID ).addChild( this );
			}
		}.bind( this ) );

		// mustRender is a debounced function so we can control how often views should re-render.
		// debounce leading, so the render will be queued and subsequent requests to render will be ignored until the delay time is reached
		// delay defaults to 18 ms, can be set in app options as ui.debounceTime
		this.on( "mustRender", a7.util.debounce( function(){
			a7.log.trace( 'mustRender: ' + this.props.id );
			if( this.shouldRender() ){
				a7.ui.enqueueForRender( this.props.id );
				
			}else{
				a7.log.trace( 'Render cancelled: ' + this.props.id );
				// undo skip, it must be explicitly set each time
				this.skipRender = false;
			}
		}.bind( this )), a7.model.get( "a7" ).ui.debounceTime, true );

		this.on( "rendered", function(){
			if( this.isTransient ){
				// set the timeout
				if( this.timer !== undefined ){
					clearTimeout( this.timer );
				}
				this.timer = setTimeout( this.checkRenderStatus.bind( this ), a7.model.get( "a7" ).ui.timeout );
			}
			this.onRendered();
		}.bind( this ));

		this.on( "registered", function(){
			if( this.props.parentID === undefined || this.mustRender ){
				// only fire render event for root views, children will render in the chain
				this.fireEvent( "mustRender" );
			}
		}.bind( this ));

		this.on( "mustUnregister", function(){
			a7.ui.unregister( this.props.id );
		}.bind( this ));
	},
	events : ['mustRender','rendered', 'mustRegister', 'registered', 'mustUnregister'],
  setState: function( args ){
    this.state = Object.assign( args );
    // setting state requires a re-render
		this.fireEvent( 'mustRender' );
	},
	getState: function(){
		return Object.assign( this.state );
	},
	addChild: function( view ){
		this.children[ view.props.id ] = view;
		// force a render for children added
		//this.children[ view.props.id ].mustRender = true;
	},
	removeChild: function( view ){
		delete this.children[ view.props.id ];
	},
	clearChildren: function(){
		this.children = {};
	},
	getParent: function(){
		return ( this.props.parentID ? a7.ui.getView( this.props.parentID ) : undefined );
	},
	render: function(){
		a7.log.info( 'render: ' + this.props.id );
		if( this.element === undefined || this.element === null ){
			this.element = document.querySelector( this.props.selector );
		}
		if( !this.element ){
			a7.log.error( "The DOM element for view " + this.props.id + " was not found. The view will be removed and unregistered." );
			// if the component has a parent, remove the component from the parent's children
			if( this.props.parentID !== undefined ){
				a7.ui.getView( this.props.parentID ).removeChild( this );
			}
			// if the selector isn't in the DOM, skip rendering and unregister the view
			this.fireEvent( 'mustUnregister' );
			return;
		}
		//throw( "You must define a selector for the view." );
		this.element.innerHTML = ( typeof this.template == "function" ? this.template() : this.template );

		var eventArr = [];
		a7.ui.getEvents().forEach( function( eve ){
			eventArr.push("[data-on" + eve + "]");
		});
		var eles = this.element.querySelectorAll( eventArr.toString() );

		eles.forEach( function( sel ){
			for( var ix=0; ix < sel.attributes.length; ix++ ){
				var attribute = sel.attributes[ix];
				if( attribute.name.startsWith( "data-on" ) ){
					var event = attribute.name.substring( 7, attribute.name.length );
					sel.addEventListener( event, this.eventHandlers[ sel.attributes["data-on" + event].value ] );
				}
			}
		}.bind( this ));

		this.fireEvent( "rendered" );
	},
	shouldRender: function(){
    if( this.skipRender ){
      return false;
    }else{
      return true;
    }
	},
	// after rendering, render all the children of the view
	onRendered: function(){
		for( var child in this.children ){
			this.children[ child ].element = document.querySelector( this.children[ child ].props.selector );
			this.children[ child ].render();
		}
	},
	// need to add props.isTransient (default false) to make views permanent by default
	checkRenderStatus: function(){
		if( document.querySelector( this.props.selector ) === null ){
			a7.ui.unregister( this.id );
		}else{
			if( this.isTransient ){
				this.timer = setTimeout( this.checkRenderStatus.bind( this ), a7.model.get( "a7" ).ui.timeout );
			}
		}
	}
};

return {
  Constructor: Constructor,
  EventBindings: EventBindings,
  Model: Model,
  User: User,
  View: View
};
}());
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

	var _webSocket = function( wsServer, messageHandler, isJSON ){
		if( wsServer ){
			window.WebSocket = window.WebSocket || window.MozWebSocket;

			// if browser doesn't support WebSocket, just show some
			// notification and exit
			if (!window.WebSocket) {
				a7.log.error( "Your browser doesn't support WebSockets." );
				return;
			}

			// open connection
			let connection = new WebSocket( wsServer );

			connection.onopen = function() {
				a7.log.info( "Connecting to the socket server at " + wsServer );
			};

			connection.onerror = function() {
				var message = "Can't connect to the socket server at " + wsServer;
				a7.log.error( message );
			};

			// most important part - incoming messages
			connection.onmessage = function( message ) {
				if( isJSON ){
					var json;
					// try to parse JSON message. Because we know that the
					// server always returns
					// JSON this should work without any problem but we should
					// make sure that
					// the message is not chunked or otherwise damaged.
					try {
						json = JSON.parse( message.data );
					} catch (er) {
						a7.log.error( "This doesn't look like valid JSON: ", message.data );
						return;
					}
					messageHandler( message, json );
				} else{
					messageHandler( message );
				}

			};

			window.addEventListener("close", function() {
				connection.close();
			});

			return connection;
		}
	},

	_refreshClientSession = function(){
		var promise = new Promise( function( resolve, reject ){
			a7.remote.invoke( "auth.refresh", { resolve: resolve, reject: reject } );
		});

		promise
			.then( function( active ){
				// session is still active, no need to do anything else
				a7.log.trace( 'Still logged in.' );
			})
			.catch( function( error ){
				a7.events.publish( "auth.sessionTimeout" );
			});

	},
	_setToken = function( token ){
		sessionStorage.token = token;
		_token = token;
	};

	return{

		webSocket : _webSocket,
		getToken : function(){
			return _token;
		},
		invalidateToken : function(){
			_setToken( '' );
		},
		getSessionTimer : function(){
				return _sessionTimer;
		},

		init: function( modules ){
			var auth = a7.model.get( "a7" ).auth;
			_options = a7.model.get( "a7" ).remote;

			_options.sessionTimeout = auth.sessionTimeout;
			// set token if valid
			if( _options.useTokens && sessionStorage.token && sessionStorage.token !== '' ) {
				_token = sessionStorage.token;
			}

			var authModule = {
					login: function( params ){
						a7.log.trace( "remote call: auth.login" );
						var request,
								args = { 	method: 'POST',
										headers: {
											"Authorization": "Basic " + a7.util.base64.encode64( params.username + ":" + params.password )
										}
								};

						request = new Request( _options.loginURL , args );

						var promise = fetch( request );

						promise
							.then( function( response ) {
								// set the token into sessionStorage so it is available if the browser is refreshed
								var token = response.headers.get("X-Token");
								if( token !== undefined && token !== null ){
									_token = token;
									sessionStorage.token = token;
								}
								return response.json();
							})
							.then( function( json ){
								if( json.success ){
									var user = a7.model.get( "user" );
									// map the response object into the user object
									Object.keys( json.user ).map( function( key ) {
										user[ key ] = json.user[ key ];
									});
									// set the user into the sessionStorage and the model
									sessionStorage.user = JSON.stringify( user );
									a7.model.set( "user", user );
									// handler/function/route based on success
									if( params.success !== undefined ){
										if( typeof params.success === 'function' ){
											params.success( json );
										}else if( a7.model.get("a7").router ){
											a7.router.open( params.success, json );
										}else{
											a7.events.publish( params.success, json );
										}
									}
								}else if( params.failure !== undefined ){
									// if login failed
									if( typeof params.failure === 'function' ){
										params.failure( json );
									}else if( a7.model.get("a7").router ){
										a7.router.open( params.failure, json );
									}else{
										a7.events.publish( params.failure, json );
									}
								}
								if( params.callback !== undefined ){
									params.callback( json );
								}
								});
					},
					logout: function( params ){
						a7.log.trace( "remote call: auth.logout" );
						var request,
								args = { 	method: 'POST',
										headers: {
											"Authorization": "Basic " + a7.util.base64.encode64( params.username + ":" + params.password )
										}
								};

						request = new Request( _options.logoutURL , args );

						var promise = fetch( request );

						promise
							.then( function( response ) {
								return response.json();
							})
							.then( function( json ){
								if( json.success ){
									a7.security.invalidateSession();
									if( params.success !== undefined ){
										if( typeof params.success === 'function' ){
											params.success( json );
										}else if( a7.model.get("a7").router ){
											a7.router.open( params.success, json );
										}else{
											a7.events.publish( params.success, json );
										}
									}
								}else if( params.failure !== undefined ){
									// if logout failed
									if( typeof params.failure === 'function' ){
										params.failure( json );
									}else if( a7.model.get("a7").router ){
										a7.router.open( params.failure, json );
									}else{
										a7.events.publish( params.failure, json );
									}
								}

								if( params.callback !== undefined ){
									params.callback();
								}
							});
					},
					refresh: function( params ){
						// refresh keeps the client session alive
						a7.remote.fetch( _options.refreshURL, {}, true )
						// initial fetch needs to parse response
						.then( function( response ){
							return response.json();
						})
						.then( function( json ){
							// then json is handled
							if( params.resolve !== undefined ){
								params.resolve( json.success );
							}
						});
					}
				};

			// add the auth module
			_setModule( "auth", authModule );

			// add application modules
			Object.keys( modules ).forEach( function( key ){
				_setModule( key, modules[ key ] );
			});
		},

		fetch: function( uri, params, secure ){
			a7.log.info( "fetch: " + uri );
			var request,
					promise;

			//if secure and tokens, we need to check timeout and add X-Token header
			if( secure && _options.useTokens ){
				var currentTime = new Date( ),
						diff = Math.abs( currentTime - _time ),
						minutes = Math.floor( ( diff / 1000 ) / 60 );

				if( minutes > _options.sessionTimeout ){
					// timeout
					a7.events.publish( "auth.sessionTimeout" );
					return;
				}else if( _token !== undefined && _token !== null ){
					// set X-Token
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
			//calling the native JS fetch method ...
			promise = fetch( request );

			promise
				.then( function( response ){
					if( secure && _options.useTokens ){
						var token = response.headers.get( "X-Token" );
						if( token !== undefined && token !== null ){
							_setToken( token );

							if( _sessionTimer !== undefined ){
								clearTimeout( _sessionTimer );
							}
							_sessionTimer =	setTimeout( _refreshClientSession, _options.sessionTimeout );

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
			//	_modules[ mA[ 0 ] ][ mA[ 1 ] ].apply( _modules[ mA[ 0 ] ][ mA[ 1 ] ].prototype, params );
				return _modules[ mA[ 0 ] ][ mA[ 1 ] ]( params );
			}
		}
	};
}());

a7.router = (function() {
  "use strict";

  // url-router code from here courtesy Jiang Fengming
  // https://github.com/jiangfengming/url-router

  /*
  Copyright 2015-2019 Jiang Fengming

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */

  var REGEX_PARAM_DEFAULT = /^[^/]+/;
  var REGEX_START_WITH_PARAM = /^(:\w|\()/;
  var REGEX_INCLUDE_PARAM = /:\w|\(/;
  var REGEX_MATCH_PARAM = /^(?::(\w+))?(?:\(([^)]+)\))?/;

  function Router(routes) {
    var _this = this;

    this.root = this._createNode();

    if (routes) {
      routes.forEach(function (route) {
        return _this.add.apply(_this, route);
      });
    }
  }

  var _proto = Router.prototype;

  _proto._createNode = function _createNode(_temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        regex = _ref.regex,
        param = _ref.param,
        handler = _ref.handler;

    return {
      regex: regex,
      param: param,
      handler: handler,
      children: {
        string: {},
        regex: {}
      }
    };
  };

  _proto.add = function add(pattern, handler) {
    this._parseOptim(pattern, handler, this.root);

    return this;
  };

  _proto._parse = function _parse(remain, handler, parent) {
    if (REGEX_START_WITH_PARAM.test(remain)) {
      var match = remain.match(REGEX_MATCH_PARAM);
      var node = parent.children.regex[match[0]];

      if (!node) {
        node = parent.children.regex[match[0]] = this._createNode({
          regex: match[2] ? new RegExp('^' + match[2]) : REGEX_PARAM_DEFAULT,
          param: match[1]
        });
      }

      if (match[0].length === remain.length) {
        node.handler = handler;
      } else {
        this._parseOptim(remain.slice(match[0].length), handler, node);
      }
    } else {
      var _char = remain[0];
      var _node = parent.children.string[_char];

      if (!_node) {
        _node = parent.children.string[_char] = this._createNode();
      }

      this._parse(remain.slice(1), handler, _node);
    }
  };

  _proto._parseOptim = function _parseOptim(remain, handler, node) {
    if (REGEX_INCLUDE_PARAM.test(remain)) {
      this._parse(remain, handler, node);
    } else {
      var child = node.children.string[remain];

      if (child) {
        child.handler = handler;
      } else {
        node.children.string[remain] = this._createNode({
          handler: handler
        });
      }
    }
  };

  _proto.find = function find(path) {
    return this._findOptim(path, this.root, {});
  };

  _proto._findOptim = function _findOptim(remain, node, params) {
    var child = node.children.string[remain];

    if (child && child.handler !== undefined) {
      return {
        handler: child.handler,
        params: params
      };
    }

    return this._find(remain, node, params);
  };

  _proto._find = function _find(remain, node, params) {
    var child = node.children.string[remain[0]];

    if (child) {
      var result = this._find(remain.slice(1), child, params);

      if (result) {
        return result;
      }
    }

    for (var k in node.children.regex) {
      child = node.children.regex[k];
      var match = remain.match(child.regex);

      if (match) {
        if (match[0].length === remain.length && child.handler !== undefined) {
          if (child.param) {
            params[child.param] = decodeURIComponent(match[0]);
          }

          return {
            handler: child.handler,
            params: params
          };
        } else {
          var _result = this._findOptim(remain.slice(match[0].length), child, params);

          if (_result) {
            if (child.param) {
              params[child.param] = decodeURIComponent(match[0]);
            }

            return _result;
          }
        }
      }
    }

    return null;
  };

// end url-router code

  var _options, _router,
  _add = function( path, handler ){
    _router.add( path, handler );
  },
  _find = function( path ){
    return _router.find( path );
  },
  _open = function( path, params = {} ){
    let result = _find( path );
    let handler = result.handler;
    history.pushState( JSON.parse( JSON.stringify( params ) ), '', path );
    let combinedParams = Object.assign( params || {}, result.params || {} );
    if( _options.useEvents && typeof handler === 'string' ){
      a7.events.publish( handler, combinedParams );
    }else{
      handler( combinedParams );
    }
  },
  _match = function( path ){
    let result = _router.find( path );
    if( _options.useEvents ){
      a7.events.publish( result.handler, result.params );
    }else{
      result.handler( result.params );
    }
  };

  return {
    open: _open,
    add: _add,
    find: _find,
    match: _match,
    init: function( options, routes ){
      _router = new Router( routes );
      _options = options;
      _options.useEvents = ( _options.useEvents ? true : false );
      window.onpopstate = function( event ){
        //a7.log.trace( 'state: ' + JSON.stringify( event.state ) );
        _match( document.location.pathname + document.location.search );
      }
    }
  };
})();

a7.security = (function() {
  "use strict";
  
  let _userArgs = [];

  var _isAuthenticated = function(resolve, reject) {
    a7.log.info("Checking authenticated state.. ");
    if (a7.model.get("a7").remote.useTokens) {
      var token = a7.remote.getToken();
      if (token !== undefined && token !== null && token.length > 0) {
        var timer = a7.remote.getSessionTimer();
        // if the timer isn't defined, that means the app just reloaded, so we need to refresh against the server
        if (timer === undefined) {
          a7.log.info("Refreshing user...");
          // if there is a valid token, check authentication state with the server
          a7.events.publish("auth.refresh", { resolve:resolve, reject: reject});
        } else {
          resolve(true);
        }
      } else {
        resolve(false);
      }
    }
  },
  _invalidateSession = function(){
		clearTimeout( a7.remote.getSessionTimer() );
    a7.remote.invalidateToken();
		var user = a7.components.Constructor(a7.components.User, _userArgs, true);
		sessionStorage.user = JSON.stringify( user );
		a7.model.set( "user", user );
  };

  return {
    invalidateSession: _invalidateSession,
    isAuthenticated: _isAuthenticated,
    // initialization
    // 1. creates a new user object
    // 2. checks sessionStorage for user string
    // 3. populates User object with stored user information in case of
    // 	  browser refresh
    // 4. sets User object into a7.model

    init: function( options ) {
      a7.log.info("Security initializing...");
      _userArgs =  ( options.userArgs ? options.userArgs : [] );
      var suser,
        user = a7.components.Constructor(a7.components.User, _userArgs, true);
      if (sessionStorage.user && sessionStorage.user !== "") {
        suser = JSON.parse(sessionStorage.user);
        Object.keys(suser).map(function(key) {
          user[key] = suser[key];
        });
      }
      a7.model.set("user", user);
    }
  };
})();

a7.ui = (function () {
    'use strict'

    // browser events that can be used in templating, e.g. data-click will be added to the resulting HTML as a click event handler
    const resourceEvents = ['cached', 'error', 'abort', 'load', 'beforeunload']

    const networkEvents = ['online', 'offline']

    const focusEvents = ['focus', 'blur']

    const websocketEvents = ['open', 'message', 'error', 'close']

    const sessionHistoryEvents = ['pagehide', 'pageshow', 'popstate']

    const cssAnimationEvents = [
        'animationstart',
        'animationend',
        'animationiteration',
    ]

    const cssTransitionEvents = [
        'transitionstart',
        'transitioncancel',
        'transitionend',
        'transitionrun',
    ]

    const formEvents = ['reset', 'submit']

    const printingEvents = ['beforeprint', 'afterprint']

    const textCompositionEvents = [
        'compositionstart',
        'compositionupdate',
        'compositionend',
    ]

    const viewEvents = [
        'fullscreenchange',
        'fullscreenerror',
        'resize',
        'scroll',
    ]

    const clipboardEvents = ['cut', 'copy', 'paste']

    const keyboardEvents = ['keydown', 'keypress', 'keyup']

    const mouseEvents = [
        'auxclick',
        'click',
        'contextmenu',
        'dblclick',
        'mousedown',
        'mousenter',
        'mouseleave',
        'mousemove',
        'mouseover',
        'mouseout',
        'mouseup',
        'pointerlockchange',
        'pointerlockerror',
        'wheel',
    ]

    const dragEvents = [
        'drag',
        'dragend',
        'dragstart',
        'dragleave',
        'dragover',
        'drop',
    ]

    const mediaEvents = [
        'audioprocess',
        'canplay',
        'canplaythrough',
        'complete',
        'durationchange',
        'emptied',
        'ended',
        'loadeddata',
        'loadedmetadata',
        'pause',
        'play',
        'playing',
        'ratechange',
        'seeked',
        'seeking',
        'stalled',
        'suspend',
        'timeupdate',
        'columechange',
        'waiting',
    ]

    const progressEvents = [
        // duplicates from resource events
        /* 'abort',
	'error',
	'load', */
        'loadend',
        'loadstart',
        'progress',
        'timeout',
    ]

    const storageEvents = ['change', 'storage']

    const updateEvents = [
        'checking',
        'downloading',
        /* 'error', */
        'noupdate',
        'obsolete',
        'updateready',
    ]

    const valueChangeEvents = [
        'broadcast',
        'CheckBoxStateChange',
        'hashchange',
        'input',
        'RadioStateChange',
        'readystatechange',
        'ValueChange',
    ]

    const uncategorizedEvents = [
        'invalid',
        'localized',
        /* 'message',
	'open', */
        'show',
    ]

    const _standardEvents = resourceEvents
        .concat(networkEvents)
        .concat(focusEvents)
        .concat(websocketEvents)
        .concat(sessionHistoryEvents)
        .concat(cssAnimationEvents)
        .concat(cssTransitionEvents)
        .concat(formEvents)
        .concat(printingEvents)
        .concat(textCompositionEvents)
        .concat(viewEvents)
        .concat(clipboardEvents)
        .concat(keyboardEvents)
        .concat(mouseEvents)
        .concat(dragEvents)
        .concat(mediaEvents)
        .concat(progressEvents)
        .concat(storageEvents)
        .concat(updateEvents)
        .concat(valueChangeEvents)
        .concat(uncategorizedEvents)

    var _events = [],
        _options = {},
        _selectors = {},
        _nodes = {},
        _queue = [],
        _deferred = [],
        _stateTransition = false,
        //_templateMap = {},
        _views = [],
        // selectors are cached for easy reference later

        _setSelector = function (name, selector) {
            _selectors[name] = selector
            _nodes[name] = document.querySelector(selector)
        },
        _getSelector = function (name) {
            return _selectors[name]
        },
        // get an active view from the view struct
        _getView = function (id) {
            return _views[id]
        },
        _getNode = function (name) {
            return _nodes[name]
        },
        // return the registered events for the application
        _getEvents = function () {
            return _events
        },
        // register a view
        // this happens automatically when a view is instantiated
        _register = function (view) {
            switch (_options.renderer) {
                case 'Handlebars':
                case 'Mustache':
                case 'templateLiterals':
                    _views[view.props.id] = view
                    view.fireEvent('registered')
                    break
            }
        },
        // unregister the view
        _unregister = function (id) {
            delete _views[id]
        },
        // get the IDs for the tree of parent views to the root view of this tree
        _getParentViewIds = function (id) {
            a7.log.trace('Find parents of ' + id)
            let parentIds = []
            let view = _views[id]
            while (view.props.parentID !== undefined) {
                parentIds.unshift(view.props.parentID)
                view = _views[view.props.parentID]
            }
            return parentIds
            // parentids returned in highest to lowest order
        },
        // get the tree of child IDs of a view
        _getChildViewIds = function (id) {
            a7.log.trace('Find children of ' + id)
            let childIds = []
            let view = _views[id]

            for (var child in view.children) {
                let childId = view.children[child].props.id
                if (_getView(childId) !== undefined) {
                    childIds.push(childId)
                    childIds.concat(_getChildViewIds(childId))
                }
            }
            // returned in highest to lowest order
            return childIds
        },
        // add a view to the render queue
        _enqueueForRender = function (id) {
            // if _stateTransition is true, the queue is being processed
            if (!_stateTransition) {
                a7.log.info('enqueue: ' + id)
                if (!_queue.length) {
                    a7.log.trace('add first view to queue: ' + id)
                    _queue.push(id)
                    _processRenderQueue()
                } else {
                    let childIds = _getChildViewIds(id)
                    if (_views[id].props.parentID === undefined) {
                        // if the view is a root view, it should be pushed to the front of the stack
                        a7.log.trace('add to front of queue: ' + id)
                        _queue.unshift(id)
                    } else {
                        let parentIds = _getParentViewIds(id)

                        let highParent = undefined
                        if (parentIds.length) {
                            highParent = parentIds.find(function (parentId) {
                                return _queue.indexOf(parentId) >= 0
                            })
                        }

                        // only add if there is no parent in the queue, since parents will render children
                        if (highParent === undefined) {
                            a7.log.trace('add to end of queue: ' + id)
                            _queue.push(id)
                        }
                    }

                    // remove child views from the queue, they will be rendered by the parents
                    childIds.forEach(function (childId) {
                        if (_queue.indexOf(childId) >= 0) {
                            a7.log.trace('remove child from queue: ' + childId)
                            _queue.splice(_queue.indexOf(childId), 1)
                        }
                    })
                }
            } else {
                _deferred.push(id)
            }
        },
        // render the queue
        _processRenderQueue = function () {
            a7.log.trace('processing the queue')
            _stateTransition = true

            _queue.forEach(function (id) {
                _views[id].render()
            })
            _queue = []
            _stateTransition = false
            _deferred.forEach(function (id) {
                _enqueueForRender(id)
            })
            _deferred = []
        },
        _removeView = function (id) {
            delete _views[id]
        }

    return {
        //render: _render,
        getEvents: _getEvents,
        selectors: _selectors,
        getSelector: _getSelector,
        setSelector: _setSelector,
        getNode: _getNode,
        register: _register,
        unregister: _unregister,
        getView: _getView,
        enqueueForRender: _enqueueForRender,
        removeView: _removeView,
        views: _views,

        init: function (resolve, reject) {
            a7.log.info('Layout initializing...')
            _options = a7.model.get('a7').ui

            // set event groups to create listeners for
            var eventGroups = _options.eventGroups
                ? _options.eventGroups
                : 'standard'
            switch (eventGroups) {
                case 'extended':
                    // extended events not implemented yet
                    reject('Extended events are not implemented yet.')
                case 'standard':
                    _events = _standardEvents
                    break
                default:
                    _options.eventGroups.forEach(function (group) {
                        _events = _events.concat(group)
                    })
            }

            resolve()
        },
    }
})()

a7.util = (function () {


	return {
		// split by commas, used below
		split: function (val) {
			return val.split(/,\s*/);
		},

		// return the last item from a comma-separated list
		extractLast: function (term) {
			return this.split(term).pop();
		},

		// encode and decode base64
		base64: {
			keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

			encode64: function (input) {
				if (!String(input).length) {
					return false;
				}
				var output = "", chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				do {
					chr1 = input.charCodeAt(i++);
					chr2 = input.charCodeAt(i++);
					chr3 = input.charCodeAt(i++);

					enc1 = chr1 >> 2;
					enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					enc4 = chr3 & 63;

					if (isNaN(chr2)) {
						enc3 = enc4 = 64;
					} else if (isNaN(chr3)) {
						enc4 = 64;
					}

					output = output + this.keyStr.charAt(enc1)
						+ this.keyStr.charAt(enc2)
						+ this.keyStr.charAt(enc3)
						+ this.keyStr.charAt(enc4);
				} while (i < input.length);

				return output;
			},

			decode64: function (input) {
				if (!input) {
					return false;
				}
				var output = "", chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
				input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

				do {
					enc1 = this.keyStr.indexOf(input.charAt(i++));
					enc2 = this.keyStr.indexOf(input.charAt(i++));
					enc3 = this.keyStr.indexOf(input.charAt(i++));
					enc4 = this.keyStr.indexOf(input.charAt(i++));

					chr1 = (enc1 << 2) | (enc2 >> 4);
					chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
					chr3 = ((enc3 & 3) << 6) | enc4;

					output = output + String.fromCharCode(chr1);

					if (enc3 !== 64) {
						output = output + String.fromCharCode(chr2);
					}
					if (enc4 !== 64) {
						output = output + String.fromCharCode(chr3);
					}
				} while (i < input.length);

				return output;
			}
		},

		// add a leading zero to single numbers so the string is at least two characters
		leadingZero: function (n) {
			return (n < 10) ? ("0" + n) : n;
		},

		dynamicSort: function (property) {
			var sortOrder = 1;
			if (property[0] === "-") {
				sortOrder = -1;
				property = property.substr(1);
			}
			return function (a, b) {
				var result = (a[property] < b[property]) ? -1
					: (a[property] > b[property]) ? 1 : 0;
				return result * sortOrder;
			};
		},

		// return yes|no for 1|0
		yesNo: function (val) {
			return parseInt(val, 10) < 1 ? "No" : "Yes";
		},

		// validate a javascript date object
		isValidDate: function (d) {
			if (Object.prototype.toString.call(d) !== "[object Date]") {
				return false;
			}
			return !isNaN(d.getTime());
		},

		// generate a pseudo-random ID
		id: function () {
			return ((Math.random() * 100).toString() + (Math.random() * 100)
				.toString()).replace(/\./g, "");
		},

		// try/catch a function
		tryCatch: function (fn, ctx, args) {
			var errorObject = {
				value: null
			};
			try {
				return fn.apply(ctx, args);
			} catch (e) {
				errorObject.value = e;
				return errorObject;
			}
		},

		// return a numeric representation of the value passed
		getNumberValue: function (pixelValue) {
			return (isNaN(Number(pixelValue)) ? Number(pixelValue.substring(0, pixelValue.length - 2)) : pixelValue);
		},

		// check whether a value is numeric
		isNumeric: function (num) {
			return !isNaN(parseFloat(num)) && isFinite(num);
		},

		// get top/left offset of a selector on screen
		getOffset: function (selector) {
			var rect = selector.getBoundingClientRect();

			return {
				top: rect.top + document.body.scrollTop,
				left: rect.left + document.body.scrollLeft
			};
		},

		/**
		 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds 
		 * have elapsed since the last time the debounced function was invoked.
		 * 
		 * @param {Function} func - The function to debounce.
		 * @param {number} wait - The number of milliseconds to delay.
		 * @param {boolean} [immediate=false] - Trigger the function on the leading edge, instead of the trailing.
		 * @return {Function} A new debounced function.
		 */
		debounce:function(func, wait, immediate = false) {
			let timeout;

			return function executedFunction() {
				// Save the context and arguments for later invocation
				const context = this;
				const args = arguments;

				// Define the function that will actually call `func`
				const later = function() {
					timeout = null;
					if (!immediate) func.apply(context, args);
				};

				const callNow = immediate && !timeout;

				// Clear the previous timeout
				clearTimeout(timeout);

				// Set a new timeout
				timeout = setTimeout(later, wait);

				// If 'immediate' is true and this is the first time the function has been called,
				// execute it right away
				if (callNow) func.apply(context, args);
			};
		}
	};
}());

//# sourceMappingURL=a7.js.map