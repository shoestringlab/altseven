class Service extends Component {
	constructor(props) {
		super();
		this.id = props.id; // id of the service to register with the framework
		this.key = props.key; // name of the Object key
		this.remoteMethods = props.remoteMethods;
		this.dataProviders = new Map();
		this.entityClass = props.entityClass;
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
				// if (typeof item !== this.entityClass) {
				// 	throw "Must use the correct entity type for merge().";
				// }
				dataMap.set(item[this.key], item);
			}
		});

		this.set(dataMap);
		return dataMap;
	}

	async create(obj) {
		await a7.remote
			.invoke(this.remoteMethods.create, obj)
			.then((response) => response.json())
			.then((json) => {
				let entity = new this.entityClass(json);
				this.cacheSet(entity);
			});
		return entity;
	}

	async read(obj) {
		let dataMap = this.get();
		if (!dataMap.has(obj[this.key])) {
			//let entity = new this.entityClass(obj);
			await a7.remote
				.invoke(this.remoteMethods.read, obj)
				.then((response) => response.json())
				.then((json) => {
					this.cacheSet(new this.entityClass(json));
					dataMap = this.get();
				});
		}

		return dataMap.get(obj[this.key]);
	}

	async update(obj) {
		let entity = new this.entityClass(obj);
		await a7.remote
			.invoke(this.remoteMethods.update, entity)
			.then((response) => response.json())
			.then((json) => {
				entity = new this.entityClass(json);
				this.cacheSet(entity);
			});
		return entity;
	}

	async delete(obj) {
		let response = {};
		await a7.remote
			.invoke(this.remoteMethods.delete, obj)
			.then((response) => response.json())
			.then((json) => {
				this.cacheDelete(obj[this.key]);
				response = json;
			});
		return response;
	}

	async readAll(obj) {
		let dataMap = this.get();
		// read remote if there is nothing in the cache
		if (!dataMap.size) {
			await a7.remote
				.invoke(this.remoteMethods.readAll, obj)
				.then((response) => response.json())
				.then((json) => {
					let entities = [];
					for (let item in json) {
						entities.push(new this.entityClass(json[item]));
					}
					this.merge(entities);
				});
		}
		return this.get();
	}

	cacheDelete(id) {
		let dataMap = this.get();
		dataMap.delete(id);
		this.set(dataMap);
	}

	cacheSet(item) {
		let dataMap = this.get();
		dataMap.set(item[this.key], item);
		this.set(dataMap);
	}

	set(dataMap) {
		a7.model.set(this.id, dataMap);
	}

	get() {
		return a7.model.get(this.id);
	}

	// Retrieve items, using cache when possible
	async readMany(IDs) {
		// Compare requested IDs with cache
		const { present, missing } = this.compareIDs(IDs);

		// Fetch missing items if any

		if (missing.length > 0) {
			let obj = { id: missing };

			await a7.remote
				.invoke(this.remoteMethods.readMany, obj)
				.then((response) => response.json())
				.then((json) => {
					if (Array.isArray(json)) {
						let entities = [];
						for (let item in json) {
							entities.push(new this.entityClass(json[item]));
						}
						this.merge(entities);
					}
				});
		}

		// Get cached items
		const itemsMap = this.get();
		const cachedItems = present.map((id) => itemsMap.get(id));

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
		let itemsArray = items instanceof Map ? Array.from(items.values()) : items;

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
}
