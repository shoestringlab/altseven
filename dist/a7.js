function Constructor( constructor, args, addBindings ) {
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

export class Component {
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

export class DataProvider extends Component {
	#state = {};
	#schema;
	#relations = new Map(); // Track active relations and their criteria
	constructor(props) {
		super();
		this.binding = props?.binding;
		this.#state = props.state;
		this.#schema = props.schema;
		this.view = props.view;
		this.id = this.view.props.id + "-dataProvider";
		this.services = new Map();
		this.bindings = new Map(); // New map to store bindings
		this.serviceManager = null; // Injected by DataProviderManager
		this.log = null; // Injected by Service registration
	}

	set schema(obj) {
		// this doesn't actually do anthing, it's just here so the runtime doesn't complain about it being missing
	}
	get schema() {
		return this.#schema;
	}

	setServiceManager(serviceManager) {
		this.serviceManager = serviceManager;
	}

	setStateOnly(args) {
		// Defaults to the built-in behavior of the View
		this.#state = Object.assign(this.#state, args);
	}
	setState(args) {
		this.setStateOnly(args);
		this.fireEvent("stateChanged", args);
	}

	getState() {
		return Object.assign({}, this.#state);
	}

	/**
	 * Validate that a property is defined as an entityMap relation in the schema
	 * @private
	 */
	_validateRelationSchema(propertyName) {
		if (!this.#schema || !this.#schema[propertyName]) {
			throw new Error(
				`Property "${propertyName}" is not defined in DataProvider schema`,
			);
		}

		const schemaConfig = this.#schema[propertyName];
		if (schemaConfig.type !== "entityMap") {
			throw new Error(
				`Property "${propertyName}" is not of type "entityMap" (found: ${schemaConfig.type})`,
			);
		}

		if (!schemaConfig.service) {
			throw new Error(
				`Property "${propertyName}" does not specify a service in schema`,
			);
		}

		if (!schemaConfig.fetchMethod) {
			throw new Error(
				`Property "${propertyName}" does not specify a fetchMethod in schema`,
			);
		}

		return schemaConfig;
	}

	/**
	 * Execute the fetch operation for a relation
	 * @private
	 */
	async _executeFetch(propertyName, criteria, options = {}) {
		const schemaConfig = this._validateRelationSchema(propertyName);

		// Get the service
		if (!this.serviceManager) {
			throw new Error(
				"ServiceManager not set on DataProvider. Ensure DataProvider is registered with DataProviderManager.",
			);
		}

		const service = this.serviceManager.getService(schemaConfig.service);
		if (!service) {
			throw new Error(
				`Service "${schemaConfig.service}" not found for property "${propertyName}"`,
			);
		}

		if (this.log) {
			this.log.trace(
				`${this.id}: Fetching relation "${propertyName}" with criteria:`,
				criteria,
			);
		}

		// Call the fetchMethod to get entity IDs
		const response = await service.invoke(schemaConfig.fetchMethod, criteria, {
			merge: false, // Don't merge the ID list into cache
			checkCache: false, // Always fetch fresh IDs
		});

		// Handle different response formats
		let entityIds = [];
		if (Array.isArray(response)) {
			entityIds = response;
		} else if (response && typeof response === "object" && response.ids) {
			entityIds = response.ids;
		} else if (response && typeof response === "object" && response.data) {
			entityIds = response.data;
		} else {
			throw new Error(
				`fetchMethod "${schemaConfig.fetchMethod}" returned unexpected format. Expected array or {ids: [...]}`,
			);
		}

		if (!Array.isArray(entityIds)) {
			throw new Error(
				`fetchMethod "${schemaConfig.fetchMethod}" did not return an array of IDs`,
			);
		}

		if (this.log) {
			this.log.debug(
				`${this.id}: Fetched ${entityIds.length} IDs for relation "${propertyName}"`,
			);
		}

		// If no IDs, return empty Map
		if (entityIds.length === 0) {
			return new Map();
		}

		// Use service.readMany to fetch and cache the entities
		const entitiesMap = await service.readMany(entityIds);

		if (this.log) {
			this.log.debug(
				`${this.id}: Loaded ${entitiesMap.size} entities for relation "${propertyName}"`,
			);
		}

		return entitiesMap;
	}

	/**
	 * Load a relation defined in the schema
	 * @param {string} propertyName - The property name in the schema
	 * @param {object} criteria - Criteria for fetching (e.g., { userId: 123, limit: 10, offset: 0 })
	 * @param {object} options - Options: { merge: true, returnData: false }
	 * @returns {Promise<Map|void>} Returns Map if returnData is true
	 */
	async loadRelation(propertyName, criteria = {}, options = {}) {
		const opts = {
			merge: options.merge !== false, // Default true
			returnData: options.returnData || false,
		};

		const schemaConfig = this._validateRelationSchema(propertyName);

		// Merge with default criteria from schema
		const finalCriteria = Object.assign(
			{},
			schemaConfig.defaultCriteria || {},
			criteria,
		);

		// Execute the fetch
		const entitiesMap = await this._executeFetch(
			propertyName,
			finalCriteria,
			opts,
		);

		// Store criteria for future refresh calls
		this.#relations.set(propertyName, {
			criteria: finalCriteria,
			config: schemaConfig,
		});

		// Update state
		if (opts.merge && this.#state[propertyName] instanceof Map) {
			// Merge with existing Map
			const currentMap = this.#state[propertyName];
			entitiesMap.forEach((value, key) => {
				currentMap.set(key, value);
			});
			this.setState({ [propertyName]: currentMap });
		} else {
			// Replace entirely
			this.setState({ [propertyName]: entitiesMap });
		}

		this.fireEvent("relationLoaded", {
			propertyName,
			criteria: finalCriteria,
			count: entitiesMap.size,
		});

		if (opts.returnData) {
			return entitiesMap;
		}
	}

	/**
	 * Refresh a previously loaded relation with new criteria
	 * @param {string} propertyName - The property name in the schema
	 * @param {object} criteria - New criteria to merge or replace
	 * @param {object} options - Options: { merge: true, reload: false, returnData: false }
	 * @returns {Promise<Map|void>} Returns Map if returnData is true
	 */
	async refresh(propertyName, criteria = {}, options = {}) {
		const opts = {
			merge: options.merge !== false, // Default true
			reload: options.reload || false, // Default false
			returnData: options.returnData || false,
		};

		// Check if relation was previously loaded
		const relationState = this.#relations.get(propertyName);
		if (!relationState && !opts.reload) {
			throw new Error(
				`Relation "${propertyName}" has not been loaded yet. Use loadRelation() first or pass { reload: true }.`,
			);
		}

		// Determine final criteria
		let finalCriteria;
		if (opts.reload || !relationState) {
			// Reload mode: use only new criteria + defaults
			const schemaConfig = this._validateRelationSchema(propertyName);
			finalCriteria = Object.assign(
				{},
				schemaConfig.defaultCriteria || {},
				criteria,
			);
		} else {
			// Normal refresh: merge with stored criteria
			finalCriteria = Object.assign({}, relationState.criteria, criteria);
		}

		// Execute the fetch
		const entitiesMap = await this._executeFetch(
			propertyName,
			finalCriteria,
			opts,
		);

		// Update stored criteria
		const schemaConfig = this._validateRelationSchema(propertyName);
		this.#relations.set(propertyName, {
			criteria: finalCriteria,
			config: schemaConfig,
		});

		// Update state
		if (opts.merge && this.#state[propertyName] instanceof Map) {
			// Merge with existing Map
			const currentMap = this.#state[propertyName];
			entitiesMap.forEach((value, key) => {
				currentMap.set(key, value);
			});
			this.setState({ [propertyName]: currentMap });
		} else {
			// Replace entirely
			this.setState({ [propertyName]: entitiesMap });
		}

		this.fireEvent("relationRefreshed", {
			propertyName,
			criteria: finalCriteria,
			count: entitiesMap.size,
		});

		if (opts.returnData) {
			return entitiesMap;
		}
	}

	/**
	 * Clear a relation's data and stored criteria
	 * @param {string} propertyName - The property name in the schema
	 */
	clearRelation(propertyName) {
		this.#relations.delete(propertyName);
		this.setState({ [propertyName]: new Map() });
		this.fireEvent("relationCleared", { propertyName });
	}

	/**
	 * Get stored criteria for a relation
	 * @param {string} propertyName - The property name in the schema
	 * @returns {object|null} The stored criteria or null if not loaded
	 */
	getRelationCriteria(propertyName) {
		const relationState = this.#relations.get(propertyName);
		return relationState ? { ...relationState.criteria } : null;
	}
}

export class Entity extends Component {
	static schema = null;

	_data; // Protected field (using _ convention)

	constructor(props) {
		super();
		this._data = {};

		if (this.constructor.schema) {
			// Validate required fields in props
			for (const [key, descriptor] of Object.entries(this.constructor.schema)) {
				if (
					descriptor.required &&
					!(key in props) &&
					props[key] === undefined
				) {
					throw new Error(`Missing required field: ${key}`);
				}
			}

			// Define properties
			for (const [key, descriptor] of Object.entries(this.constructor.schema)) {
				this._defineProperty(key);
			}

			// Set properties
			for (const [key, descriptor] of Object.entries(this.constructor.schema)) {
				if (key in props && props[key] !== undefined) {
					this[key] = props[key]; // Setter will validate and convert
				}
			}

			// Validate after properties are set
			this.validate();
		}

		const idField = Object.keys(this.constructor.schema).find(
			(key) => this.constructor.schema[key].id === true,
		);
		if (idField && !Object.prototype.hasOwnProperty.call(this, "id")) {
			Object.defineProperty(this, "id", {
				get: function () {
					return this[idField];
				},
			});
		}
	}

	get schema() {
		return this.constructor.schema;
	}

	// Protected method to get data
	_getData(key) {
		const propertyName = `_${key}`;
		return this._data[propertyName];
	}

