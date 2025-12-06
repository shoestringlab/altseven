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
