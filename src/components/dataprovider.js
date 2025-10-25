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