	// Protected method to set data with validation
	_setData(key, value) {
		const schemaDescriptor = this.constructor.schema[key];
		const propertyName = `_${key}`;
		let valueType = typeof value;

		// Validate required
		if (schemaDescriptor.required && value === undefined) {
			throw new Error(`Property ${key} is required.`);
		}

		// Convert string to Date for date type
		if (schemaDescriptor.type === "date" && typeof value === "string") {
			const parsedDate = new Date(value);
			if (!isNaN(parsedDate)) {
				value = parsedDate;
				valueType = "object";
			} else {
				throw new Error(`Invalid date string for property ${key}: ${value}`);
			}
		}

		// Convert 1 or 0 to boolean for boolean type
		if (schemaDescriptor.type === "boolean" && typeof value === "number") {
			if (value === 1 || value === 0) {
				value = value === 1; // Cast 1 to true, 0 to false
				valueType = "boolean";
			}
		}

		// Handle entityClass instantiation
		if (
			schemaDescriptor.type === "object" &&
			schemaDescriptor.entityClass &&
			value !== null &&
			value !== undefined
		) {
			if (!(value instanceof schemaDescriptor.entityClass)) {
				value = new schemaDescriptor.entityClass(value);
			}
		}

		// Validate type
		if (
			!this._isOfType(value, schemaDescriptor.type, schemaDescriptor) &&
			value !== null &&
			typeof value !== "undefined"
		) {
			throw new Error(
				`Invalid type for property ${key}. Expected ${schemaDescriptor.type}, but got ${valueType}.`,
			);
		}

		this._data[propertyName] = value;
	}

	_defineProperty(key) {
		const propertyName = `_${key}`;
		this._data[propertyName] = undefined;

		const descriptor = Object.getOwnPropertyDescriptor(
			this.constructor.prototype,
			key,
		);

		if (descriptor && (descriptor.get || descriptor.set)) {
			// Use custom getter/setter from subclass
			const originalGet = descriptor.get;
			const originalSet = descriptor.set;

			Object.defineProperty(this, key, {
				get: originalGet
					? function () {
							return originalGet.call(this);
						}
					: function () {
							return this._getData(key);
						},
				set: originalSet
					? function (value) {
							originalSet.call(this, value);
						}
					: function (value) {
							this._setData(key, value);
						},
			});
		} else {
			// Define default getter/setter
			if (!Object.prototype.hasOwnProperty.call(this, key)) {
				Object.defineProperty(this, key, {
					get: function () {
						return this._getData(key);
					},
					set: function (value) {
						this._setData(key, value);
					},
				});
			}
		}
	}

	_isOfType(value, expectedType, schemaDescriptor) {
		switch (expectedType) {
			case "date":
				return value instanceof Date && !isNaN(value);
			case "array":
				return Array.isArray(value);
			case "boolean":
				return typeof value === "boolean";
			case "integer":
				return Number.isInteger(value);
			case "float":
				return typeof value === "number" && !Number.isInteger(value);
			case "string":
				return typeof value === "string";
			case "object":
				if (schemaDescriptor?.entityClass) {
					return value instanceof schemaDescriptor.entityClass;
				}
				return typeof value === "object" && value !== null;
			default:
				return true;
		}
	}

	validate() {
		for (let field in this.constructor.schema) {
			const propertyName = `_${field}`;
			if (
				this.constructor.schema[field].required &&
				this._data[propertyName] === undefined
			) {
				throw new Error(`Field ${field} is required`);
			}
			if (
				this.constructor.schema[field].type &&
				this._data[propertyName] !== undefined &&
				this._data[propertyName] !== null &&
				!this._isOfType(
					this._data[propertyName],
					this.constructor.schema[field].type,
					this.constructor.schema[field],
				)
			) {
				throw new Error(
					`Field ${field} must be of type ${this.constructor.schema[field].type}`,
				);
			}
		}
		return true;
	}

	toFlatObject() {
		const flatObject = {};
		for (const [key, value] of Object.entries(this._data)) {
			flatObject[key.replace(/^_/, "")] =
				value instanceof Entity ? value.toFlatObject() : value;
		}
		return flatObject;
	}

	fromFlatObject(obj) {
		if (!obj || typeof obj !== "object") {
			throw new Error("Invalid input: expected an object");
		}

		for (const [key, value] of Object.entries(obj)) {
			if (this.constructor.schema && this.constructor.schema[key]) {
				this[key] = value; // Use setter for validation
			}
		}

		return this;
	}
}

