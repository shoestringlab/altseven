export var a7 = a7;

var a7 = (function () {
	"use strict";
	return {
		// initialization
		// 1. sets console and templating options
		// 2. initializes user object
		// 3. checks user auth state
		// 4. renders initial layout
		init: function (options, initResolve, initReject) {
			var pr, p0, p1, p2;

			options.model = options.model !== undefined ? options.model : "altseven";
			if (options.model === "") {
				// model required
				initReject("A model is required, but no model was specified.");
			}
			const theOptions = {
				auth: {
					sessionTimeout: options?.auth?.sessionTimeout ?? 15 * 60 * 1000, // 15 minutes
				},
				console: options?.console
					? {
							enabled: options.console.enabled ?? false,
							wsServer: options.console.wsServer ?? "",
							container:
								options.console.container ??
								(typeof gadgetui === "object"
									? gadgetui.display.FloatingPane
									: ""),
							top: options.console.top ?? 100,
							left: options.console.left ?? 500,
							width: options.console.width ?? 500,
							height: options.console.height ?? 300,
						}
					: {},
				logging: {
					logLevel: options?.logging?.logLevel ?? "ERROR,FATAL,INFO",
					toBrowserConsole: options?.logging?.toBrowserConsole ?? false,
				},
				model: options?.model,
				remote: options?.remote
					? {
							loginURL: options.remote.loginURL ?? "",
							logoutURL: options.remote.logoutURL ?? "",
							refreshURL: options.remote.refreshURL ?? "",
							useTokens: options?.auth?.useTokens ?? true,
							tokenType: options.remote.tokenType ?? "X-Token", // Authorization is the other token type
						}
					: { useTokens: true },
				router: options?.router
					? {
							options: {
								useEvents: options.router.useEvents ?? true,
							},
							routes: options.router.routes,
						}
					: undefined,
				security: options?.security
					? {
							enabled: options.security.enabled ?? true,
							options: options.security.options ?? {},
						}
					: { enabled: true, options: {} },
				ui: {
					renderer:
						options?.ui?.renderer ??
						(typeof Mustache === "object"
							? "Mustache"
							: typeof Handlebars === "object"
								? "Handlebars"
								: "templateLiterals"),
					debounceTime: options?.ui?.debounceTime ?? 18,
					timeout: options?.ui?.timeout ?? 600000, // 10 minutes
				},
				ready: false,
			};

			pr = new Promise(function (resolve, reject) {
				a7.log.trace("a7 - model init");
				a7.model.init(theOptions, resolve, reject);
			});

			pr.then(function () {
				a7.model.set("a7", theOptions);
			}).then(function () {
				p0 = new Promise(function (resolve, reject) {
					if (a7.model.get("a7").console.enabled) {
						a7.log.trace("a7 - console init");
						a7.console.init(theOptions, resolve, reject);
					} else {
						resolve();
					}
				});

				p0.then(function () {
					a7.log.trace("a7 - log init");
					a7.log.init();

					if (theOptions.security.enabled) {
						a7.log.trace("a7 - security init");
						// init user state
						// pass security options if they were defined
						a7.security.init(theOptions);
					}
					a7.log.trace("a7 - remote init");
					//pass remote modules if they were defined
					a7.remote.init(
						options.remote && options.remote.modules
							? options.remote.modules
							: {},
					);
					a7.log.trace("a7 - events init");
					a7.events.init();
					// init the router if it is being used
					if (theOptions.router) {
						a7.log.trace("a7 - router init");
						a7.router.init(theOptions.router.options, theOptions.router.routes);
					}
					// init the ui templating engine
					p1 = new Promise(function (resolve, reject) {
						a7.log.trace("a7 - layout init");
						// initialize templating engine
						a7.ui.init(resolve, reject);
					});

					p1.then(function () {
						if (theOptions.security.enabled) {
							p2 = new Promise(function (resolve, reject) {
								a7.log.trace("a7 - isSecured");
								// check whether user is authenticated
								a7.security.isAuthenticated(resolve, reject);
							});

							p2.then(function (response) {
								a7.error.init();
								a7.log.info("Authenticated: " + response.authenticated + "...");
								a7.log.info("Init complete...");
								initResolve(response);
							});

							p2["catch"](function (message) {
								a7.log.error(message);
								initReject();
							});
						} else {
							initResolve({});
						}
					});
				});

				p0["catch"](function (message) {
					a7.log.error(message);
					initReject();
				});
			});

			pr["catch"](function (message) {
				a7.log.error(message);
				initReject();
			});
		},
	};
})();

a7.console = (function () {
	'use strict'

	var title = 'Console Window',
		// the div we'll create to host the console content
		consoleDiv,
		// flag whether console is running
		active = false,
		_addMessage = function (message, dt, source, level) {
			var div = document.createElement('div')
			div.setAttribute('class', 'a7-console-row-' + source)
			if (level !== undefined) {
				div.innerHTML = level + ': '
				div.setAttribute(
					'class',
					div.getAttribute('class') + ' a7-console-row-' + level
				)
			}
			div.innerHTML +=
				+(dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) +
				':' +
				(dt.getMinutes() < 10
					? '0' + dt.getMinutes()
					: dt.getMinutes()) +
				': ' +
				message
			consoleDiv.appendChild(div)
		}

	var _handleMessage = function (message, json) {
		var ix = 0
		if (json.type === 'history') {
			// entire message
			// history
			// insert every single message to the chat window
			for (ix = 0; ix < json.data.length; ix++) {
				_addMessage(
					json.data[ix].text,
					new Date(json.data[ix].time),
					'websocket'
				)
			}
		} else if (json.type === 'message') {
			// it's a single
			// message
			_addMessage(json.data.text, new Date(json.data.time), 'websocket')
		} else {
			a7.log.error("This doesn't look like valid JSON: ", json)
		}
	}

	return {
		init: function (options, resolve, reject) {
			var console = options.console
			if (console.container === '')
				reject(
					'You must specify a container object for the console display.'
				)

			// check for console state
			if (console.enabled) {
				active = true
				consoleDiv = document.createElement('div')
				consoleDiv.setAttribute('id', 'a7consoleDiv')
				consoleDiv.setAttribute('class', 'a7-console')
				document.body.append(consoleDiv)

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
							enableShrink: true,
							enableClose: true,
						},
					],
					false
				)
				if (fp.element) fp.element.setAttribute('right', 0)

				if (console.wsServer) {
					var connection = a7.remote.webSocket(
						console.wsServer,
						_handleMessage
					)
				}

				a7.console.addMessage = _addMessage
				a7.log.info('Console initializing...')
				resolve()
			} else {
				// console init should not run if console is set to false
				reject(
					'Console init should not be called when console option is set to false.'
				)
			}
		},
	}
})()

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

