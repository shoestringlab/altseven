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
	constructor(props) {
		super();
		this.binding = props?.binding;
		this.#state = props.state;
		this.#schema = props.schema;
		this.view = props.view;
		this.id = this.view.props.id + "-dataProvider";
		this.services = new Map();
		this.bindings = new Map(); // New map to store bindings
	}

	set schema(obj) {
		// this doesn't actually do anthing, it's just here so the runtime doesn't complain about it being missing
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
		this.fireEvent("stateChanged", args);
	}

	getState() {
		return Object.assign({}, this.#state);
	}
}

export class Entity extends Component {
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

		const idField = Object.keys(this.#schema).find(
			(key) => this.#schema[key].id === true,
		);
		if (idField) {
			Object.defineProperty(this, "id", {
				get: function () {
					return this[idField];
				},
			});
		} else {
			//this.app.log.error("No ID field found in schema.");
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

			case "array":
				return Array.isArray(value);

			case "boolean":
				return value === 0 || value === 1 || value === true || value === false
					? true
					: false;

			case "integer":
				return Number.isInteger(value);

			case "float":
				return typeof value === "number";

			case "string":
				return typeof value === "string";

			default:
				return true;
		}
	}

	set schema(obj) {}

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

	toFlatObject() {
		const flatObject = {};
		for (const [key, value] of Object.entries(this.#data)) {
			flatObject[key.replace(/^_/, "")] = value;
		}
		return flatObject;
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
				_log.error(`Key '${base}' does not exist in the model.`);
				return undefined;
			}
			if (!key) {
				const value = prop ? model.data[prop] : model.data;
				return value instanceof Map ? new Map(value) : value;
			} else {
				if (model.data instanceof Map) {
					if (!model.data.has(key)) {
						_log.error(`Key '${key}' does not exist in the Map .`);
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
		this.log.trace("Service: " + this.id);
		this.log.trace("compareIDs: " + IDs);

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
		this.log.trace(
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
				dataMap.set(item[this.key], this.format(item));
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
		// if obj is a plain object, create a new entity
		let entityInstance =
			obj instanceof this.entityClass ? obj : this.format(obj);

		await this.remote
			.invoke(this.remoteMethods.create, entityInstance)
			.then((response) => response.json())
			.then((json) => {
				entityInstance = this.format(json);
				this.cacheSet(entityInstance);
			});
		return entityInstance;
	}

	async read(obj) {
		let dataMap = this.get();
		const requestKey = `${this.remoteMethods.read}-${JSON.stringify(obj)}`;
		if (this.queue.has(requestKey)) {
			this.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			if (!dataMap.has(obj[this.key])) {
				let entity;
				await this.remote
					.invoke(this.remoteMethods.read, obj)
					.then((response) => response.json())
					.then((json) => {
						entity = json;
					});
				this.cacheSet(this.format(entity));
				this.queue.delete(requestKey);
				dataMap = this.get();
			}
		}

		return dataMap.get(obj[this.key]);
	}

	async update(obj) {
		let entityInstance =
			obj instanceof this.entityClass ? obj : this.format(obj);

		await this.remote
			.invoke(this.remoteMethods.update, obj)
			.then((response) => response.json())
			.then((json) => {
				entityInstance = this.format(json);
				this.cacheSet(entityInstance);
			});
		return entityInstance;
	}

	async delete(obj) {
		await this.remote
			.invoke(this.remoteMethods.delete, obj)
			.then((response) => response.json())
			.then((json) => {
				// nothing to do here
			});
		this.cacheDelete(obj[this.key]);
		return true;
	}

	async readAll(obj) {
		const requestKey = `${this.remoteMethods.readAll}-${JSON.stringify(obj)}`;
		if (this.queue.has(requestKey)) {
			this.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			let dataMap = this.get();
			if (!dataMap.size) {
				let entities;
				await this.remote
					.invoke(this.remoteMethods.readAll, obj)
					.then((response) => response.json())
					.then((json) => {
						entities = json;
					});
				this.merge(entities);
				this.queue.delete(requestKey);
			}
		}
		return this.get();
	}

	format(obj) {
		return new this.entityClass(obj);
	}

	cacheDelete(id) {
		let dataMap = this.get();
		dataMap.delete(id);
		this.set(dataMap);

		// Notify bound DataProviders

		this.fireEvent("cacheChanged", { action: "delete" });
	}

	cacheSet(item) {
		if (item instanceof this.entityClass) {
			let dataMap = this.get();
			dataMap.set(item[this.key], item);
			this.set(dataMap);

			// Notify bound DataProviders

			this.fireEvent("cacheChanged", {
				action: "refresh",
			});
		} else {
			throw "Item must be of proper entity type.";
		}
	}

	set(dataMap) {
		this.model.set(this.id, dataMap);
	}

	get(ID) {
		if (typeof ID === "undefined") {
			return this.model.get(this.id);
		} else {
			return this.model.get(this.id, ID);
		}
	}

	// Retrieve items, using cache when possible
	async readMany(IDs) {
		if (typeof IDs === "undefined") {
			return new Map();
		}
		this.log.trace("readMany: ");
		// Get cached items
		//const itemsMap = this.get();
		const requestKey = `${this.remoteMethods.readMany}-${JSON.stringify(IDs)}`;
		if (this.queue.has(requestKey)) {
			this.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			// Compare requested IDs with cache
			const { present, missing } = this.compareIDs(IDs);

			// Fetch missing items if any

			this.log.trace("Missing? " + missing.length);
			if (missing.length > 0) {
				let obj = { id: missing };

				await this.remote
					.invoke(this.remoteMethods.readMany, obj)
					.then((response) => response.json())
					.then((json) => {
						if (Array.isArray(json)) {
							this.merge(json);
							this.queue.delete(requestKey);
						}
					});
			}

			//const cachedItems = present.map((id) => itemsMap.get(id));
		}
		// Return all requested items in order, filtering out nulls
		const result = IDs.map((id) => {
			const item = this.get(id);
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
					let valueB = typeof value === "function" ? value() : value;

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
					const value =
						typeof criterion[1] === "function" ? criterion[1]() : criterion[1];

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
		this.config();
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
			),
			this.debounceTime,
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
		if (this.dataProvider) {
			this.dataProvider.setState(args);
		} else {
			this.state = Object.assign(args);
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
			this.log.error(
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

		this.element.innerHTML =
			typeof this.template == "function" ? this.template() : this.template;

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

//# sourceMappingURL=a7.components.js.map