export const Model = (() => {
	"use strict";

	const modelStore = new Map();
	const mementoStore = new Map();
	let maxMementos = 20; // Default value
	let _log;

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
			_log.trace(`change : Source: ${event.originalSource}`);

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
					return value;
				//return JSON.parse(JSON.stringify(value));
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

		init(options = {}, log) {
			maxMementos = options.maxMementos ?? 20;
			_log = log;
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
				_log.error("Expected parameter [name] is not defined.");
				return undefined;
			}

			const [base, prop] = name.split(".");
			const model = modelStore.get(base);

			if (!model) {
				_log.trace(`Key '${base}' does not exist in the model.`);
				return undefined;
			}
			if (!key) {
				const value = prop ? model.data[prop] : model.data;
				return value instanceof Map ? new Map(value) : value;
			} else {
				if (model.data instanceof Map) {
					if (!model.data.has(key)) {
						_log.trace(`Key '${key}' does not exist in the Map .`);
					} else {
						return model.data.get(key);
					}
				}
			}
		},

		set(name, value) {
			if (!name) {
				_log.error("Expected parameter [name] is not defined.");
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

export class Service extends Component {
	constructor(props) {
		super();
		this.id = props.id; // id of the service to register with the framework
		this.key = props.key; // name of the Object key
		this.remoteMethods = props.remoteMethods;
		this.entityClass = props.entityClass; // Entity class to use for data operations
		this.dataProviders = new Map();
		this.bindings = new Map(); // New map to store bindings
		this.log;
		this.model;
		this.remote;
		// Queue initialization
		this.queue = new Map();

		// Get ID fields from entity schema
		this.idFields = this.getEntityIdFields();

		//this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		this.set(new Map());
		// let dataMap = this.get();
		// if (!dataMap || !(dataMap instanceof Map)) {
		// 	this.set(new Map());
		// }
	}

	getEntityIdFields() {
		// Check if entityClass has a static schema property with id fields
		if (this.entityClass && typeof this.entityClass.schema === "object") {
			const idFields = [];
			for (const [fieldName, fieldConfig] of Object.entries(
				this.entityClass.schema,
			)) {
				if (fieldConfig.id === true) {
					idFields.push(fieldName);
				}
			}
			return idFields;
		}
		// Fallback to the original key if no schema is found
		return [this.key];
	}

	setLog(logger) {
		this.log = logger;
	}

	setModel(_model) {
		this.model = _model;
	}

	setRemote(remote) {
		this.remote = remote;
	}

	registerDataProvider(dp) {
		// Register the new data provider
		this.dataProviders.set(dp.id, dp);
		dp.log = this.log;
	}

	convertArrayToMap(dataArray) {
		this.log.trace(this.id + ": method: convertArrayToMap");
		let dataMap = new Map();
		dataArray.forEach((item) => {
			const key = this.getCompositeKey(item);
			if (key) {
				dataMap.set(key, item);
			}
		});
		return dataMap;
	}

	convertMapToArray(dataMap) {
		return Array.from(dataMap.values());
	}

	// Compare itemIDs against cached items
	compareIDs(IDs) {
		this.log.trace(this.id + ": method: compareIDs");
		this.log.debug(this.id + ":compareIDs: " + IDs);

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
		this.log.debug(
			this.id +
				":results: " +
				JSON.stringify(present) +
				" " +
				JSON.stringify(missing),
		);

		return { present, missing };
	}

	// Merge new items into the existing Map
	async merge(newItems) {
		this.log.trace(this.id + ": method: merge");
		let dataMap = this.get();

		if (!(dataMap instanceof Map)) {
			dataMap = new Map();
		}

		const formattedItems = [];
		let hasCreates = false;
		let hasUpdates = false;

		await Promise.all(
			newItems.map(async (item) => {
				const key = this.getCompositeKey(item);
				if (key) {
					const exists = dataMap.has(key);
					const action = exists ? "update" : "create";

					if (action === "create") hasCreates = true;
					if (action === "update") hasUpdates = true;

					const formattedItem = await this.format(item);
					dataMap.set(key, formattedItem);
					formattedItems.push({ key, entity: formattedItem, action });
				}
			}),
		);

		this.set(dataMap);

		// Fire generic cache changed event with appropriate action
		// If mixed, use "update" as it's the most common case
		const globalAction = hasCreates && hasUpdates ? "update" : hasCreates ? "create" : "update";
		this.fireEvent("cacheChanged", { action: globalAction });

		// Fire entity-specific events for each merged item with individual actions
		formattedItems.forEach(({ key, entity, action }) => {
			this.fireEvent("entityChanged", {
				id: key,
				entity: entity,
				action: action,
			});
		});

		return dataMap;
	}

	getCompositeKey(item) {
		if (!item || typeof item !== "object") {
			return null;
		}

		if (this.idFields.length === 0) {
			// Fallback to original behavior if no ID fields defined
			return item[this.key] || null;
		}

		if (this.idFields.length === 1) {
			// Single ID field
			return item[this.idFields[0]] || null;
		}

		// Multiple ID fields - combine them
		const keyParts = this.idFields
			.map((field) => item[field])
			.filter((part) => part !== undefined && part !== null);
		return keyParts.length > 0 ? keyParts.join("|") : null;
	}

	bind(key, filter) {
		this.bindings.set(key, { filter: filter });
	}

	async create(obj) {
		// if obj is a plain object, create a new entity
		this.log.trace(this.id + ": method: create");
		let entityInstance =
			obj instanceof this.entityClass ? obj : await this.format(obj);

		const response = await this.remote.invoke(
			this.remoteMethods.create,
			entityInstance,
		);
		const json = await response.json();
		entityInstance.fromFlatObject(json);
		this.cacheSet(entityInstance, "create");
		return entityInstance;
	}

	async read(obj) {
		this.log.trace(this.id + ": method: read");
		let dataMap = this.get();
		let compositeKey = "-";
		const requestKey = `${this.remoteMethods.read}-${JSON.stringify(obj)}`;

		if (this.queue.has(requestKey)) {
			this.log.debug(
				this.id +
					":Duplicate read request detected, waiting for existing request. " +
					JSON.stringify(obj),
			);
			// Return a promise that resolves when the existing request completes
			return await this.queue.get(requestKey);
		} else {
			this.log.debug(this.id + ": New read request. " + JSON.stringify(obj));
			// Create a new promise for this request
			const requestPromise = new Promise(async (resolve, reject) => {
				try {
					// Get the composite key for the object
					compositeKey = this.getCompositeKey(obj);
					if (!dataMap.has(compositeKey)) {
						let entityInstance =
							obj instanceof this.entityClass ? obj : await this.format(obj);

						const response = await this.remote.invoke(
							this.remoteMethods.read,
							entityInstance,
						);
						const json = await response.json();
						// set the entity instance from the json response
						entityInstance.fromFlatObject(json);
						this.cacheSet(await this.format(entityInstance));
					}
					resolve(this.get(compositeKey));
				} catch (error) {
					this.log.debug(this.id + ": Error reading object. " + error);
					reject(error);
				} finally {
					// Always remove from queue when done
					this.queue.delete(requestKey);
				}
			});

			// Add the promise to the queue
			this.queue.set(requestKey, requestPromise);
			this.log.debug(this.id + ": read request added to the queue.");
			// Return the promise so callers can await it
			return await requestPromise;
		}
	}

	async update(obj) {
		this.log.trace(this.id + ": method: update");
		let entityInstance =
			obj instanceof this.entityClass ? obj : await this.format(obj);

		const response = await this.remote.invoke(
			this.remoteMethods.update,
			entityInstance,
		);
		const json = await response.json();
		entityInstance.fromFlatObject(json);
		this.cacheSet(entityInstance, "update");
		return entityInstance;
	}

	async delete(obj) {
		this.log.trace(this.id + ": method: delete");
		let returnVal = {};
		let entityInstance =
			obj instanceof this.entityClass ? obj : await this.format(obj);

		const response = await this.remote.invoke(
			this.remoteMethods.delete,
			entityInstance,
		);
		const json = await response.json();
		// nothing to do here
		returnVal = json;

		const compositeKey = this.getCompositeKey(entityInstance);
		this.cacheDelete(compositeKey);
		return returnVal; // return the response from the remote call
	}

	async readAll(obj = {}) {
		this.log.trace(this.id + ": method: readAll");
		const requestKey = `${this.remoteMethods.readAll}-${JSON.stringify(obj)}`;
		if (this.queue.has(requestKey)) {
			this.log.debug(
				this.id +
					":Duplicate readAll request detected, waiting for existing request.",
			);
			// Return a promise that resolves when the existing request completes
			return await this.queue.get(requestKey);
		} else {
			this.log.debug(this.id + ":Creating new readAll request.");
			// Create a new promise for this request
			const requestPromise = new Promise(async (resolve, reject) => {
				try {
					let dataMap = this.get();
					if (!dataMap.size) {
						const response = await this.remote.invoke(
							this.remoteMethods.readAll,
							obj,
						);
						const json = await response.json();
						await this.merge(json);
					}
					resolve(this.get());
				} catch (error) {
					reject(error);
				} finally {
					// Always remove from queue when done
					this.queue.delete(requestKey);
				}
			});

			// Add the promise to the queue
			this.queue.set(requestKey, requestPromise);
			this.log.debug(this.id + ":readAll completed for " + obj.id);
			// Return the promise so callers can await it
			return await requestPromise;
		}
	}

	// Add a method to call custom remote methods
	async invoke(
		methodName,
		params,
		options = {
			merge: true,
			checkCache: true,
			filter: {},
			returnType: "Map",
		},
	) {
		// if (returnType === "Array") {
		// 	return data.map(item => new this.entityClass(item));
		// } else if (returnType === "Map") {
		// 	return new Map(data.map(item => [this.getCompositeKey(item), new this.entityClass(item)]));
		// } else {
		// 	throw new Error(`Unsupported returnType: ${returnType}`);
		// }
		//}
		this.log.trace(this.id + ": method: invoke");
		const methodConfig = this.remoteMethods[methodName];
		if (!methodConfig) {
			throw new Error(`Method ${methodName} not found in remoteMethods`);
		}

		if (options?.checkCache) {
			let item, map;
			let dataMap = this.get();

			let data =
				typeof options.filter === "undefined" ||
				(typeof options.filter !== "undefined" &&
					Object.keys(options.filter).length === 0)
					? dataMap
					: this.filter(dataMap, options.filter);
			if (data.length > 0) {
				this.log.debug(this.id + ": Cache hit for method", methodName);
				return await this.formatData(data, options.returnType);
			}
		}

		const requestKey = `${this.remoteMethods.invoke}-${methodName}-${JSON.stringify(params)}`;
		if (this.queue.has(requestKey)) {
			this.log.debug(
				this.id +
					":Duplicate invoke request detected, waiting for existing request.",
			);
			// Return a promise that resolves when the existing request completes
			return await this.queue.get(requestKey);
		} else {
			this.log.debug(this.id + ": New invoke: " + methodName);
			// Create a new promise for this request
			const requestPromise = new Promise(async (resolve, reject) => {
				try {
					// Call the remote method
					const response = await this.remote.invoke(methodConfig, params);

					// Parse the JSON response
					const json = await response.json();

					// Check if we should merge the results into cache
					if (options.merge) {
						// If it's an array of objects, treat them as entities and merge
						if (Array.isArray(json) && json.length > 0) {
							await this.merge(json);
						} else if (typeof json === "object" && json !== null) {
							await this.merge([json]);
						}
						resolve(await this.formatData(json, options.returnType));
					}

					resolve(json);
				} catch (error) {
					reject(error);
				} finally {
					// Always remove from queue when done
					this.queue.delete(requestKey);
				}
			});

			// Add the promise to the queue
			this.queue.set(requestKey, requestPromise);
			this.log.debug(this.id + ": Completed invoke: " + methodName);
			// Return the promise so callers can await it
			return await requestPromise;
		}
	}

	async format(obj) {
		this.log.trace(this.id + ": method: format");
		return new this.entityClass(obj);
	}

	async formatData(data, returnType) {
		this.log.trace(this.id + ": method: formatData");
		let map = new Map(),
			array = [];

		if (typeof data === "object" && !Array.isArray(data) && data !== null) {
			return await this.format(data);
		}
		if (returnType === "object" && data.length === 1) {
			let item = data[0];
			return item instanceof this.entityClass ? item : await this.format(item);
		}

		await Promise.all(
			data.map(async (item, index) => {
				// Transform the item and update the original array or create a new one
				data[index] =
					item instanceof this.entityClass ? item : await this.format(item);

				if (returnType === "Map") {
					map.set(data[index].id, data[index]);
				}
				if (returnType === "Array") {
					array.push(data[index]);
				}
			}),
		);

		if (returnType === "Map") {
			return map;
		} else if (returnType === "Array") {
			return array;
		}
	}

	cacheDelete(id) {
		this.log.trace(this.id + ": method: cacheDelete");
		let dataMap = this.get();
		dataMap.delete(id);
		this.set(dataMap);

		// Notify bound DataProviders - generic event
		this.fireEvent("cacheChanged", { action: "delete" });

		// Fire entity-specific event for this deletion
		this.fireEvent("entityDeleted", {
			id: id,
			action: "delete",
		});
	}

	cacheSet(item, action = "update") {
		this.log.trace(this.id + ": method: cacheSet");
		if (item instanceof this.entityClass) {
			const compositeKey = this.getCompositeKey(item);
			if (!compositeKey) {
				throw new Error("Cannot cache item: no valid ID fields found");
			}
			let dataMap = this.get();

			// Check if entity already exists to auto-detect action if not specified
			const exists = dataMap.has(compositeKey);
			if (action === "update" && !exists) {
				action = "create";
			}

			dataMap.set(compositeKey, item);
			this.set(dataMap);

			// Notify bound DataProviders - generic event with specific action
			this.fireEvent("cacheChanged", {
				action: action,
				item: item,
			});

			// Fire entity-specific event for this item
			this.fireEvent("entityChanged", {
				id: compositeKey,
				entity: item,
				action: action,
			});
		} else {
			throw "Item must be of proper entity type.";
		}
	}

	set(dataMap) {
		this.log.trace(this.id + ": method: set");
		this.model.set(this.id, dataMap);
	}

	get(ID) {
		this.log.trace(this.id + ": method: get");
		if (typeof ID === "undefined") {
			return this.model.get(this.id);
		} else {
			return this.model.get(this.id, ID);
		}
	}

	async readMany(IDs) {
		this.log.trace(this.id + ": method: readMany");
		if (typeof IDs === "undefined") {
			return new Map();
		}

		// Get cached items
		//const itemsMap = this.get();
		const requestKey = `${this.remoteMethods.readMany}-${JSON.stringify(IDs)}`;
		if (this.queue.has(requestKey)) {
			this.log.debug(
				this.id +
					":Duplicate readMany request detected, waiting for existing request." +
					IDs,
			);
			// Return a promise that resolves when the existing request completes
			return await this.queue.get(requestKey);
		} else {
			this.log.debug(this.id + ": New readMany: " + IDs);
			// Create a new promise for this request
			const requestPromise = new Promise(async (resolve, reject) => {
				try {
					// Compare requested IDs with cache
					const { present, missing } = this.compareIDs(IDs);

					// Fetch missing items if any
					this.log.debug(this.id + ": Present? " + present.length);
					this.log.debug(this.id + ": Missing? " + missing.length);
					if (missing.length > 0) {
						let obj = { id: missing };

						const response = await this.remote.invoke(
							this.remoteMethods.readMany,
							obj,
						);
						const json = await response.json();

						if (Array.isArray(json)) {
							await this.merge(json);
						}
					}

					resolve(this.getMappedItems(IDs));
				} catch (error) {
					reject(error);
				} finally {
					// Always remove from queue when done
					this.queue.delete(requestKey);
				}
			});

			// Add the promise to the queue
			this.queue.set(requestKey, requestPromise);
			this.log.debug(this.id + ": Completed readMany: " + IDs);
			// Return the promise so callers can await it
			return await requestPromise;
		}
	}

	getMappedItems(IDs) {
		this.log.trace(this.id + ": method: getMappedItems");
		// Return all requested items in order, filtering out nulls
		const result = IDs.map((id) => {
			const item = this.get(id);
			return item || null; // Return null for items that couldn't be found
		});
		return result.filter((item) => item !== null);
	}

	sort(items, sortFields) {
		this.log.trace(this.id + ": method: sort");
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
		this.log.trace(this.id + ": method: filter");
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
			// For each item, check if it satisfies ALL criteria
			for (let field of Object.keys(criteria)) {
				const criterion = criteria[field];

				// Get the value from the item for this field
				let valueA = item[field];

				if (Array.isArray(criterion) && criterion.length === 3) {
					// Handle specific operator, value, and regex flag
					const [operator, value, useRegex] = criterion;
					let valueB = typeof value === "function" ? value() : value;

					if (useRegex && typeof valueB === "string") {
						// Use regex for string matching
						const regex = new RegExp(valueB);
						if (
							!compareValues(valueA.toString(), regex.test(valueA), operator)
						) {
							return false; // If any criterion fails, item is filtered out
						}
					} else {
						// Use normal comparison
						if (!compareValues(valueA, valueB, operator)) {
							return false; // If any criterion fails, item is filtered out
						}
					}
				} else if (Array.isArray(criterion) && criterion.length === 2) {
					const operator = criterion[0];
					const value =
						typeof criterion[1] === "function" ? criterion[1]() : criterion[1];

					// Handle range match or simple equality/inequality check
					if (typeof value === "object" && Array.isArray(value)) {
						if (!isWithinRange(valueA, value)) {
							return false; // If any criterion fails, item is filtered out
						}
					} else {
						// Simple equality/inequality check
						if (!compareValues(valueA, value, operator)) {
							return false; // If any criterion fails, item is filtered out
						}
					}
				} else {
					// Simple direct value comparison - treat as equality
					if (!compareValues(valueA, criterion, "=")) {
						return false; // If any criterion fails, item is filtered out
					}
				}
			}

			// If we get here, all criteria have been satisfied
			return true;
		});

		return filteredItems;
	}
}

export class User extends Component {
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

export class View extends Component {
	constructor(props) {
		super();
		this.type = "View";
		this.timeout = 600000;
		this.renderer = "templateLiterals";
		this.debounceTime = 18;
		this.timer;
		this.element; // HTML element the view renders into
		this.props = props;
		this.log;
		this.model;
		this.ui;
		this.isTransient = props.isTransient || false;
		this.state = {};
		this.skipRender = false;
		this.children = {}; // Child views
		this.components = {}; // Register objects external to the framework so we can address them later
		this.templateCache = null;
		this.fireEvent("mustRegister");
	}

	setLog(logger) {
		this.log = logger;
	}

	setModel(_model) {
		this.model = _model;
	}

	setUI(_ui) {
		this.ui = _ui;
	}
	// set these values on registration
	setRenderer(renderer) {
		this.renderer = renderer;
	}
	setTimeout(timeout) {
		this.timeout = timeout;
	}
	setDebounce(debounce) {
		this.debounce = debounce;
	}
	setDebounceTime(debounceTime) {
		this.debounceTime = debounceTime;
	}

	config() {
		this.on(
			"mustRender",
			this.debounce(
				function () {
					this.log.trace("mustRender: " + this.props.id);
					if (this.shouldRender()) {
						this.ui.enqueueForRender(this.props.id);
					} else {
						this.log.trace("Render cancelled: " + this.props.id);
						this.skipRender = false;
					}
				}.bind(this),
				this.debounceTime,
			),
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
						this.timeout,
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
				this.ui.unregister(this.props.id);
			}.bind(this),
		);
	}

	setState(args) {
		// blank the template cache so the view re-renders
		this.templateCache = null;
		if (this.dataProvider) {
			this.dataProvider.setState(args);
			this.log.debug("setState using dataProvider for ", this.props.id);
		} else {
			this.log.debug("setState for ", this.props.id);
			this.state = Object.assign(this.state, args);
			// if there is no dataProvider, fire stateChanged here, otherwise wait for the dataProvider (see registerDataProvider())
			this.fireEvent("stateChanged", args);
		}

		this.fireEvent("mustRender");
	}

	getState() {
		if (this.dataProvider) {
			return this.dataProvider.getState();
		} else {
			return Object.assign(this.state);
		}
	}

	registerDataProvider(dp) {
		this.dataProvider = dp;
		// listen for the dataProvider to fire its stateChanged event, then fire
		this.dataProvider.on("stateChanged", (dataProvider, args) => {
			this.fireEvent("stateChanged", args);
		});
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
		return this.props.parentID
			? this.ui.getView(this.props.parentID)
			: undefined;
	}

	render() {
		this.log.trace("render: " + this.props.id);
		if (this.element === undefined || this.element === null) {
			this.element = document.querySelector(this.props.selector);
		}
		if (!this.element) {
			this.log.trace(
				"The DOM element for view " +
					this.props.id +
					" was not found. The view will be removed and unregistered.",
			);
			if (this.props.parentID !== undefined) {
				this.ui.getView(this.props.parentID).removeChild(this);
			}
			this.fireEvent("mustUnregister");
			return;
		}

		let content = "";
		if (this.templateCache !== null && this.ui.options.ui.cacheTemplates) {
			content = this.templateCache;
			this.log.debug("Using cached template for view " + this.props.id);
		} else {
			this.log.debug("Rendering template for view " + this.props.id);
			content =
				typeof this.template == "function" ? this.template() : this.template;
			this.templateCache = content;
		}
		this.element.innerHTML = content;
		var eventArr = [];
		this.ui.getEvents().forEach(function (eve) {
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
			this.model.bind(ele.attributes["data-bind"].value, ele);
		});
		this.log.trace("Rendered: " + this.props.id);
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
			this.ui.unregister(this.id);
		} else {
			if (this.isTransient) {
				this.timer = setTimeout(
					this.checkRenderStatus.bind(this),
					this.timeout,
				);
			}
		}
	}
}

