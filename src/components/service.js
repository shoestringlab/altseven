class Service extends Component {
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

		this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		let dataMap = this.get();
		if (!dataMap || !(dataMap instanceof Map)) {
			this.set(new Map());
		}
		// TODO: remove a7 references
		// this.on("mustRegister", () => {
		// 	this.log.trace("mustRegister: Service: " + this.id);
		// 	a7.services.register(this);
		// });
	}

	set log(log) {
		this.log = log;
	}

	set model(model) {
		this.model = model;
	}

	set remote(remote) {
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
			(!obj) instanceof this.entityClass ? this.format(obj) : obj;

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
		let entityInstance = this.format(obj);
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
