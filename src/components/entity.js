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