//
class Console extends Component {
	constructor(app) {
		super();
		this.title = "Console Window";
		this.consoleDiv = null;
		this.active = false;
		this.app = app;
		this.resolve = resolve;
		this.reject = reject;
		this.options = this.app.options.console;

		// if (this.options.container === "") {
		// 	this.reject(
		// 		"You must specify a container object for the console display.",
		// 	);
		// 	return;
		// }

		if (this.options.enabled) {
			this.active = true;
			this.consoleDiv = document.createElement("div");
			this.consoleDiv.setAttribute("id", "a7consoleDiv");
			this.consoleDiv.setAttribute("class", "a7-console");
			document.body.appendChild(this.consoleDiv);

			var fp = new this.options.container(this.consoleDiv, {
				width: this.options.width,
				left: this.options.left,
				height: this.options.height,
				title: this.title,
				top: this.options.top,
				enableShrink: true,
				enableClose: true,
			});
			if (fp.element) fp.element.setAttribute("right", 0);

			if (this.options.wsServer) {
				var connection = a7.remote.webSocket(
					this.options.wsServer,
					this.handleMessage.bind(this),
				);
			}

			a7.console.addMessage = this.addMessage.bind(this);
			a7.log.info("Console initializing...");
			this.resolve();
		} else {
			this.reject(
				"Console init should not be called when console option is set to false.",
			);
		}
	}

	addMessage(message, dt, source, level) {
		var div = document.createElement("div");
		div.setAttribute("class", "a7-console-row-" + source);
		if (level !== undefined) {
			div.innerHTML = level + ": ";
			div.setAttribute(
				"class",
				div.getAttribute("class") + " a7-console-row-" + level,
			);
		}
		div.innerHTML +=
			+(dt.getHours() < 10 ? "0" + dt.getHours() : dt.getHours()) +
			":" +
			(dt.getMinutes() < 10 ? "0" + dt.getMinutes() : dt.getMinutes()) +
			": " +
			message;
		this.consoleDiv.appendChild(div);
	}

	handleMessage(message, json) {
		var ix = 0;
		if (json.type === "history") {
			for (ix = 0; ix < json.data.length; ix++) {
				this.addMessage(
					json.data[ix].text,
					new Date(json.data[ix].time),
					"websocket",
				);
			}
		} else if (json.type === "message") {
			this.addMessage(json.data.text, new Date(json.data.time), "websocket");
		} else {
			a7.log.error("This doesn't look like valid JSON: ", json);
		}
	}
}

// Usage example:
// const consoleOptions = { ... }; // Define your options here
// new Console(consoleOptions, resolveFunction, rejectFunction);

class DataProviderManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.services = this.app.services.getAll();
		this._dataproviders = new Map();
		app.log.info("DataProviderManager initialized...");
	}

	getDataProvider(id) {
		return this._dataproviders.get(id);
	}

	getAll() {
		return this._dataproviders;
	}

	register(dataprovider) {
		this._dataproviders.set(dataprovider.id, dataprovider);
		// Inject serviceManager reference for entity map relations
		dataprovider.setServiceManager(this.app.services);
		this.bind(dataprovider);
		this.services.forEach((service) => {
			service.registerDataProvider(dataprovider);
		});

		this.app.log.trace(`DataProvider "${dataprovider.id}" registered.`);
	}

	bind(dp) {
		if (dp.binding) {
			for (let rule in dp.binding) {
				let dependencies = dp.binding[rule].dependencies || null;
				let matchingService = [...this.services.values()].find(
					(service) => service.entityClass === dp.binding[rule].entityClass,
				);
				if (matchingService) {
					this.app.log.trace("Binding: ", rule);
					let filter = dp.binding[rule].filter || null;
					let func = dp.binding[rule].func || null;
					let sort = dp.binding[rule].sort || null;
					let id = dp.binding[rule].id || null;
					let renderOn = dp.binding[rule].renderOn || null;
					dp.bindings.set(rule, {
						key: rule,
						service: matchingService,
						filter: filter,
						sort: sort,
						func: func,
						dependencies: dependencies,
						id: id,
						renderOn: renderOn,
					});

					matchingService.bind(rule, filter);

					let boundData = this.getBoundData(dp, dp.bindings.get(rule));

					dp.setStateOnly({ [rule]: boundData });

					// If binding to a specific entity ID, listen for entity-specific events
					if (id !== null) {
						matchingService.on("entityChanged", (service, args) => {
							// Only update if this is the entity we're bound to
							if (args.id === id) {
								this.app.log.trace(
									`Entity ${id} changed, updating DataProvider ${dp.id}`,
								);
								dp.view.setState({ [rule]: args.entity });
							}
						});

						matchingService.on("entityDeleted", (service, args) => {
							// Only update if this is the entity we're bound to
							if (args.id === id) {
								this.app.log.trace(
									`Entity ${id} deleted, clearing DataProvider ${dp.id}`,
								);
								dp.view.setState({ [rule]: null });
							}
						});
					} else {
						//Listen for changes in the service cache (generic)
						matchingService.on("cacheChanged", (service, args) => {
							const binding = dp.bindings.get(rule);

							// Check if we should render based on renderOn filter
							if (binding.renderOn !== null && Array.isArray(binding.renderOn)) {
								// Only update if action is in renderOn array
								if (!binding.renderOn.includes(args.action)) {
									this.app.log.trace(
										`Skipping render for action "${args.action}" (renderOn: ${binding.renderOn})`,
									);
									return;
								}
							}

							//pass in the DP state
							args.state = dp.getState();
							this.updateBoundState(dp, binding, args);
						});
					}
				}

				dependencies = dp.binding[rule].dependencies || [];
				dependencies.forEach((depKey) => {
					let key = depKey.split(".");
					if (key.length === 1) {
						dp.on("stateChanged", (dataProvider, props) => {
							this.app.log.trace("Binding dependency");
							if ([key] in props) {
								this.app.log.trace("updated " + key);
								this.updateBoundState(dp, dp.bindings.get(rule), {
									action: "refresh",
									state: dp.getState(),
								});
							}
							//	this.updateBoundState(this.bindings.get(rule), { action: "refresh" });
						});
					} else if (key.length === 2) {
						// if the dependency is on another view, the dependency will be listed as ${viewID}.key.
						this.app.ui.getView(key[0]).on("stateChanged", (view, props) => {
							this.app.log.trace("Binding dependency");
							if ([key[1]] in props) {
								this.app.log.trace("updated " + key[1]);
								this.updateBoundState(dp, dp.bindings.get(rule), {
									action: "refresh",
									state: dp.getState(),
									dependentState: view.getState(),
								});
							}
						});
					}
				});
			}
		}
	}

	getBoundData(dp, binding) {
		let updatedData;

		let type = dp.schema[binding.key].type;
		if (type === "object") {
			updatedData = binding.service.get(binding.id);
		} else if (type === "map") {
			updatedData = binding.service.get();
			if (binding.filter !== null) {
				updatedData = binding.service.filter(updatedData, binding.filter);
			}

			if (binding.sort !== null) {
				updatedData = binding.service.sort(updatedData, binding.sort);
			}
		}

		return updatedData;
	}

	async updateBoundState(dp, binding, args) {
		let updatedData;
		if (binding.func !== null) {
			// pass the filter to the func
			args = Object.assign(args, {
				filter: binding.filter,
				sort: binding.sort,
			});
			if (binding.func.constructor.name === "AsyncFunction") {
				updatedData = await binding.func(args, dp);
			} else {
				updatedData = binding.func(args, dp);
			}

			let type = dp.schema[binding.key].type;

			// Apply sort if specified (service.sort handles both arrays and Maps, returns array)
			if (binding.sort !== null && updatedData) {
				updatedData = binding.service.sort(updatedData, binding.sort);
			}

			// Convert array to Map if needed
			if (type === "map" && Array.isArray(updatedData)) {
				updatedData = binding.service.convertArrayToMap(updatedData);
			}

			dp.view.setState({ [binding.key]: updatedData });
		} else {
			let state = dp.view.getState();
			let type = dp.schema[binding.key].type;

			// For map-type bindings, always update when cache changes
			// For object-type bindings, only update if it's the specific entity that changed
			let shouldUpdate = false;
			if (type === "map") {
				shouldUpdate = true;
			} else if (type === "object") {
				shouldUpdate = args.item && state[binding.key] && state[binding.key].id === args.item.id;
			} else {
				// Fallback for other types
				shouldUpdate = typeof state[binding.key] !== "object";
			}

			if (shouldUpdate) {
				let updatedData = this.getBoundData(dp, binding);

				dp.view.setState({ [binding.key]: updatedData });
			}
		}
	}
}

// Usage example:
// const dataProviders = new DataProviders();
// dataProviders.init({ dataproviders: [dataProvider1, dataProvider2] });

class ErrorManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		window.onerror = (msg, url, lineNo, columnNo, error) => {
			this.captureError(msg, url, lineNo, columnNo, error);
			return false;
		};

		app.log.info("ErrorManager initialized...");
	}

	captureError(msg, url, lineNo, columnNo, error) {
		var string = msg.toLowerCase();
		var substring = "script error";
		if (string.indexOf(substring) > -1) {
			this.app.log.error("Script Error: See Browser Console for Detail");
		} else {
			var message = [
				"Message: " + msg,
				"URL: " + url,
				"Line: " + lineNo,
				"Column: " + columnNo,
				"Error object: " + JSON.stringify(error),
			].join(" - ");

			this.fireEvent("scriptError", [msg, url, lineNo, columnNo, error]);
			this.app.log.error(message);
		}
	}
}

// Usage example:
// const errorManager = new ErrorManager();
// errorManager.init();

class EventManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		this.topics = {};
		this.hasProp = this.topics.hasOwnProperty;

		this.subscribe("auth.login", (params) => {
			this.app.remote.invoke("auth.login", params);
		});
		this.subscribe("auth.logout", (params) => {
			this.app.remote.invoke("auth.logout", params);
		});
		this.subscribe("auth.refresh", (params) => {
			this.app.remote.invoke("auth.refresh", params);
		});
		this.subscribe("auth.sessionTimeout", () => {
			this.app.security.invalidateSession();
		});
		this.subscribe("auth.invalidateSession", () => {
			this.app.security.invalidateSession();
		});
		// Subscribe to all events in options.events
		for (const [topic, listener] of Object.entries(this.options.events)) {
			this.subscribe(topic, listener);
		}
	}

	subscribe(topic, listener) {
		// Create the topic's object if not yet created
		if (!this.hasProp.call(this.topics, topic)) {
			this.topics[topic] = [];
		}

		// Add the listener to queue
		var index = this.topics[topic].push(listener) - 1;

		// Provide handle back for removal of topic
		return {
			remove: () => {
				delete this.topics[topic][index];
			},
		};
	}

	publish(topic, info) {
		this.app.log.trace("event: " + topic);
		// If the topic doesn't exist, or there's no listeners in queue,
		// just leave
		if (!this.hasProp.call(this.topics, topic)) {
			return;
		}

		// Cycle through topics queue, fire!
		this.topics[topic].forEach(function (item) {
			item(info || {});
		});
	}
}

// derived from work by David Walsh
// https://davidwalsh.name/pubsub-javascript
// MIT License http://opensource.org/licenses/MIT

// Usage example:
// const eventManager = new EventManager();
// eventManager.on('customEvent', (eventManager, args) => { console.log(args); });
// eventManager.fireEvent('customEvent', { message: 'Hello, world!' });

class LogManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		this._ready = false;
		this._deferred = [];
		this.logLevel = this.options.logging.logLevel;
		this._toBrowserConsole = this.options.logging.toBrowserConsole;
		this._consoleEnabled = this.options.console.enabled;
		this._ready = true;

		// Log any deferred messages
		this._deferred.forEach((item) => {
			this.log(item.message, item.level);
		});

		// Clear the deferred messages after logging them
		this._deferred = [];

		this.info("Log initializing...");
		this.fireEvent("initialized");
	}

	error(message) {
		this.log(message, "ERROR");
	}

	fatal(message) {
		this.log(message, "FATAL");
	}

	info(message) {
		this.log(message, "INFO");
	}

	trace(message) {
		this.log(message, "TRACE");
	}

	debug(message) {
		this.log(message, "DEBUG");
	}

	warn(message) {
		this.log(message, "WARN");
	}

	log(message, level) {
		if (
			(this._ready && this.logLevel.indexOf(level) >= 0) ||
			this.logLevel.indexOf("ALL") >= 0
		) {
			if (this._consoleEnabled) {
				a7.console.addMessage(message, new Date(), "local", level);
			}
			if (this._toBrowserConsole) {
				console.log(message);
			}
		} else if (!this._ready) {
			this._deferred.push({ message: message, level: level });
		}
	}
}

//import { Model } from "../components/model.js";

class ModelManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = this.app.options;
		this._model = null;
		this._methods = {};
		app.log.info("Model initializing... ");

		if (typeof this.options.model === "string") {
			switch (this.options.model) {
				case "altseven":
					this._model = Model;
					this._model.init(this.options, this.app.log);
					break;
				case "gadgetui":
					this._model = gadgetui.model;
					break;
			}
		} else if (typeof this.options.model === "object") {
			this._model = this.options.model;
		}

		app.log.trace("Model set: " + this._model);

		// gadgetui maps directly, so we can loop on the keys
		Object.keys(this._model).forEach((key) => {
			this._methods[key] = this._model[key];
		});
	}

	destroy(...args) {
		return this._methods["destroy"].apply(this._model, args);
	}

	get(...args) {
		return this._methods["get"].apply(this._model, args);
	}

	set(...args) {
		return this._methods["set"].apply(this._model, args);
	}

	exists(...args) {
		return this._methods["exists"].apply(this._model, args);
	}

	bind(...args) {
		return this._methods["bind"].apply(this._model, args);
	}

	undo(...args) {
		return this._methods["undo"].apply(this._model, args);
	}

	redo(...args) {
		return this._methods["redo"].apply(this._model, args);
	}

	rewind(...args) {
		return this._methods["rewind"].apply(this._model, args);
	}

	fastForward(...args) {
		return this._methods["fastForward"].apply(this._model, args);
	}
}

// Usage example:
// const modelManager = new ModelManager();
// modelManager.init({ model: 'altseven' }, () => { console.log('Model initialized'); });

class RemoteManager extends Component {
	constructor(app) {
		super();
		this.connections = {};
		this.app = app;
		this.options = app.options.remote ? app.options.remote : {};
		this.time = new Date();
		this.sessionTimer;
		this.modules = {};
		this.init(this.options.modules);
		this.token;
		app.log.trace("RemoteManager initializing... ");
	}

	setModule(key, module) {
		this.modules[key] = module;
	}

	webSocket(url, handleMessage, isSecure = false) {
		// Parse and reconstruct the URL properly
		let finalUrl;

		if (url.startsWith("ws://") || url.startsWith("wss://")) {
			// Already a full URL - parse it properly
			const urlObj = new URL(url);
			if (this.options.useTokens) {
				urlObj.searchParams.set("token", this.token);
			}
			finalUrl = urlObj.toString();
		} else {
			// Construct from components - force no trailing slash
			const cleanUrl = url.replace(/\/+$/, "");
			const protocol = isSecure ? "wss://" : "ws://";
			finalUrl = `${protocol}${cleanUrl}`;
		}

		// Debug output to see what URL Chromium is actually getting
		this.app.log.trace("WebSocket connecting to:", finalUrl);

		const socket = new WebSocket(finalUrl);

		// Add connection error handler specifically for Chromium quirks
		// socket.addEventListener("error", (error) => {
		// 	console.error("WebSocket connection failed:", error);
		// 	// Try alternative URL format if first attempt fails
		// 	if (finalUrl.endsWith("/")) {
		// 		const altUrl = finalUrl.slice(0, -1);
		// 		console.log("Trying alternative URL:", altUrl);
		// 		// You might want to implement retry logic here
		// 	}
		// });

		socket.onopen = () => {
			this.app.log.trace(`WebSocket connection to ${finalUrl} established...`);
			this.fireEvent("webSocketOpen", [socket]);
		};

		socket.onerror = (error) => {
			console.error("WebSocket connection failed:", error);
			// Try alternative URL format if first attempt fails
			if (finalUrl.endsWith("/")) {
				const altUrl = finalUrl.slice(0, -1);
				this.app.log.trace("Trying alternative URL:", altUrl);
				// You might want to implement retry logic here
			}
			this.app.log.error(`WebSocket error:`, error);
			this.fireEvent("webSocketError", [error]);
		};

		socket.onclose = () => {
			this.app.log.trace(`WebSocket connection to ${finalUrl} closed.`);
			this.fireEvent("webSocketClose", []);
		};

		socket.onmessage = async (event) => {
			const data = JSON.parse(event.data);
			this.app.log.trace(`Received message:`, data);
			if (handleMessage.constructor.name === "AsyncFunction") {
				await handleMessage(data);
			} else {
				handleMessage(data);
			}
			this.fireEvent("webSocketMessage", [data]);
		};

		this.connections[finalUrl] = socket;
		return socket;
	}

