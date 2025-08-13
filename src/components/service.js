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
			const key = this.getCompositeKey(item);
			if (key) {
				dataMap.set(key, this.format(item));
			}
		});

		this.set(dataMap);

		this.fireEvent("cacheChanged", { action: "refresh" });
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
		let entityInstance =
			obj instanceof this.entityClass ? obj : this.format(obj);

		await this.remote
			.invoke(this.remoteMethods.create, entityInstance)
			.then((response) => response.json())
			.then((json) => {
				entityInstance.fromFlatObject(json);
				this.cacheSet(entityInstance);
			});
		return entityInstance;
	}

	async read(obj) {
		let dataMap = this.get();
		let compositeKey = "-";
		const requestKey = `${this.remoteMethods.read}-${JSON.stringify(obj)}`;
		if (this.queue.has(requestKey)) {
			this.log.trace("Duplicate read request detected, cancelling new request");
			//return this.queue.get(requestKey);
		} else {
			// Get the composite key for the object
			compositeKey = this.getCompositeKey(obj);
			if (!dataMap.has(compositeKey)) {
				let entityInstance =
					obj instanceof this.entityClass ? obj : this.format(obj);

				await this.remote
					.invoke(this.remoteMethods.read, entityInstance)
					.then((response) => response.json())
					.then((json) => {
						// set the entity instance from the json response
						entityInstance.fromFlatObject(json);
					});
				this.cacheSet(this.format(entityInstance));
				this.queue.delete(requestKey);
				dataMap = this.get();
			}
		}

		return dataMap.get(compositeKey);
	}

	async update(obj) {
		let entityInstance =
			obj instanceof this.entityClass ? obj : this.format(obj);

		await this.remote
			.invoke(this.remoteMethods.update, entityInstance)
			.then((response) => response.json())
			.then((json) => {
				entityInstance.fromFlatObject(json);
				this.cacheSet(entityInstance);
			});
		return entityInstance;
	}

	async delete(obj) {
		let returnVal = {};
		let entityInstance =
			obj instanceof this.entityClass ? obj : this.format(obj);
		await this.remote
			.invoke(this.remoteMethods.delete, entityInstance)
			.then((response) => response.json())
			.then((json) => {
				// nothing to do here
				returnVal = json;
			});
		const compositeKey = this.getCompositeKey(entityInstance);
		this.cacheDelete(compositeKey);
		return returnVal; // return the response from the remote call
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

		const methodConfig = this.remoteMethods[methodName];
		if (!methodConfig) {
			throw new Error(`Method ${methodName} not found in remoteMethods`);
		}

		if (options?.checkCache) {
			let item, map;
			let dataMap = this.get();

			let data =
				typeof options.filter !== "undefined" &&
				Object.keys(options.filter).length === 0
					? dataMap
					: this.filter(dataMap, options.filter);
			if (data.length > 0) {
				this.log.trace("Cache hit for method", methodName);
				return this.formatData(data, options.returnType);
			}
		}

		// Call the remote method
		const response = await this.remote.invoke(methodConfig, params);

		// Parse the JSON response
		const json = await response.json();

		// Check if we should merge the results into cache
		if (options.merge) {
			// If it's an array of objects, treat them as entities and merge
			if (Array.isArray(json) && json.length > 0) {
				this.merge(json);
			} else if (typeof json === "object" && json !== null) {
				this.merge([json]);
			}
			return this.formatData(json, options.returnType);
		}

		// Otherwise return the raw response
		return json;
	}

	format(obj) {
		return new this.entityClass(obj);
	}

	formatData(data, returnType) {
		let map = new Map(),
			array = [];

		if (typeof data === "object" && !Array.isArray(data) && data !== null) {
			return this.format(data);
		}
		if (returnType === "object" && data.length === 1) {
			let item = data[0];
			return item instanceof this.entityClass ? item : this.format(item);
		}

		data.forEach((item, index) => {
			// Transform the item and update the original array or create a new one
			data[index] = item instanceof this.entityClass ? item : this.format(item);

			if (returnType === "Map") {
				map.set(data[index].id, data[index]);
			}
			if (returnType === "Array") {
				array.push(data[index]);
			}
		});

		if (returnType === "Map") {
			return map;
		} else if (returnType === "Array") {
			return array;
		}
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
			const compositeKey = this.getCompositeKey(item);
			if (!compositeKey) {
				throw new Error("Cannot cache item: no valid ID fields found");
			}
			let dataMap = this.get();
			dataMap.set(compositeKey, item);
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
		return this.getMappedItems(IDs);
	}

	getMappedItems(IDs) {
		// Return all requested items in order, filtering out nulls
		const result = IDs.map((id) => {
			const item = this.get(id);
			return item || null; // Return null for items that couldn't be found
		});
		return result.filter((item) => item !== null);
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