a7.model = (function () {
	'use strict'
	var _model,
		_methods = {}

	return {
		destroy: function () {
			return _methods['destroy'].apply(_model, arguments)
		},
		get: function () {
			return _methods['get'].apply(_model, arguments)
		},
		set: function () {
			return _methods['set'].apply(_model, arguments)
		},
		exists: function () {
			return _methods['exists'].apply(_model, arguments)
		},
		bind: function () {
			return _methods['bind'].apply(_model, arguments)
		},
		undo: function () {
			return _methods['undo'].apply(_model, arguments)
		},
		redo: function () {
			return _methods['redo'].apply(_model, arguments)
		},
		rewind: function () {
			return _methods['rewind'].apply(_model, arguments)
		},
		fastForward: function () {
			return _methods['fastForward'].apply(_model, arguments)
		},
		init: function (options, resolve) {
			a7.log.info('Model initializing... ')

			if (typeof options.model == 'string') {
				switch (options.model) {
					case 'altseven':
						_model = a7.components.Model
						_model.init(options)
						break
					case 'gadgetui':
						_model = gadgetui.model
						break
				}
			} else if (typeof options.model == 'object') {
				_model = options.model
			}
			a7.log.trace('Model set: ' + _model)
			// gadgetui maps directly, so we can loop on the keys
			Object.keys(_model).forEach(function (key) {
				_methods[key] = _model[key]
			})

			resolve()
		},
	}
})()

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
	on: function (event, func) {
		if (this.events[event] === undefined) {
			this.events[event] = []
		}
		this.events[event].push(func)
		return this
	},

	off: function (event) {
		// clear listeners
		this.events[event] = []
		return this
	},

	fireEvent: function (key, args) {
		var _this = this
		if (this.events[key] !== undefined) {
			this.events[key].forEach(function (func) {
				func(_this, args)
			})
		}
	},

	getAll: function () {
		return [
			{ name: 'on', func: this.on },
			{ name: 'off', func: this.off },
			{ name: 'fireEvent', func: this.fireEvent },
		]
	},
}

class Component {
	constructor() {
		this.events = {};
	}

	// event bindings
	on(event, func) {
		if (this.events[event] === undefined) {
			this.events[event] = [];
		}
		this.events[event].push(func);
		return this;
	}

	off(event) {
		// Clear listeners
		this.events[event] = [];
		return this;
	}

	fireEvent(key, args) {
		if (this.events[key] !== undefined) {
			this.events[key].forEach((func) => {
				func(this, args);
			});
		}
	}

	getAll() {
		return [
			{ name: "on", func: this.on },
			{ name: "off", func: this.off },
			{ name: "fireEvent", func: this.fireEvent },
		];
	}
}

class DataProvider extends Component {
	#state = {};
	#schema;
	constructor(props) {
		super();
		this.binding = props?.binding;
		this.#state = props.state;
		this.#schema = props.schema;
		this.view = props.view;

		this.id = this.view.props.id + "-dataProvider";
		this.services = new Map();
		this.bindings = new Map(); // New map to store bindings
		this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		// Config setup
		// Get the services registered in the app
		this.services = a7.services.getAll();
		this.on("mustRegister", () => {
			this.register();
		});
		// bind to data
		this.bind();
	}

	register() {
		// Register with the services
		this.services.forEach((service) => {
			service.registerDataProvider(this);
		});
	}

	bind() {
		if (this.binding) {
			for (let rule in this.binding) {
				let matchingService = [...this.services.values()].find(
					(service) => service.entityClass === this.binding[rule].entityClass,
				);
				if (matchingService) {
					a7.log.trace("Binding: ", rule);
					let filter = this.binding[rule].filter || null;
					let func = this.binding[rule].func || null;
					let dependencies = this.binding[rule].dependencies || null;
					this.bindings.set(rule, {
						key: rule,
						service: matchingService,
						filter: filter,
						func: func,
						dependencies: dependencies,
					});

					matchingService.bind(rule, filter);

					let data = matchingService.get();

					if (filter !== null) {
						data = matchingService.filter(data, filter);
					}

					this.setStateOnly({ [rule]: data });

					//Listen for changes in the service cache
					matchingService.on("cacheChanged", (service, args) => {
						this.updateBoundState(this.bindings.get(rule), args);
					});
				}
			}
		}
	}

	async updateBoundState(binding, args) {
		let updatedData;
		if (binding.func !== null) {
			// pass the filter to the func
			args = Object.assign(args, { filter: binding.filter });
			if (binding.func.constructor.name === "AsyncFunction") {
				updatedData = await binding.func(args, this.getState());
			} else {
				updatedData = binding.func(args, this.getState());
			}
			//let type = binding.entityClass.type;
			let type = this.#schema[binding.key].type;
			if (type === "map" && Array.isArray(updatedData)) {
				updatedData = binding.service.convertArrayToMap(updatedData);
			}

			this.view.setState({ [binding.key]: updatedData });
		} else {
			updatedData = binding.service.get();
			if (binding.filter !== null) {
				updatedData = this.filter(updatedData, binding.filter);
			}
			let type = this.#schema[binding.key].type;

			// for object types
			if (type === "object") {
				updatedData = Array.from(updatedData.values());
				updatedData = updatedData[0];
			}
			this.view.setState({ [binding.key]: updatedData });
		}
	}

	get schema() {
		return this.#schema;
	}
	setStateOnly(args) {
		// Defaults to the built-in behavior of the View
		this.#state = Object.assign(this.#state, args);
	}
	setState(args) {
		this.setStateOnly(args);
		let bindingsUpdated = new Map();
		// check if the updated keys are dependencies for bound keys
		for (let key in args) {
			this.bindings.forEach((binding) => {
				if (
					binding.dependencies !== null &&
					binding.dependencies.includes(key)
				) {
					if (!bindingsUpdated.has(binding)) {
						this.updateBoundState(binding, { action: "refresh" });
						bindingsUpdated.set(binding, "");
					}
				}
			});
		}
	}