	getConnection(url) {
		return this.connections[url];
	}

	closeConnection(url) {
		if (this.connections[url]) {
			this.connections[url].close();
			delete this.connections[url];
			this.app.log.trace(`WebSocket connection to ${url} closed.`);
		}
	}

	closeAllConnections() {
		for (const url in this.connections) {
			this.closeConnection(url);
		}
	}

	async refreshClientSession() {
		try {
			const response = await this.invoke("auth.refresh", {
				resolve: (json) => {
					if (json.authenticated) {
						// session is still active, no need to do anything else
						this.app.log.trace("Still logged in.");
					} else {
						this.app.log.trace("Session expired.");
						this.app.events.publish("auth.logout");
					}
				},
				reject: (error) => {
					this.app.log.error("Error in refreshClientSession:", error);
					this.app.events.publish("auth.logout");
				},
			});
		} catch (error) {
			this.app.log.error("Error in refreshClientSession:", error);
			this.app.events.publish("auth.logout");
		}
	}

	setToken(token) {
		sessionStorage.token = token;
		this.token = token;
	}

	getToken() {
		return this.token;
	}

	invalidateToken() {
		this.setToken("");
	}

	getSessionTimer() {
		return this.sessionTimer;
	}

	init(modules) {
		let auth = this.app.options.auth;

		this.options.sessionTimeout = auth.sessionTimeout;
		// set token if valid
		if (
			this.options.useTokens &&
			sessionStorage.token &&
			sessionStorage.token !== ""
		) {
			this.token = sessionStorage.token;
		}

		let authModule = {
			login: async (params) => {
				this.app.log.trace("remote call: auth.login");
				const args = {
					method: "POST",
					headers: {
						Authorization:
							"Basic " +
							this.app.util.base64.encode64(
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

				if (this.options.credentials) {
					args.credentials = this.options.credentials;
				}

				try {
					const response = await fetch(this.options.loginURL, args);

					if (this.options.useTokens) {
						// set the token into sessionStorage so it is available if the browser is refreshed
						var token =
							this.options.tokenType === "X-Token"
								? response.headers.get("X-Token")
								: response.headers.get("Access_token");
						if (token !== undefined && token !== null) {
							this.setToken(token);
						}
					}
					const json = await response.json();

					if (json.success) {
						var user = this.app.model.get("user");
						// map the response object into the user object
						Object.keys(json.user).map((key) => {
							user[key] = json.user[key];
						});
						// set the user into the sessionStorage and the model
						sessionStorage.user = JSON.stringify(user);
						this.app.model.set("user", user);
						this.app.log.trace("User set into model:", user);
						// handler/function/route based on success
						if (params.success !== undefined) {
							if (typeof params.success === "function") {
								params.success(json);
							} else if (this.app.options.router) {
								this.app.router.open(params.success, json);
							} else {
								this.app.events.publish(params.success, json);
							}
						}
					} else if (params.failure !== undefined) {
						// if login failed
						if (typeof params.failure === "function") {
							params.failure(json);
						} else if (this.app.options.router) {
							this.app.router.open(params.failure, json);
						} else {
							this.app.events.publish(params.failure, json);
						}
					}
					if (params.callback !== undefined) {
						params.callback(json);
					}
				} catch (error) {
					this.app.log.error("Login error:", error);
				}
			},
			logout: async (params) => {
				this.app.log.trace("remote call: auth.logout");
				const args = {
					method: "POST",
					headers: {
						// Authorization:
						// 	"Basic " +
						// 	this.app.util.base64.encode64(
						// 		params.username + ":" + params.password,
						// 	),
					},
				};

				if (this.options.credentials) {
					args.credentials = this.options.credentials;
				}

				try {
					const response = await fetch(this.options.logoutURL, args);
					const json = await response.json();

					if (json.success) {
						this.app.security.invalidateSession();
						if (params.success !== undefined) {
							if (typeof params.success === "function") {
								params.success(json);
							} else if (this.app.options.router) {
								this.app.router.open(params.success, json);
							} else {
								this.app.events.publish(params.success, json);
							}
						}
					} else if (params.failure !== undefined) {
						// if logout failed
						if (typeof params.failure === "function") {
							params.failure(json);
						} else if (this.app.options.router) {
							this.app.router.open(params.failure, json);
						} else {
							this.app.events.publish(params.failure, json);
						}
					}

					if (params.callback !== undefined) {
						params.callback();
					}
				} catch (error) {
					this.app.log.error("Logout error:", error);
				}
			},
			refresh: async (params) => {
				// refresh keeps the client session alive
				try {
					let args = {};
					if (this.options.credentials) {
						args.credentials = this.options.credentials;
					}
					const response = await this.fetch(
						this.options.refreshURL,
						args,
						true,
					);

					// initial fetch needs to parse response
					let json;
					if (response.status === 401) {
						json = { isauthenticated: false };
					} else {
						json = await response.json();
					}

					// then json is handled
					if (params.resolve !== undefined) {
						params.resolve(json);
					}
				} catch (error) {
					if (params.reject) {
						params.reject(error);
					}
				}
			},
		};

		// add the auth module
		this.setModule("auth", authModule);

		// add application modules
		Object.keys(modules).forEach((key) => {
			this.setModule(key, modules[key]);
		});
	}

	async fetch(uri, params, secure) {
		this.app.log.trace("fetch: " + uri);
		var request;
		var response;

		//if secure and tokens, we need to check timeout and add Authorization header
		if (secure && this.options.useTokens) {
			var currentTime = new Date(),
				diff = Math.abs(currentTime - this.time),
				minutes = Math.floor(diff / 1000 / 60);

			if (minutes > this.options.sessionTimeout) {
				// timeout
				this.app.events.publish("auth.sessionTimeout");
				return;
			} else if (this.token !== undefined && this.token !== null) {
				// set Authorization: Bearer header
				if (params.headers === undefined) {
					if (this.options.tokenType === "X-Token") {
						params.headers = {
							"X-Token": this.token,
						};
					} else {
						params.headers = {
							Authorization: "Bearer " + this.getToken(),
						};
					}

					//							'Content-Type': 'application/json',
				} else {
					if (this.options.tokenType === "X-Token") {
						params.headers["X-Token"] = this.token;
					} else {
						params.headers["Authorization"] = `Bearer ${this.getToken()}`;
					}
				}
			}

			this.time = currentTime;
		}

		// Add credentials option if configured
		if (this.options.credentials) {
			params.credentials = this.options.credentials;
		}

		request = new Request(uri, params);
		//calling the native JS fetch method ...
		try {
			response = await fetch(request);

			if (secure && this.options.useTokens) {
				// according to https://www.rfc-editor.org/rfc/rfc6749#section-5.1
				// the access_token response key should be in the body. we're going to include it as a header for non-oauth implementations
				var token =
					this.options.tokenType === "X-Token"
						? response.headers.get("X-Token")
						: response.headers.get("Access_token");
				if (token !== undefined && token !== null) {
					this.setToken(token);

					if (this.sessionTimer !== undefined) {
						clearTimeout(this.sessionTimer);
					}
					this.sessionTimer = setTimeout(() => {
						this.refreshClientSession();
					}, this.options.sessionTimeout);
				} else {
					this.app.events.publish("auth.sessionTimeout");
				}
			}

			return response;
		} catch (error) {
			this.app.log.error(error);
			throw error;
		}
	}

	async genericFetch(method, url, body = null, headers = {}) {
		const params = {
			method: method,
			headers: headers,
		};

		if (body) {
			params.body = JSON.stringify(body);
		}

		return await this.fetch(url, params, true);
	}

	async readAll(moduleConfig) {
		return await this.genericFetch("GET", moduleConfig.url);
	}

	async create(moduleConfig, body) {
		const headers = {
			Accept: "application/json, application/xml, text/play, text/html, *.*",
			"Content-Type": "application/json; charset=utf-8",
		};
		return await this.genericFetch("POST", moduleConfig.url, body, headers);
	}

	async read(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		return await this.genericFetch("GET", fullUrl);
	}

	async update(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		const headers = {
			Accept: "application/json, application/xml, text/play, text/html, *.*",
			"Content-Type": "application/json; charset=utf-8",
		};
		return await this.genericFetch("PUT", fullUrl, params, headers);
	}

	async destroy(moduleConfig, params) {
		let fullUrl = moduleConfig.url;
		// Replace all :ID placeholders with values from params
		Object.keys(params).forEach((key) => {
			fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
		});
		return await this.genericFetch("DELETE", fullUrl);
	}

	async invoke(moduleAction, params) {
		var mA = moduleAction.split(".");
		if (mA.length < 2) {
			this.app.log.error(
				"No action specified. Valid actions are: " +
					Object.keys(this.modules[mA[0]]).toString(),
			);
			return;
		}

		const moduleKey = mA[0];
		const actionKey = mA[1];

		if (typeof this.modules[moduleKey][actionKey] === "function") {
			return await this.modules[moduleKey][actionKey](params);
		} else if (typeof this.modules[moduleKey][actionKey] === "object") {
			const moduleConfig = this.modules[moduleKey][actionKey];
			switch (actionKey) {
				case "read":
					return await this.read(moduleConfig, params.toFlatObject());
				case "readAll":
					return await this.readAll(moduleConfig);
				case "create":
					return await this.create(moduleConfig, params.toFlatObject());
				case "update":
					return await this.update(moduleConfig, params.toFlatObject());
				case "destroy":
					return await this.destroy(moduleConfig, params.toFlatObject());
				default:
					// Handle custom methods
					return await this.invokeCustomMethod(moduleConfig, params);
			}
		} else {
			this.app.log.error(`Invalid action: ${actionKey}`);
		}
	}

	async invokeCustomMethod(moduleConfig, params) {
		// Extract method and URL from module config
		const method = (moduleConfig.params && moduleConfig.params.method) || "GET";
		const url = moduleConfig.url;

		// Prepare the full URL with parameters
		let fullUrl = url;
		if (typeof params === "object" && params !== null) {
			Object.keys(params).forEach((key) => {
				// Replace :key placeholders with actual values
				fullUrl = fullUrl.replace(new RegExp(`:${key}`, "g"), params[key]);
			});
		}

		// Prepare headers and body
		const headers = {};
		let body = null;

		// Handle request body if present in params
		if (params.body) {
			body = JSON.stringify(params.body);
			headers["Content-Type"] = "application/json; charset=utf-8";
		}

		// Handle additional headers from module config
		if (moduleConfig.params && moduleConfig.params.headers) {
			Object.assign(headers, moduleConfig.params.headers);
		}

		const fetchParams = {
			method: method.toUpperCase(),
			headers: headers,
		};

		if (body) {
			fetchParams.body = body;
		}

		return await this.fetch(fullUrl, fetchParams, true);
	}
}

class RouterManager extends Component {
	constructor(app, routes) {
		super();
		this.app = app;
		this.router = new Router(app.options.router.routes);
		this.useEvents = this.app.options.router.useEvents ?? false;

		window.onpopstate = (event) => {
			this.match(document.location.pathname + document.location.search);
		};

		app.log.info("RouterManager initialized...");
	}

	add(path, handler) {
		this.router.add(path, handler);
		return this;
	}

	find(path) {
		return this.router.find(path);
	}

	open(path, params = {}) {
		let result = this.find(path);
		if (!result || !result.handler) {
			this.app.log.error(`No route found for path: ${path}`);
			return;
		}

		history.pushState(JSON.parse(JSON.stringify(params)), "", path);
		let combinedParams = Object.assign(params || {}, result.params || {});
		if (this.useEvents && typeof result.handler === "string") {
			this.app.events.publish(result.handler, combinedParams);
		} else {
			result.handler(combinedParams);
		}
	}

	match(path, params = {}) {
		let result = this.find(path);
		if (!result || !result.handler) {
			this.app.log.error(`No route found for path: ${path}`);
			return;
		}

		history.pushState(JSON.parse(JSON.stringify(params)), "", path);
		let combinedParams = Object.assign(params || {}, result.params || {});
		if (this.useEvents) {
			this.app.events.publish(result.handler, combinedParams);
		} else {
			result.handler(combinedParams);
		}
	}
}

// URL Router class
class Router {
	constructor(routes) {
		this.REGEX_PARAM_DEFAULT = /^[^/]+/;
		this.REGEX_START_WITH_PARAM = /^(:\w|\()/;
		this.REGEX_INCLUDE_PARAM = /:\w|\(/;
		this.REGEX_MATCH_PARAM = /^(?::(\w+))?(?:\(([^)]+)\))?/;

		this.root = this.createNode();

		if (routes) {
			routes.forEach((route) => this.add.apply(this, route));
		}
	}

	createNode(_temp = {}) {
		const { regex = null, param = null, handler = null } = _temp;
		return {
			regex: regex,
			param: param,
			handler: handler,
			children: {
				string: {},
				regex: {},
			},
		};
	}

	add(pattern, handler) {
		this.parseOptim(pattern, handler, this.root);
		return this;
	}

	parse(remain, handler, parent) {
		if (this.REGEX_START_WITH_PARAM.test(remain)) {
			const match = remain.match(this.REGEX_MATCH_PARAM);
			let node = parent.children.regex[match[0]];

			if (!node) {
				node = parent.children.regex[match[0]] = this.createNode({
					regex: match[2]
						? new RegExp("^" + match[2])
						: this.REGEX_PARAM_DEFAULT,
					param: match[1],
				});
			}

			if (match[0].length === remain.length) {
				node.handler = handler;
			} else {
				this.parse(remain.slice(match[0].length), handler, node);
			}
		} else {
			const _char = remain[0];
			let _node = parent.children.string[_char];

			if (!_node) {
				_node = parent.children.string[_char] = this.createNode();
			}

			this.parse(remain.slice(1), handler, _node);
		}
	}

	parseOptim(remain, handler, node) {
		if (this.REGEX_INCLUDE_PARAM.test(remain)) {
			this.parse(remain, handler, node);
		} else {
			const child = node.children.string[remain];

			if (child) {
				child.handler = handler;
			} else {
				node.children.string[remain] = this.createNode({
					handler: handler,
				});
			}
		}
	}

	find(path) {
		return this.findOptim(path, this.root, {});
	}

	findOptim(remain, node, params) {
		const child = node.children.string[remain];

		if (child && child.handler !== undefined) {
			return {
				handler: child.handler,
				params: params,
			};
		}

		return this._find(remain, node, params);
	}

	_find(remain, node, params) {
		const child = node.children.string[remain[0]];

		if (child) {
			const result = this._find(remain.slice(1), child, params);

			if (result) {
				return result;
			}
		}

		for (const k in node.children.regex) {
			let child = node.children.regex[k];
			const match = remain.match(child.regex);

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
					const _result = this.findOptim(
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
	}
}

// Usage example:
// const routerManager = new RouterManager();
// routerManager.init({ useEvents: true }, [{ path: '/home', handler: () => { console.log('Home page'); } }]);
// routerManager.open('/home');

class SecurityManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		app.log.info("Security initializing...");
		this.useModel = this.options.model.length > 0 ? true : false;
		this.userArgs = this.options.security.userArgs
			? this.options.security.userArgs
			: {};
		let user = this.getUser();
		this.setUser(user);
	}

	async isAuthenticated() {
		this.app.log.trace("Checking authenticated state.. ");

		// Check if there's an outstanding auth.refresh call
		if (this.authRefreshPromise) {
			this.app.log.trace("Waiting for existing auth.refresh call to complete");
			return await this.authRefreshPromise;
		}

		// Create a new promise for the auth.refresh call
		this.authRefreshPromise = new Promise(async (resolve, reject) => {
			try {
				let response = await this.app.remote.invoke("auth.refresh", {
					resolve: resolve,
					reject: reject,
				});

				if (response.authenticated) {
					this.setUser(response.user);
				}
				this.app.log.trace("Resolving the response... ");
				resolve(response);
			} catch (error) {
				reject(error);
			} finally {
				// Clear the promise reference when done
				this.authRefreshPromise = null;
			}
		});

		// Return the promise so callers can await it
		return await this.authRefreshPromise;
	}

	invalidateSession() {
		clearTimeout(this.app.remote.getSessionTimer());
		this.app.remote.invalidateToken();
		let user = new User(this.userArgs);
		this.setUser(user);
	}

	setUser(user) {
		if (this.useModel) {
			this.app.model.set("user", user);
		}
		sessionStorage.user = JSON.stringify(user);
	}

	getUser() {
		let suser, user;
		let mUser = this.useModel ? this.app.model.get("user") : null;
		if (typeof mUser !== "undefined" && mUser !== "" && mUser !== null) {
			user = mUser;
		} else if (
			typeof sessionStorage.user !== "undefined" &&
			sessionStorage.user !== ""
		) {
			try {
				//try to parse the user data
				suser = JSON.parse(sessionStorage.user);
				user = new User(this.userArgs);
				Object.keys(suser).map((key) => (user[key] = suser[key]));
			} catch (e) {
				// Handle error parsing user data
				console.error("Error parsing user data:", e);
				user = new User(this.userArgs);
			}
		} else {
			user = new User(this.userArgs);
		}
		return user;
	}
}

// Usage example:
// const securityManager = new SecurityManager();
// securityManager.init({ /* your options here */ });

class ServiceManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.services = new Map();
	}

	getService(id) {
		return this.services.get(id);
	}

	getAll() {
		return this.services;
	}

	register(service) {
		this.services.set(service.id, service);
		// set the log for the service
		service.setLog(this.app.log);
		service.setModel(this.app.model);
		service.setRemote(this.app.remote);
		// set the cache for the service

		service.config();
		this.app.log.trace(`Service registered: ${service.id}`);
	}
}

class UIManager extends Component {
	#handleMouseMove(event) {
		this.mousePosition = {
			x: event.clientX,
			y: event.clientY,
		};
	}
	#debouncedMouseMove;

	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		this.events = [];
		this.selectors = {};
		this.nodes = {};
		this.queue = [];
		this.deferred = [];
		this.stateTransition = false;
		this.mousePosition = {
			x: 0,
			y: 0,
		};
		this.views = [];
		app.log.trace("Layout initializing...");

		let eventGroups = this.options.ui.eventGroups
			? this.options.ui.eventGroups
			: "standard";

		this.config();

		switch (eventGroups) {
			case "extended":
				break;
			//	reject("Extended events are not implemented yet.");
			case "standard":
				this.events = this.standardEvents;
				break;
			default:
				this.options.ui.eventGroups.forEach((group) =>
					this.events.concat(group),
				);
		}

		if (this.options.ui.enableMouseTracking) {
			this.enableMouseTracking(true);
		}
	}

