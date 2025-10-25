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
					resolve(dataMap.get(compositeKey));
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
		if (this.templateCache !== null) {
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

//# sourceMappingURL=a7.components.js.map