	getState() {
		return Object.assign({}, this.#state);
	}
}

class Entity extends Component {
	#schema;
	#data;
	constructor(props) {
		super();
		this.#schema = props.schema;
		this.#data = {};
		if (this.#schema && this.validate()) {
			for (const [key, descriptor] of Object.entries(this.#schema)) {
				this._defineProperty(key);
				this[key] = props[key];
			}
		}
	}

	_defineProperty(key) {
		const propertyName = `_${key}`;
		this.#data[propertyName] = undefined;

		Object.defineProperty(this, key, {
			get: function () {
				return this.#data[propertyName];
			},
			set: function (value) {
				const schemaDescriptor = this.#schema[key];

				if (schemaDescriptor.required && value === undefined) {
					throw new Error(`Property ${key} is required.`);
				}

				// Check data type
				const expectedType = schemaDescriptor.type;
				const valueType = typeof value;

				if (
					!this._isOfType(value, expectedType) &&
					value !== null &&
					typeof value !== "undefined"
				) {
					throw new Error(
						`Invalid type for property ${key}. Expected ${expectedType}, but got ${valueType}.`,
					);
				}

				this.#data[propertyName] = value;
			},
		});
	}

	_isOfType(value, expectedType) {
		// Special case for checking if the value is an instance of a specific class
		// if (expectedType === "date") {
		// 	return new Date(value) instanceof Date;
		// }
		// if (expectedType === "array") {
		// 	return Array.isArray(value);
		// }

		switch (expectedType) {
			case "date":
				return new Date(value) instanceof Date;
				break;
			case "array":
				return Array.isArray(value);
				break;
			case "boolean":
				return value === 0 || value === 1 || value === true || value === false
					? true
					: false;
				break;
			case "integer":
				return Number.isInteger(value);
				break;
			case "float":
				return typeof value === "number";
				break;
			case "string":
				return typeof value === "string";
				break;
			default:
				return true;
				break;
		}
	}

	get schema() {
		return this.#schema;
	}

	validate() {
		for (let field in this.#schema) {
			if (field.required && !this.#data[field]) {
				throw new Error(`Field ${field} is required`);
			}
			if (field.type && typeof this.#data[field] !== field.type) {
				throw new Error(`Field ${field} must be of type ${field.type}`);
			}
		}
		return true;
	}
}

const Model = (() => {
	"use strict";

	const modelStore = new Map();
	const mementoStore = new Map();
	let maxMementos = 20; // Default value

	class BindableObject {
		constructor(data, element) {
			this.data = this.processValue(data);
			this.elements = [];
			this.mementos = [];
			this.currentMementoIndex = -1;
			if (element) {
				this.bind(element);
			}
			this.saveMemento(); // Save initial state
		}

		handleEvent(event) {
			if (event.type !== "change") return;

			event.originalSource ??= "BindableObject.handleEvent[change]";

			for (const { elem, prop } of this.elements) {
				if (
					event.target.name === prop &&
					event.originalSource !== "BindableObject.updateDomElement"
				) {
					const value = event.target.type.includes("select")
						? {
								id: event.target.value,
								text: event.target.options[event.target.selectedIndex]
									.textContent,
							}
						: event.target.value;

					this.change(value, event, prop);
				}
			}
		}

		change(value, event, property) {
			event.originalSource ??= "BindableObject.change";
			a7.log.trace(`change : Source: ${event.originalSource}`);

			const processedValue = this.processValue(value);

			if (!property) {
				this.data = processedValue;
			} else if (typeof this.data === "object" && this.data !== null) {
				if (!(property in this.data)) {
					throw new Error(`Property '${property}' of object is undefined.`);
				}
				this.data[property] = processedValue;
			} else {
				throw new Error(
					"Attempt to treat a simple value as an object with properties.",
				);
			}

			this.saveMemento();

			this.elements
				.filter(
					({ prop, elem }) =>
						(!property || property === prop) && elem !== event.target,
				)
				.forEach(({ elem }) =>
					this.updateDomElement(event, elem, processedValue),
				);
		}

		updateDom(event, value, property) {
			event.originalSource ??= "BindableObject.updateDom";

			this.elements.forEach(({ elem, prop }) => {
				if (!property) {
					if (typeof value === "object" && value !== null) {
						if (prop in value) {
							this.updateDomElement(event, elem, value[prop]);
						}
					} else {
						this.updateDomElement(event, elem, value);
					}
				} else if (prop === property) {
					this.updateDomElement(event, elem, value);
				}
			});
		}

		updateDomElement(event, element, value) {
			event.originalSource ??= "BindableObject.updateDomElement";

			const updateOptions = () => {
				element.innerHTML = "";
				const items = Array.isArray(value)
					? value
					: value instanceof Map
						? Array.from(value.entries())
						: [value];

				if (element.tagName === "SELECT") {
					items.forEach((item, idx) => {
						const opt = document.createElement("option");
						opt.value = typeof item === "object" ? (item.id ?? item[0]) : item;
						opt.textContent =
							typeof item === "object" ? (item.text ?? item[1]) : item;
						element.appendChild(opt);
					});
				} else if (["UL", "OL"].includes(element.tagName)) {
					items.forEach((item) => {
						const li = document.createElement("li");
						li.textContent =
							typeof item === "object" ? (item.text ?? item[1]) : item;
						element.appendChild(li);
					});
				}
			};

			const isInput = ["INPUT", "TEXTAREA"].includes(element.tagName);
			const isArrayElement = ["OL", "UL", "SELECT"].includes(element.tagName);
			const textElements = [
				"DIV", // Generic container, often contains text
				"SPAN", // Inline container, typically for text styling
				"H1", // Heading level 1
				"H2", // Heading level 2
				"H3", // Heading level 3
				"H4", // Heading level 4
				"H5", // Heading level 5
				"H6", // Heading level 6
				"P", // Paragraph
				"LABEL", // Caption for form elements, displays text
				"BUTTON", // Clickable button, often with text content
				"A", // Anchor (hyperlink), typically contains text
				"STRONG", // Bold text for emphasis
				"EM", // Italic text for emphasis
				"B", // Bold text (presentational)
				"I", // Italic text (presentational)
				"U", // Underlined text
				"SMALL", // Smaller text, often for fine print
				"SUB", // Subscript text
				"SUP", // Superscript text
				"Q", // Short inline quotation
				"BLOCKQUOTE", // Long quotation
				"CITE", // Citation or reference
				"CODE", // Code snippet
				"PRE", // Preformatted text
				"ABBR", // Abbreviation with optional title attribute
				"DFN", // Defining instance of a term
				"SAMP", // Sample output from a program
				"KBD", // Keyboard input
				"VAR", // Variable in programming/math context
				"LI", // List item (in UL or OL)
				"DT", // Term in a description list
				"DD", // Description in a description list
				"TH", // Table header cell
				"TD", // Table data cell
				"CAPTION", // Table caption
				"FIGCAPTION", // Caption for a figure
				"SUMMARY", // Summary for a details element
				"LEGEND", // Caption for a fieldset in a form
				"TITLE", // Document title (displayed in browser tab)
			];
			const isTextElement = textElements.includes(element.tagName);

			if (typeof value === "object" && value !== null) {
				if (isInput)
					element.value =
						value.id ?? (value instanceof Map ? "" : value[0]) ?? "";
				else if (isArrayElement) updateOptions();
				else if (isTextElement)
					element.textContent =
						value.text ?? (value instanceof Map ? "" : value[1]) ?? "";
			} else {
				if (isInput) element.value = value ?? "";
				else if (isArrayElement) updateOptions();
				else if (isTextElement) element.textContent = value ?? "";
			}

			if (
				event.originalSource !== "model.set" &&
				event.originalSource !== "memento.restore"
			) {
				element.dispatchEvent(
					new Event("change", {
						originalSource: "model.updateDomElement",
					}),
				);
			}
		}

		bind(element, property) {
			const binding = { elem: element, prop: property || "" };
			element.value = property ? this.data[property] : this.data;

			element.addEventListener("change", this);
			this.elements.push(binding);
		}

		processValue(value) {
			switch (typeof value) {
				case "undefined":
				case "number":
				case "boolean":
				case "function":
				case "symbol":
				case "string":
					return value;
				case "object":
					if (value === null) return null;
					if (value instanceof Map) return new Map(value);
					return JSON.parse(JSON.stringify(value));
				default:
					return value;
			}
		}

		saveMemento() {
			// Remove future mementos if we're adding after an undo
			if (this.currentMementoIndex < this.mementos.length - 1) {
				this.mementos.splice(this.currentMementoIndex + 1);
			}

			const memento = this.processValue(this.data);
			this.mementos.push(memento);

			if (this.mementos.length > maxMementos) {
				this.mementos.shift(); // Remove oldest memento
			} else {
				this.currentMementoIndex++;
			}
		}

		undo() {
			if (this.currentMementoIndex > 0) {
				this.currentMementoIndex--;
				this.restoreMemento();
				return true;
			}
			return false;
		}

		redo() {
			if (this.currentMementoIndex < this.mementos.length - 1) {
				this.currentMementoIndex++;
				this.restoreMemento();
				return true;
			}
			return false;
		}

		rewind() {
			if (this.currentMementoIndex > 0) {
				this.currentMementoIndex = 0;
				this.restoreMemento();
				return true;
			}
			return false;
		}

		fastForward() {
			if (this.currentMementoIndex < this.mementos.length - 1) {
				this.currentMementoIndex = this.mementos.length - 1;
				this.restoreMemento();
				return true;
			}
			return false;
		}

		restoreMemento() {
			this.data = this.processValue(this.mementos[this.currentMementoIndex]);
			const event = { originalSource: "memento.restore" };
			this.elements.forEach(({ elem, prop }) => {
				this.updateDomElement(event, elem, prop ? this.data[prop] : this.data);
			});
		}
	}

	return {
		BindableObject,

		init(options = {}) {
			maxMementos = options.maxMementos ?? 20;
		},

		create(name, value, element) {
			const processedValue = new BindableObject(value).processValue(value);
			const bindable = new BindableObject(processedValue, element);
			modelStore.set(name, bindable);
			mementoStore.set(name, bindable);
		},

		destroy(name) {
			modelStore.delete(name);
			mementoStore.delete(name);
		},

		bind(name, element) {
			const [base, prop] = name.split(".");
			const model = modelStore.get(base);
			if (model) {
				model.bind(element, prop);
			}
		},

		exists(name) {
			return modelStore.has(name);
		},

		get(name, key) {
			if (!name) {
				a7.log.error("Expected parameter [name] is not defined.");
				return undefined;
			}

			const [base, prop] = name.split(".");
			const model = modelStore.get(base);

			if (!model) {
				a7.log.error(`Key '${base}' does not exist in the model.`);
				return undefined;
			}
			if (!key) {
				const value = prop ? model.data[prop] : model.data;
				return value instanceof Map ? new Map(value) : value;
			} else {
				if (model.data instanceof Map) {
					if (!model.data.has(key)) {
						a7.log.error(`Key '${key}' does not exist in the Map .`);
					} else {
						return model.data.get(key);
					}
				}
			}
		},

		set(name, value) {
			if (!name) {
				a7.log.error("Expected parameter [name] is not defined.");
				return;
			}

			const [base, prop] = name.split(".");
			const event = { originalSource: "model.set" };

			if (!modelStore.has(base)) {
				if (!prop) {
					this.create(base, value);
				} else {
					throw new Error(`Object ${base} is not yet initialized.`);
				}
			} else {
				const model = modelStore.get(base);
				const processedValue = model.processValue(value);
				model.change(processedValue, event, prop);
				model.updateDom(event, processedValue, prop);
			}
		},

		undo(name) {
			const model = mementoStore.get(name);
			return model ? model.undo() : false;
		},

		redo(name) {
			const model = mementoStore.get(name);
			return model ? model.redo() : false;
		},

		rewind(name) {
			const model = mementoStore.get(name);
			return model ? model.rewind() : false;
		},

		fastForward(name) {
			const model = mementoStore.get(name);
			return model ? model.fastForward() : false;
		},
	};
})();

/*
// Initialize with custom memento limit
model.init({ maxMementos: 50 });

// Create a model
model.create("user", { name: "John" });

// Make changes
model.set("user.name", "Jane");
model.set("user.name", "Bob");

// Undo/redo
model.undo("user"); // Returns to "Jane"
model.undo("user"); // Returns to "John"
model.redo("user"); // Returns to "Jane"

// Rewind/fast forward
model.rewind("user"); // Back to "John"
model.fastForward("user"); // To "Bob"

*/

class Service extends Component {
	constructor(props) {
		super();
		this.id = props.id; // id of the service to register with the framework
		this.key = props.key; // name of the Object key
		this.remoteMethods = props.remoteMethods;
		this.entityClass = props.entityClass; // Entity class to use for data operations
		this.dataProviders = new Map();
		this.bindings = new Map(); // New map to store bindings

		// Queue initialization
		this.queue = new Map();

		this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		let dataMap = this.get();
		if (!dataMap || !(dataMap instanceof Map)) {
			this.set(new Map());
		}

		this.on(
			"mustRegister",
			function () {
				a7.log.trace("mustRegister: Service: " + this.id);
				a7.services.register(this);
			}.bind(this),
		);
	}