	config() {
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

		this.standardEvents = resourceEvents
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
	}

	enableMouseTracking(enable) {
		if (enable) {
			// Create a debounced version of the mouse move handler
			this.#debouncedMouseMove = this.app.util.debounce(
				this.#handleMouseMove.bind(this),
				this.options.ui.mouseTrackingDeBounceTime,
			);
			document.addEventListener("mousemove", this.#debouncedMouseMove);
		} else {
			document.removeEventListener("mousemove", this.#debouncedMouseMove);
		}
	}

	setSelector(name, selector) {
		this.selectors[name] = selector;
		this.nodes[name] = document.querySelector(selector);
	}

	getSelector(name) {
		return this.selectors[name];
	}

	getNode(name) {
		return this.nodes[name];
	}

	getView(id) {
		return this.views[id];
	}

	setStateTransition(val) {
		this.stateTransition = val;
		this.app.log.trace("this.app.ui.stateTransition: " + val);
	}

	getStateTransition() {
		return this.stateTransition;
	}

	getEvents() {
		return this.events;
	}

	register(view) {
		switch (this.options.ui.renderer) {
			case "Handlebars":
			case "Mustache":
			case "templateLiterals":
				view.setLog(this.app.log);
				view.setModel(this.app.model);
				view.setUI(this.app.ui);
				view.setTimeout(this.app.options.ui.timeout);
				view.setDebounceTime(this.app.options.ui.debounceTime);
				view.setRenderer(this.app.options.ui.renderer);
				// inject the debounce function
				view.setDebounce(this.app.util.debounce);
				view.config();
				this.views[view.props.id] = view;
				// register as a child of the parent
				if (this.getView(view.props.parentID)) {
					this.getView(view.props.parentID).addChild(view);
				}
				view.fireEvent("registered");
				break;
		}
	}

	unregister(id) {
		delete this.views[id];
	}

	getParentViewIds(id) {
		this.app.log.trace("Find parents of " + id);
		let parentIds = [];
		let view = this.views[id];
		while (view.props.parentID !== undefined) {
			parentIds.unshift(view.props.parentID);
			view = this.views[view.props.parentID];
		}
		return parentIds;
	}

	getChildViewIds(id) {
		this.app.log.trace("Find children of " + id);
		let childIds = [];
		let view = this.views[id];

		for (let child in view.children) {
			let childId = view.children[child].props.id;
			if (this.getView(childId) !== undefined) {
				childIds.push(childId);
				childIds.concat(this.getChildViewIds(childId));
			}
		}
		return childIds;
	}

	enqueueForRender(id) {
		if (!this.getStateTransition()) {
			this.app.log.trace("enqueue: " + id);
			if (!this.queue.length) {
				this.app.log.trace("add first view to queue: " + id);
				this.queue.push(id);
				this.processRenderQueue();
			} else {
				let childIds = this.getChildViewIds(id);
				if (this.views[id].props.parentID === undefined) {
					this.app.log.trace("add to front of queue: " + id);
					this.queue.unshift(id);
				} else {
					let parentIds = this.getParentViewIds(id);

					let highParent = undefined;
					if (parentIds.length) {
						highParent = parentIds.find(
							(parentId) => this.queue.indexOf(parentId) >= 0,
						);
					}

					if (highParent === undefined) {
						this.app.log.trace("add to end of queue: " + id);
						this.queue.push(id);
					}
				}

				childIds.forEach((childId) => {
					if (this.queue.indexOf(childId) >= 0) {
						this.app.log.trace("remove child from queue: " + childId);
						this.queue.splice(this.queue.indexOf(childId), 1);
					}
				});
			}
		} else {
			this.deferred.push(id);
		}
	}

	processRenderQueue() {
		this.app.log.trace("processing the queue");
		this.setStateTransition(true);
		try {
			this.queue.forEach((id) => {
				this.app.log.debug("view ID: " + id);
				if (this.views[id]) {
					this.views[id].render();
				} else {
					this.app.log.warn("View not found: " + id);
				}
			});
		} catch (err) {
			this.app.log.error(err);
		}
		this.queue = [];
		this.setStateTransition(false);
		this.deferred.forEach((id) => this.enqueueForRender(id));
		this.deferred = [];
	}

	removeView(id) {
		delete this.views[id];
	}
}

// Usage example:
// const uiManager = new UIManager();
// uiManager.init(() => { console.log('UI Manager initialized'); }, (error) => { console.error('Failed to initialize UI Manager:', error); });

class Util {
	constructor() {}
	// split by commas, used below
	split(val) {
		return val.split(/,\s*/);
	}

