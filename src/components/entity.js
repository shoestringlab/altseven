// Updated base Entity class to support inheritance with per-subclass static schemas
export class Entity extends Component {
	// Public static schema; subclasses will override this
	static schema = null;

	#data;

	constructor(props) {
		super();
		this.#data = {};
		// No longer set schema from props; it's static per class/subclass
		if (this.constructor.schema) {
			for (const [key, descriptor] of Object.entries(this.constructor.schema)) {
				this._defineProperty(key);
				this[key] = props[key]; // Setter will validate type/required
			}
			// Validate after properties are defined and set
			this.validate();
		}

		const idField = Object.keys(this.constructor.schema).find(
			(key) => this.constructor.schema[key].id === true,
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

	// Instance getter to access the class-level schema
	get schema() {
		return this.constructor.schema;
	}

	_defineProperty(key) {
		const propertyName = `_${key}`;
		this.#data[propertyName] = undefined;

		Object.defineProperty(this, key, {
			get: function () {
				return this.#data[propertyName];
			},
			set: function (value) {
				const schemaDescriptor = this.constructor.schema[key];

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

	validate() {
		for (let field in this.constructor.schema) {
			const propertyName = `_${field}`;
			if (
				this.constructor.schema[field].required &&
				this.#data[propertyName] === undefined
			) {
				throw new Error(`Field ${field} is required`);
			}
			if (
				this.constructor.schema[field].type &&
				this.#data[propertyName] &&
				!this._isOfType(
					this.#data[propertyName],
					this.constructor.schema[field].type,
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
		for (const [key, value] of Object.entries(this.#data)) {
			flatObject[key.replace(/^_/, "")] = value;
		}
		return flatObject;
	}

	/**
	 * Update the entity instance with values from a flat object
	 * @param {Object} obj - Flat object containing property values
	 */
	fromFlatObject(obj) {
		if (!obj || typeof obj !== "object") {
			throw new Error("Invalid input: expected an object");
		}

		for (const [key, value] of Object.entries(obj)) {
			// Only update properties that exist in the schema
			if (this.constructor.schema && this.constructor.schema[key]) {
				// Validate the value against the schema before setting it
				const schemaDescriptor = this.constructor.schema[key];

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

				this[key] = value;
			}
		}

		return this;
	}
}