	registerDataProvider(dp) {
		// Register the new data provider
		this.dataProviders.set(dp.id, dp);
	}

	convertArrayToMap(dataArray) {
		let dataMap = new Map();
		dataArray.forEach((item) => {
			if (item[this.key]) {
				dataMap.set(item[this.key], item);
			}
		});
		return dataMap;
	}

	convertMapToArray(dataMap) {
		return Array.from(dataMap.values());
	}

	// Compare itemIDs against cached items
	compareIDs(IDs) {
		a7.log.trace("Service: " + this.id);
		a7.log.trace("compareIDs: " + IDs);

		const dataMap = this.get();
		const present = [];
		const missing = [];

		if (!(dataMap instanceof Map)) {
			return { present, missing: IDs };
		}

		IDs.forEach((id) => {
			if (dataMap.has(id)) {
				present.push(id);
			} else {
				missing.push(id);
			}
		});
		a7.log.trace(
			"results: " + JSON.stringify(present) + " " + JSON.stringify(missing),
		);

		return { present, missing };
	}

	// Merge new items into the existing Map
	merge(newItems) {
		let dataMap = this.get();

		if (!(dataMap instanceof Map)) {
			dataMap = new Map();
		}

		newItems.forEach((item) => {
			if (item[this.key]) {
				dataMap.set(item[this.key], item);
			}
		});

		this.set(dataMap);

		this.fireEvent("cacheChanged", { action: "refresh" });
		return dataMap;
	}

	bind(key, filter) {
		this.bindings.set(key, { filter: filter });
	}

	async create(obj) {
		let entityInstance = new this.entityClass(obj);
		await a7.remote
			.invoke(this.remoteMethods.create, entityInstance)
			.then((response) => response.json())
			.then((json) => {
				this.cacheSet(json);
				entityInstance = new this.entityClass(json);
			});
		return entityInstance;
	}

	async read(obj) {
		let dataMap = this.get();
		const requestKey = `${this.remoteMethods.read}-${JSON.stringify(obj)}`;
		if (this.queue.has(requestKey)) {
			a7.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			if (!dataMap.has(obj[this.key])) {
				await a7.remote
					.invoke(this.remoteMethods.read, obj)
					.then((response) => response.json())
					.then((json) => {
						this.cacheSet(json);
						this.queue.delete(requestKey);
						dataMap = this.get();
					});
			}
		}

		return dataMap.get(obj[this.key]);
	}

	async update(obj) {
		let entityInstance = new this.entityClass(obj);
		await a7.remote
			.invoke(this.remoteMethods.update, obj)
			.then((response) => response.json())
			.then((json) => {
				this.cacheSet(json);
				entityInstance = new this.entityClass(json);
			});
		return entityInstance;
	}

	async delete(obj) {
		await a7.remote
			.invoke(this.remoteMethods.delete, obj)
			.then((response) => response.json())
			.then((json) => {
				this.cacheDelete(obj[this.key]);
			});
		return true;
	}

	async readAll(obj) {
		const requestKey = `${this.remoteMethods.readAll}-${JSON.stringify(obj)}`;
		if (this.queue.has(requestKey)) {
			a7.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			let dataMap = this.get();
			if (!dataMap.size) {
				await a7.remote
					.invoke(this.remoteMethods.readAll, obj)
					.then((response) => response.json())
					.then((json) => {
						this.merge(json);
						this.queue.delete(requestKey);
					});
			}
		}
		return this.get();
	}

	cacheDelete(id) {
		let dataMap = this.get();
		dataMap.delete(id);
		this.set(dataMap);

		// Notify bound DataProviders

		this.fireEvent("cacheChanged", { action: "refresh" });
	}

	cacheSet(item) {
		let dataMap = this.get();
		dataMap.set(item[this.key], item);
		this.set(dataMap);

		// Notify bound DataProviders

		this.fireEvent("cacheChanged", {
			action: "refresh",
		});
	}

	set(dataMap) {
		a7.model.set(this.id, dataMap);
	}

	get(ID) {
		if (typeof ID === "undefined") {
			return a7.model.get(this.id);
		} else {
			return a7.model.get(this.id, ID);
		}
	}