	// return the last item from a comma-separated list
	extractLast(term) {
		return this.split(term).pop();
	}

	// encode and decode base64
	base64 = {
		keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		encode64(input) {
			if (!String(input).length) {
				return false;
			}
			let output = "",
				chr1,
				chr2,
				chr3,
				enc1,
				enc2,
				enc3,
				enc4,
				i = 0;

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

				output =
					output +
					this.keyStr.charAt(enc1) +
					this.keyStr.charAt(enc2) +
					this.keyStr.charAt(enc3) +
					this.keyStr.charAt(enc4);
			} while (i < input.length);

			return output;
		},

		decode64(input) {
			if (!input) {
				return false;
			}
			let output = "",
				chr1,
				chr2,
				chr3,
				enc1,
				enc2,
				enc3,
				enc4,
				i = 0;

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
		},
	};

	// add a leading zero to single numbers so the string is at least two characters
	leadingZero(n) {
		return n < 10 ? "0" + n : n;
	}

	dynamicSort(property) {
		let sortOrder = 1;
		if (property[0] === "-") {
			sortOrder = -1;
			property = property.substr(1);
		}
		return function (a, b) {
			let result =
				a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
			return result * sortOrder;
		};
	}

	// return yes|no for 1|0
	yesNo(val) {
		return parseInt(val, 10) < 1 ? "No" : "Yes";
	}

	// validate a javascript date object
	isValidDate(d) {
		if (Object.prototype.toString.call(d) !== "[object Date]") {
			return false;
		}
		return !isNaN(d.getTime());
	}

	// generate a pseudo-random ID
	id() {
		return (
			(Math.random() * 100).toString() + (Math.random() * 100).toString()
		).replace(/\./g, "");
	}

	// try/catch a function
	tryCatch(fn, ctx, args) {
		let errorObject = {
			value: null,
		};
		try {
			return fn.apply(ctx, args);
		} catch (e) {
			errorObject.value = e;
			return errorObject;
		}
	}

	// return a numeric representation of the value passed
	getNumberValue(pixelValue) {
		return isNaN(Number(pixelValue))
			? Number(pixelValue.substring(0, pixelValue.length - 2))
			: pixelValue;
	}

	// check whether a value is numeric
	isNumeric(num) {
		return !isNaN(parseFloat(num)) && isFinite(num);
	}

	// get top/left offset of a selector on screen
	getOffset(selector) {
		let rect = selector.getBoundingClientRect();

		return {
			top: rect.top + document.body.scrollTop,
			left: rect.left + document.body.scrollLeft,
		};
	}

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
	 * have elapsed since the last time the debounced function was invoked.
	 *
	 * @param {Function} func - The function to debounce.
	 * @param {number} wait - The number of milliseconds to delay.
	 * @param {boolean} [immediate=false] - Trigger the function on the leading edge, instead of the trailing.
	 * @return {Function} A new debounced function.
	 */
	debounce(func, wait, immediate = false) {
		let timeout;

		return function executedFunction() {
			// Save the context and arguments for later invocation
			const context = this;
			const args = arguments;

			// Define the function that will actually call `func`
			const later = function () {
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
}

export class Application extends Component {
	constructor(options) {
		super();
		this.options = this._initializeOptions(options);
		this.name = this.options.name;
		this.util = new Util();
		this.log = new LogManager(this);
		this.constants = {};
		this.log.info("Application initializing...");
	}

	_initializeOptions(options) {
		return {
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
			events: options?.events ?? {},
			logging: {
				logLevel: options?.logging?.logLevel ?? "ERROR,FATAL,INFO",
				toBrowserConsole: options?.logging?.toBrowserConsole ?? false,
			},
			model: options?.model ?? "altseven",
			name: options?.name ?? "a7",
			remote: options?.remote
				? {
						loginURL: options.remote.loginURL ?? "",
						logoutURL: options.remote.logoutURL ?? "",
						refreshURL: options.remote.refreshURL ?? "",
						useTokens: options?.auth?.useTokens ?? true,
						tokenType: options.remote.tokenType ?? "X-Token", // Authorization is the other token type
						credentials: options.remote.credentials ?? "same-origin", // 'include' for SAML/cross-origin cookie auth
						modules: options.remote.modules ?? {},
					}
				: { useTokens: true, credentials: "same-origin" },
			router: options?.router
				? {
						useEvents: options.router.useEvents ?? true,
						routes: options.router.routes,
					}
				: undefined,
			security: options?.security
				? {
						enabled: options.security.enabled ?? true,
						userArgs: options.security.userArgs ?? {},
					}
				: { enabled: true, userArgs: {} },
			services: options?.services ?? [],
			ui: {
				enableMouseTracking: options?.ui?.enableMouseTracking ?? false,
				mouseTrackingDeBounceTime:
					options?.ui?.mouseTrackingDeBounceTime ?? 100,
				renderer:
					options?.ui?.renderer ??
					(typeof Mustache === "object"
						? "Mustache"
						: typeof Handlebars === "object"
							? "Handlebars"
							: "templateLiterals"),
				debounceTime: options?.ui?.debounceTime ?? 18,
				timeout: options?.ui?.timeout ?? 600000, // 10 minutes
				cacheTemplates: options?.ui?.cacheTemplates ?? true,
			},
			ready: false,
		};
	}

	async init() {
		this.log.trace("application log init");

		this.log.trace("application services init");
		this.services = new ServiceManager(this);

		this.log.trace("application dataproviders init");
		this.dataproviders = new DataProviderManager(this);

		this.log.trace("application model init");
		this.model = new ModelManager(this);
		//await a7.model.init(this.options);
		// if there is an applicationName set, use that for the options store
		this.model.set(this.options?.applicationName ?? "a7", this.options);

		if (this.options.console.enabled) {
			this.log.trace("application console init");
			this.console = new Console(this);
		}

		if (this.options.security.enabled) {
			this.log.trace("application security init");
			// init user state
			// pass security options if they were defined
			this.security = new SecurityManager(this);
		}

		this.log.trace("application remote init");
		//pass remote modules if they were defined
		this.remote = new RemoteManager(this);

		this.log.trace("application events init");
		this.events = new EventManager(this);

		if (this.options.router) {
			this.log.trace("application router init");
			this.router = new RouterManager(this);
		}

		this.log.trace("application ui init");
		// initialize templating engine
		this.ui = new UIManager(this);

		if (this.options.security.enabled) {
			this.log.trace("application security init");
			this.security = new SecurityManager(this);
			this.error = new ErrorManager(this);
			// check whether user is authenticated

			if (this.options.services.length > 0) {
				this.options.services.forEach((service) => {
					this.services.register(service);
				});
				this.log.trace("application services registered");
			}

			try {
				const response = await this.security.isAuthenticated();
				this.log.info(`Authenticated: ${response.authenticated}...`);
				this.authenticated = response.authenticated;
				this.user = response.user;
			} catch (error) {
				this.log.error("Authentication check failed:", error);
				throw error;
			}
		}

		this.log.info("Application initialized...");
		return this;
	}
}

//# sourceMappingURL=a7.js.map