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