	// Retrieve items, using cache when possible
	async readMany(IDs) {
		if (typeof IDs === "undefined") {
			return new Map();
		}
		a7.log.trace("readMany: ");
		// Get cached items
		const itemsMap = this.get();
		const requestKey = `${this.remoteMethods.readMany}-${JSON.stringify(IDs)}`;
		if (this.queue.has(requestKey)) {
			a7.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			// Compare requested IDs with cache
			const { present, missing } = this.compareIDs(IDs);

			// Fetch missing items if any

			a7.log.trace("Missing? " + missing.length);
			if (missing.length > 0) {
				let obj = { id: missing };

				await a7.remote
					.invoke(this.remoteMethods.readMany, obj)
					.then((response) => response.json())
					.then((json) => {
						if (Array.isArray(json)) {
							this.merge(json);
							this.queue.delete(requestKey);
						}
					});
			}

			const cachedItems = present.map((id) => itemsMap.get(id));
		}

		// Return all requested items in order, filtering out nulls
		const result = IDs.map((id) => {
			const item = itemsMap.get(id);
			return item || null; // Return null for items that couldn't be found
		});
		return result.filter((item) => item !== null); // Filter out any null values
	}

	sort(items, sortFields) {
		// Convert items to array if it's a Map
		let itemsArray = items instanceof Map ? Array.from(items.values()) : items;

		// Validate sortFields input
		if (
			!sortFields ||
			typeof sortFields !== "object" ||
			Object.keys(sortFields).length === 0
		) {
			throw new Error("Invalid sort fields provided");
		}

		// Sort the array based on the provided sort fields and directions
		itemsArray.sort((a, b) => {
			for (let field of Object.keys(sortFields)) {
				const direction = sortFields[field] || "asc"; // Default to ascending if no direction is specified
				const valueA = a[field];
				const valueB = b[field];

				if (valueA === undefined || valueB === undefined) {
					continue;
				}

				if (typeof valueA !== typeof valueB) {
					throw new Error(`Inconsistent types for sorting field '${field}'`);
				}

				if (typeof valueA === "string") {
					// Handle string comparison
					const result = valueA.localeCompare(valueB);
					return direction === "asc" ? result : -result;
				} else {
					// Handle number and other comparable types
					if (valueA < valueB) {
						return direction === "asc" ? -1 : 1;
					} else if (valueA > valueB) {
						return direction === "asc" ? 1 : -1;
					}
				}
			}

			// If all fields are equal, maintain original order
			return 0;
		});

		return itemsArray;
	}

	filter(items, criteria) {
		// Convert items to array if it's a Map
		let itemsArray = Array.isArray(items) ? items : Array.from(items.values());

		// Validate criteria input
		if (
			!criteria ||
			typeof criteria !== "object" ||
			Object.keys(criteria).length === 0
		) {
			throw new Error("Invalid filter criteria provided");
		}

		// Helper function to compare values based on the operator
		const compareValues = (valueA, valueB, operator) => {
			switch (operator) {
				case "=":
					return valueA === valueB;
				case "!=":
					return valueA !== valueB;
				case ">":
					return valueA > valueB;
				case "<":
					return valueA < valueB;
				case ">=":
					return valueA >= valueB;
				case "<=":
					return valueA <= valueB;
				case "∈":
				case "in":
					// Check if value is in the set
					return Array.isArray(valueB) && valueB.includes(valueA);
				case "∉":
				case "not in":
					// Check if value is not in the set
					return Array.isArray(valueB) && !valueB.includes(valueA);
				default:
					throw new Error(`Invalid operator: ${operator}`);
			}
		};

		// Helper function to check if a value is within a range
		const isWithinRange = (value, range) => {
			if (!Array.isArray(range) || range.length !== 2) {
				throw new Error("Range must be an array with two elements");
			}
			return value >= range[0] && value <= range[1];
		};

		// Filter the array based on the provided criteria
		const filteredItems = itemsArray.filter((item) => {
			for (let field of Object.keys(criteria)) {
				const criterion = criteria[field];

				if (Array.isArray(criterion) && criterion.length === 3) {
					// Handle specific operator, value, and regex flag
					const [operator, value, useRegex] = criterion;
					let valueA = item[field];
					let valueB = value;

					if (useRegex && typeof valueB === "string") {
						// Use regex for string matching
						const regex = new RegExp(valueB);
						return compareValues(
							valueA.toString(),
							regex.test(valueA),
							operator,
						);
					} else {
						// Use normal comparison
						return compareValues(valueA, valueB, operator);
					}
				} else if (Array.isArray(criterion) && criterion.length === 2) {
					const operator = criterion[0];
					const value = criterion[1];

					// Handle range match or simple equality/inequality check
					if (typeof value === "object" && Array.isArray(value)) {
						return isWithinRange(item[field], value);
					} else {
						// Simple equality/inequality check
						return compareValues(item[field], value, operator);
					}
				} else {
					throw new Error(`Invalid criterion for field: ${field}`);
				}
			}
			return true;
		});

		return filteredItems;
	}

	// notifyBoundDataProviders(action, data) {
	// 	this.bindings.forEach((binding, key) => {
	// 		if (this.dataProviders.size > 0) {
	// 			//const filter = binding.filter || {};
	// 			if (binding.filter !== null) {
	// 				data = this.filter(dataMap.values(), filter);
	// 			}

	// 			this.dataProviders.forEach((dp) =>
	// 				dp.setState({ [key]: filteredData }),
	// 			);
	// 		}
	// 	});
	// }
}

class User extends Component {
	constructor(args) {
		super();
		// Initialize the User object with provided arguments
		Object.assign(this, args);
	}

	getMemento() {
		const user = {};
		const self = this;
		Object.keys(this).forEach((key) => {
			user[key] = self[key];
		});
		return user;
	}
}

class View extends Component {
	constructor(props) {
		super();
		this.renderer = a7.model.get("a7").ui.renderer;
		this.type = "View";
		this.timeout;
		this.timer;
		this.element; // HTML element the view renders into
		this.props = props;
		this.isTransient = props.isTransient || false;
		this.state = {};
		this.skipRender = false;
		this.children = {}; // Child views
		this.components = {}; // Register objects external to the framework so we can address them later
		this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		this.on(
			"mustRegister",
			function () {
				a7.log.trace("mustRegister: " + this.props.id);
				a7.ui.register(this);
				if (a7.ui.getView(this.props.parentID)) {
					a7.ui.getView(this.props.parentID).addChild(this);
				}
			}.bind(this),
		);

		this.on(
			"mustRender",
			a7.util.debounce(
				function () {
					a7.log.trace("mustRender: " + this.props.id);
					if (this.shouldRender()) {
						a7.ui.enqueueForRender(this.props.id);
					} else {
						a7.log.trace("Render cancelled: " + this.props.id);
						this.skipRender = false;
					}
				}.bind(this),
			),
			a7.model.get("a7").ui.debounceTime,
			true,
		);

		this.on(
			"rendered",
			function () {
				if (this.isTransient) {
					if (this.timer !== undefined) {
						clearTimeout(this.timer);
					}
					this.timer = setTimeout(
						this.checkRenderStatus.bind(this),
						a7.model.get("a7").ui.timeout,
					);
				}
				this.onRendered();
			}.bind(this),
		);

		this.on(
			"registered",
			function () {
				if (this.props.parentID === undefined || this.mustRender) {
					this.fireEvent("mustRender");
				}
			}.bind(this),
		);

		this.on(
			"mustUnregister",
			function () {
				a7.ui.unregister(this.props.id);
			}.bind(this),
		);
	}

	// events = [
	// 	"mustRender",
	// 	"rendered",
	// 	"mustRegister",
	// 	"registered",
	// 	"mustUnregister",
	// ];

	setState(args) {
		if (this.dataProvider) {
			this.dataProvider.setState(args);
		} else {
			this.state = Object.assign(args);
		}
		// if (typeof this.state === "object") {
		// 	this.state = Object.assign(args);
		// } else {
		// 	this.dataProvider.setState(args);
		// }
		this.fireEvent("mustRender");
	}

	getState() {
		if (this.dataProvider) {
			return this.dataProvider.getState();
		} else {
			return Object.assign(this.state);
		}
		// if (typeof this.state === "object") {
		// 	return Object.assign(this.state);
		// } else {
		// 	return this.dataProvider.getState();
		// }
	}

	registerDataProvider(dp) {
		this.dataProvider = dp;
	}

	unregisterDataProvider() {
		this.dataProvider = null;
	}

	addChild(view) {
		this.children[view.props.id] = view;
	}

	removeChild(view) {
		delete this.children[view.props.id];
	}

	clearChildren() {
		this.children = {};
	}

	getParent() {
		return this.props.parentID ? a7.ui.getView(this.props.parentID) : undefined;
	}

	render() {
		a7.log.trace("render: " + this.props.id);
		if (this.element === undefined || this.element === null) {
			this.element = document.querySelector(this.props.selector);
		}
		if (!this.element) {
			a7.log.error(
				"The DOM element for view " +
					this.props.id +
					" was not found. The view will be removed and unregistered.",
			);
			if (this.props.parentID !== undefined) {
				a7.ui.getView(this.props.parentID).removeChild(this);
			}
			this.fireEvent("mustUnregister");
			return;
		}

		this.element.innerHTML =
			typeof this.template == "function" ? this.template() : this.template;

		var eventArr = [];
		a7.ui.getEvents().forEach(function (eve) {
			eventArr.push("[data-on" + eve + "]");
		});
		var eles = this.element.querySelectorAll(eventArr.toString());

		eles.forEach(
			function (sel) {
				for (var ix = 0; ix < sel.attributes.length; ix++) {
					var attribute = sel.attributes[ix];
					if (attribute.name.startsWith("data-on")) {
						var event = attribute.name.substring(7, attribute.name.length);
						sel.addEventListener(
							event,
							this.eventHandlers[sel.attributes["data-on" + event].value],
						);
					}
				}
			}.bind(this),
		);

		let boundEles = this.element.querySelectorAll("[data-bind]");
		boundEles.forEach(function (ele) {
			a7.model.bind(ele.attributes["data-bind"].value, ele);
		});
		this.fireEvent("rendered");
	}

	shouldRender() {
		if (this.skipRender) {
			return false;
		} else {
			return true;
		}
	}

	onRendered() {
		for (var child in this.children) {
			this.children[child].element = document.querySelector(
				this.children[child].props.selector,
			);
			this.children[child].render();
		}
	}

	checkRenderStatus() {
		if (document.querySelector(this.props.selector) === null) {
			a7.ui.unregister(this.id);
		} else {
			if (this.isTransient) {
				this.timer = setTimeout(
					this.checkRenderStatus.bind(this),
					a7.model.get("a7").ui.timeout,
				);
			}
		}
	}
}

return {
	Component: Component,
	Constructor: Constructor,
	DataProvider: DataProvider,
	Entity: Entity,
	EventBindings: EventBindings,
	Model: Model,
	Service: Service,
	User: User,
	View: View,
};
}());
//
a7.remote = (function () {
	var _options = {},
		_time = new Date(),
		_token,
		_sessionTimer,
		_modules = {},
		_setModule = function (key, module) {
			_modules[key] = module;
		};

	var _webSocket = function (wsServer, messageHandler, isJSON) {
			if (wsServer) {
				window.WebSocket = window.WebSocket || window.MozWebSocket;

				// if browser doesn't support WebSocket, just show some
				// notification and exit
				if (!window.WebSocket) {
					a7.log.error("Your browser doesn't support WebSockets.");
					return;
				}

				// open connection
				let connection = new WebSocket(wsServer);

				connection.onopen = function () {
					a7.log.info("Connecting to the socket server at " + wsServer);
				};

				connection.onerror = function () {
					var message = "Can't connect to the socket server at " + wsServer;
					a7.log.error(message);
				};

				// most important part - incoming messages
				connection.onmessage = function (message) {
					if (isJSON) {
						var json;
						// try to parse JSON message. Because we know that the
						// server always returns
						// JSON this should work without any problem but we should
						// make sure that
						// the message is not chunked or otherwise damaged.
						try {
							json = JSON.parse(message.data);
						} catch (er) {
							a7.log.error("This doesn't look like valid JSON: ", message.data);
							return;
						}
						messageHandler(message, json);
					} else {
						messageHandler(message);
					}
				};

				window.addEventListener("close", function () {
					connection.close();
				});

				return connection;
			}
		},
		_refreshClientSession = function () {
			var promise = new Promise(function (resolve, reject) {
				a7.remote.invoke("auth.refresh", {
					resolve: resolve,
					reject: reject,
				});
			});

			promise
				.then(function (response) {
					if (response.authenticated) {
						// session is still active, no need to do anything else
						a7.log.trace("Still logged in.");
					}
				})
				.catch(function (error) {
					a7.events.publish("auth.sessionTimeout");
				});
		},
		_setToken = function (token) {
			sessionStorage.token = token;
			_token = token;
		};

	return {
		webSocket: _webSocket,
		getToken: function () {
			return _token;
		},
		invalidateToken: function () {
			_setToken("");
		},
		getSessionTimer: function () {
			return _sessionTimer;
		},
		refreshClientSession: _refreshClientSession,
		init: function (modules) {
			var auth = a7.model.get("a7").auth;
			_options = a7.model.get("a7").remote;

			_options.sessionTimeout = auth.sessionTimeout;
			// set token if valid
			if (
				_options.useTokens &&
				sessionStorage.token &&
				sessionStorage.token !== ""
			) {
				_token = sessionStorage.token;
			}

			var authModule = {
				login: function (params) {
					a7.log.trace("remote call: auth.login");
					var request,
						args = {
							method: "POST",
							headers: {
								Authorization:
									"Basic " +
									a7.util.base64.encode64(
										params.username + ":" + params.password,
									),
								Accept:
									"application/json, application/xml, text/play, text/html, *.*",
								"Content-Type": "application/json; charset=utf-8",
							},
							body: JSON.stringify({
								rememberMe: params.rememberMe || false,
							}),
						};

					request = new Request(_options.loginURL, args);

					var promise = fetch(request);

					promise
						.then(function (response) {
							// set the token into sessionStorage so it is available if the browser is refreshed
							//
							var token =
								_options.tokenType === "X-Token"
									? response.headers.get("X-Token")
									: response.headers.get("Access_token");
							if (token !== undefined && token !== null) {
								_setToken(token);
							}
							return response.json();
						})
						.then(function (json) {
							if (json.success) {
								var user = a7.model.get("user");
								// map the response object into the user object
								Object.keys(json.user).map(function (key) {
									user[key] = json.user[key];
								});
								// set the user into the sessionStorage and the model
								sessionStorage.user = JSON.stringify(user);
								a7.model.set("user", user);

								// handler/function/route based on success
								if (params.success !== undefined) {
									if (typeof params.success === "function") {
										params.success(json);
									} else if (a7.model.get("a7").router) {
										a7.router.open(params.success, json);
									} else {
										a7.events.publish(params.success, json);
									}
								}
							} else if (params.failure !== undefined) {
								// if login failed
								if (typeof params.failure === "function") {
									params.failure(json);
								} else if (a7.model.get("a7").router) {
									a7.router.open(params.failure, json);
								} else {
									a7.events.publish(params.failure, json);
								}
							}
							if (params.callback !== undefined) {
								params.callback(json);
							}
						});
				},
				logout: function (params) {
					a7.log.trace("remote call: auth.logout");
					var request,
						args = {
							method: "POST",
							headers: {
								Authorization:
									"Basic " +
									a7.util.base64.encode64(
										params.username + ":" + params.password,
									),
							},
						};

					request = new Request(_options.logoutURL, args);

					var promise = fetch(request);

					promise
						.then(function (response) {
							return response.json();
						})
						.then(function (json) {
							if (json.success) {
								a7.security.invalidateSession();
								if (params.success !== undefined) {
									if (typeof params.success === "function") {
										params.success(json);
									} else if (a7.model.get("a7").router) {
										a7.router.open(params.success, json);
									} else {
										a7.events.publish(params.success, json);
									}
								}
							} else if (params.failure !== undefined) {
								// if logout failed
								if (typeof params.failure === "function") {
									params.failure(json);
								} else if (a7.model.get("a7").router) {
									a7.router.open(params.failure, json);
								} else {
									a7.events.publish(params.failure, json);
								}
							}

							if (params.callback !== undefined) {
								params.callback();
							}
						});
				},
				refresh: function (params) {
					// refresh keeps the client session alive
					a7.remote
						.fetch(_options.refreshURL, {}, true)
						// initial fetch needs to parse response
						.then(function (response) {
							if (response.status === 401) {
								return { isauthenticated: false };
							} else {
								return response.json();
							}
						})
						.then(function (json) {
							// then json is handled
							if (params.resolve !== undefined) {
								params.resolve(json);
							}
						})
						.catch(function (error) {
							if (params.reject) {
								params.reject(error);
							}
						});
				},
			};

			// add the auth module
			_setModule("auth", authModule);

			// add application modules
			Object.keys(modules).forEach(function (key) {
				_setModule(key, modules[key]);
			});
		},

		fetch: function (uri, params, secure) {
			a7.log.info("fetch: " + uri);
			var request, promise;

			//if secure and tokens, we need to check timeout and add Authorization header
			if (secure && _options.useTokens) {
				var currentTime = new Date(),
					diff = Math.abs(currentTime - _time),
					minutes = Math.floor(diff / 1000 / 60);

				if (minutes > _options.sessionTimeout) {
					// timeout
					a7.events.publish("auth.sessionTimeout");
					return;
				} else if (_token !== undefined && _token !== null) {
					// set Authorization: Bearer header
					if (params.headers === undefined) {
						if (_options.tokenType === "X-Token") {
							params.headers = {
								"X-Token": _token,
							};
						} else {
							params.headers = {
								Authorization: "Bearer " + a7.remote.getToken(),
							};
						}

						//							'Content-Type': 'application/json',
					} else {
						if (_options.tokenType === "X-Token") {
							params.headers["X-Token"] = _token;
						} else {
							params.headers["Authorization"] =
								`Bearer ${a7.remote.getToken()}`;
						}
					}
				}

				_time = currentTime;
			}
			request = new Request(uri, params);
			//calling the native JS fetch method ...
			promise = fetch(request);

			promise
				.then(function (response) {
					if (secure && _options.useTokens) {
						// according to https://www.rfc-editor.org/rfc/rfc6749#section-5.1
						// the access_token response key should be in the body. we're going to include it as a header for non-oauth implementations
						var token =
							_options.tokenType === "X-Token"
								? response.headers.get("X-Token")
								: response.headers.get("Access_token");
						if (token !== undefined && token !== null) {
							_setToken(token);

							if (_sessionTimer !== undefined) {
								clearTimeout(_sessionTimer);
							}
							_sessionTimer = setTimeout(
								_refreshClientSession,
								_options.sessionTimeout,
							);
						} else {
							a7.events.publish("auth.sessionTimeout");
						}
					}
				})
				.catch(function (error) {
					a7.log.error(error);
				});

			return promise;
		},

		invoke: function (moduleAction, params) {
			var mA = moduleAction.split(".");
			// if no action specified, return the list of actions
			if (mA.length < 2) {
				a7.log.error(
					"No action specified. Valid actions are: " +
						Object.keys(_modules[mA[0]]).toString(),
				);
				return;
			}
			if (typeof _modules[mA[0]][mA[1]] === "function") {
				//	_modules[ mA[ 0 ] ][ mA[ 1 ] ].apply( _modules[ mA[ 0 ] ][ mA[ 1 ] ].prototype, params );
				return _modules[mA[0]][mA[1]](params);
			}
		},
	};
})();

a7.router = (function () {
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
				regex: {},
			},
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
					regex: match[2] ? new RegExp("^" + match[2]) : REGEX_PARAM_DEFAULT,
					param: match[1],
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
					handler: handler,
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
				params: params,
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
						params: params,
					};
				} else {
					var _result = this._findOptim(
						remain.slice(match[0].length),
						child,
						params,
					);

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

	var _options,
		_router,
		_add = function (path, handler) {
			_router.add(path, handler);
		},
		_find = function (path) {
			return _router.find(path);
		},
		_open = function (path, params = {}) {
			let result = _find(path);
			let handler = result.handler;
			history.pushState(JSON.parse(JSON.stringify(params)), "", path);
			let combinedParams = Object.assign(params || {}, result.params || {});
			if (_options.useEvents && typeof handler === "string") {
				a7.events.publish(handler, combinedParams);
			} else {
				handler(combinedParams);
			}
		},
		_match = function (path, params = {}) {
			let result = _router.find(path);
			let combinedParams = Object.assign(params || {}, result.params || {});
			history.pushState(JSON.parse(JSON.stringify(params)), "", path);
			if (_options.useEvents) {
				a7.events.publish(result.handler, combinedParams);
			} else {
				result.handler(combinedParams);
			}
		};

	return {
		open: _open,
		add: _add,
		find: _find,
		match: _match,
		init: function (options, routes) {
			_router = new Router(routes);
			_options = options;
			_options.useEvents = _options.useEvents ? true : false;
			window.onpopstate = function (event) {
				//a7.log.trace( 'state: ' + JSON.stringify( event.state ) );
				_match(document.location.pathname + document.location.search);
			};
		},
	};
})();

a7.security = (function () {
	"use strict";

	let _userArgs = [],
		_useModel = false;

	var _isAuthenticated = async function (resolve, reject) {
			a7.log.info("Checking authenticated state.. ");
			let response = await new Promise((resolve, reject) => {
				a7.remote.invoke("auth.refresh", {
					resolve: resolve,
					reject: reject,
				});
			});

			if (response.authenticated) {
				_setUser(response.user);
			}
			resolve(response);
		},
		_invalidateSession = function () {
			clearTimeout(a7.remote.getSessionTimer());
			a7.remote.invalidateToken();
			var user = new a7.components.User(_userArgs);
			_setUser(user);
		},
		_setUser = function (user) {
			// if the app uses a model, set the user into the model
			if (_useModel) {
				a7.model.set("user", user);
			}
			sessionStorage.user = JSON.stringify(user);
		},
		_getUser = function () {
			// create a base user
			let suser, user;
			let mUser = _useModel ? a7.model.get("user") : null;
			if (typeof mUser !== "undefined" && mUser !== "" && mUser !== null) {
				user = mUser;
			} else if (sessionStorage.user && sessionStorage.user !== "") {
				suser = JSON.parse(sessionStorage.user);
				user = new a7.components.User(_userArgs);
				Object.keys(suser).map(function (key) {
					user[key] = suser[key];
				});
			}
			return user;
		};

	return {
		invalidateSession: _invalidateSession,
		isAuthenticated: _isAuthenticated,
		setUser: _setUser,
		getUser: _getUser,
		// initialization
		// 1. creates a new user object
		// 2. checks sessionStorage for user string
		// 3. populates User object with stored user information in case of
		// 	  browser refresh
		// 4. sets User object into a7.model

		init: function (theOptions) {
			a7.log.info("Security initializing...");
			let options = theOptions.security.options;
			let _useModel = theOptions.model.length > 0 ? true : false;
			// initialize and set the user
			_userArgs = options.userArgs ? options.userArgs : [];
			let user = _getUser(_userArgs);
			_setUser(user);
		},
	};
})();

a7.services = (function () {
	"use strict";

	const _services = new Map();

	return {
		init: function (options) {
			// init the services module
			// add services
			for (let service in options.services) {
				a7.services.register(service);
			}
		},

		getService: function (id) {
			return _services.get(id);
		},
		getAll: function () {
			return _services;
		},
		register: function (service) {
			_services.set(service.id, service);
		},
	};
})();

a7.ui = (function () {
	"use strict";

	// browser events that can be used in templating, e.g. data-click will be added to the resulting HTML as a click event handler
	const resourceEvents = ["cached", "error", "abort", "load", "beforeunload"];

	const networkEvents = ["online", "offline"];

	const focusEvents = ["focus", "blur"];

	const websocketEvents = ["open", "message", "error", "close"];

	const sessionHistoryEvents = ["pagehide", "pageshow", "popstate"];

	const cssAnimationEvents = [
		"animationstart",
		"animationend",
		"animationiteration",
	];

	const cssTransitionEvents = [
		"transitionstart",
		"transitioncancel",
		"transitionend",
		"transitionrun",
	];

	const formEvents = ["reset", "submit"];

	const printingEvents = ["beforeprint", "afterprint"];

	const textCompositionEvents = [
		"compositionstart",
		"compositionupdate",
		"compositionend",
	];

	const viewEvents = [
		"fullscreenchange",
		"fullscreenerror",
		"resize",
		"scroll",
	];

	const clipboardEvents = ["cut", "copy", "paste"];

	const keyboardEvents = ["keydown", "keypress", "keyup"];

	const mouseEvents = [
		"auxclick",
		"click",
		"contextmenu",
		"dblclick",
		"mousedown",
		"mousenter",
		"mouseleave",
		"mousemove",
		"mouseover",
		"mouseout",
		"mouseup",
		"pointerlockchange",
		"pointerlockerror",
		"wheel",
	];

	const dragEvents = [
		"drag",
		"dragend",
		"dragstart",
		"dragleave",
		"dragover",
		"drop",
	];

	const mediaEvents = [
		"audioprocess",
		"canplay",
		"canplaythrough",
		"complete",
		"durationchange",
		"emptied",
		"ended",
		"loadeddata",
		"loadedmetadata",
		"pause",
		"play",
		"playing",
		"ratechange",
		"seeked",
		"seeking",
		"stalled",
		"suspend",
		"timeupdate",
		"columechange",
		"waiting",
	];

	const progressEvents = [
		// duplicates from resource events
		/* 'abort',
	'error',
	'load', */
		"loadend",
		"loadstart",
		"progress",
		"timeout",
	];

	const storageEvents = ["change", "storage"];

	const updateEvents = [
		"checking",
		"downloading",
		/* 'error', */
		"noupdate",
		"obsolete",
		"updateready",
	];

	const valueChangeEvents = [
		"broadcast",
		"CheckBoxStateChange",
		"hashchange",
		"input",
		"RadioStateChange",
		"readystatechange",
		"ValueChange",
	];

	const uncategorizedEvents = [
		"invalid",
		"localized",
		/* 'message',
	'open', */
		"show",
	];

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
		.concat(uncategorizedEvents);

	let _events = [],
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
			_selectors[name] = selector;
			_nodes[name] = document.querySelector(selector);
		},
		_getSelector = function (name) {
			return _selectors[name];
		},
		// get an active view from the view struct
		_getView = function (id) {
			return _views[id];
		},
		_getNode = function (name) {
			return _nodes[name];
		},
		_setStateTransition = function (val) {
			_stateTransition = val;
			a7.log.trace("a7.ui.stateTransition: " + val);
		},
		_getStateTransition = function () {
			return _stateTransition;
		},
		// return the registered events for the application
		_getEvents = function () {
			return _events;
		},
		// register a view
		// this happens automatically when a view is instantiated
		_register = function (view) {
			switch (_options.renderer) {
				case "Handlebars":
				case "Mustache":
				case "templateLiterals":
					_views[view.props.id] = view;
					view.fireEvent("registered");
					break;
			}
		},
		// unregister the view
		_unregister = function (id) {
			delete _views[id];
		},
		// get the IDs for the tree of parent views to the root view of this tree
		_getParentViewIds = function (id) {
			a7.log.trace("Find parents of " + id);
			let parentIds = [];
			let view = _views[id];
			while (view.props.parentID !== undefined) {
				parentIds.unshift(view.props.parentID);
				view = _views[view.props.parentID];
			}
			return parentIds;
			// parentids returned in highest to lowest order
		},
		// get the tree of child IDs of a view
		_getChildViewIds = function (id) {
			a7.log.trace("Find children of " + id);
			let childIds = [];
			let view = _views[id];

			for (var child in view.children) {
				let childId = view.children[child].props.id;
				if (_getView(childId) !== undefined) {
					childIds.push(childId);
					childIds.concat(_getChildViewIds(childId));
				}
			}
			// returned in highest to lowest order
			return childIds;
		},
		// add a view to the render queue
		_enqueueForRender = function (id) {
			// if _stateTransition is true, the queue is being processed
			if (!_getStateTransition()) {
				a7.log.trace("enqueue: " + id);
				if (!_queue.length) {
					a7.log.trace("add first view to queue: " + id);
					_queue.push(id);
					_processRenderQueue();
				} else {
					let childIds = _getChildViewIds(id);
					if (_views[id].props.parentID === undefined) {
						// if the view is a root view, it should be pushed to the front of the stack
						a7.log.trace("add to front of queue: " + id);
						_queue.unshift(id);
					} else {
						let parentIds = _getParentViewIds(id);

						let highParent = undefined;
						if (parentIds.length) {
							highParent = parentIds.find(function (parentId) {
								return _queue.indexOf(parentId) >= 0;
							});
						}

						// only add if there is no parent in the queue, since parents will render children
						if (highParent === undefined) {
							a7.log.trace("add to end of queue: " + id);
							_queue.push(id);
						}
					}

					// remove child views from the queue, they will be rendered by the parents
					childIds.forEach(function (childId) {
						if (_queue.indexOf(childId) >= 0) {
							a7.log.trace("remove child from queue: " + childId);
							_queue.splice(_queue.indexOf(childId), 1);
						}
					});
				}
			} else {
				_deferred.push(id);
			}
		},
		// render the queue
		_processRenderQueue = function () {
			a7.log.trace("processing the queue");
			_setStateTransition(true);
			try {
				_queue.forEach(function (id) {
					_views[id].render();
				});
			} catch (err) {
				// log rendering errors
				a7.log.trace(err);
			}
			_queue = [];
			_setStateTransition(false);
			_deferred.forEach(function (id) {
				_enqueueForRender(id);
			});
			_deferred = [];
		},
		_removeView = function (id) {
			delete _views[id];
		};

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
			a7.log.trace("Layout initializing...");
			_options = a7.model.get("a7").ui;

			// set event groups to create listeners for
			var eventGroups = _options.eventGroups
				? _options.eventGroups
				: "standard";
			switch (eventGroups) {
				case "extended":
					// extended events not implemented yet
					reject("Extended events are not implemented yet.");
				case "standard":
					_events = _standardEvents;
					break;
				default:
					_options.eventGroups.forEach(function (group) {
						_events = _events.concat(group);
					});
			}

			resolve();
		},
	};
})();

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