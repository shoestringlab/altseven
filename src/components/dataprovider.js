class DataProvider extends Component {
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
		this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		// Config setup
		// Get the services registered in the app
		this.services = a7.services.getAll();
		this.on("mustRegister", () => {
			this.register();
		});
		// bind to data
		this.bind();
	}

	register() {
		// Register with the services
		this.services.forEach((service) => {
			service.registerDataProvider(this);
		});
	}

	bind() {
		if (this.binding) {
			for (let rule in this.binding) {
				let matchingService = [...this.services.values()].find(
					(service) => service.entityClass === this.binding[rule].entityClass,
				);
				if (matchingService) {
					a7.log.trace("Binding: ", rule);
					let filter = this.binding[rule].filter || null;
					let func = this.binding[rule].func || null;
					let dependencies = this.binding[rule].dependencies || null;
					this.bindings.set(rule, {
						key: rule,
						service: matchingService,
						filter: filter,
						func: func,
						dependencies: dependencies,
					});

					matchingService.bind(rule, filter);

					let data = matchingService.get();

					if (filter !== null) {
						data = matchingService.filter(data, filter);
					}

					this.setStateOnly({ [rule]: data });

					//Listen for changes in the service cache
					matchingService.on("cacheChanged", (service, args) => {
						this.updateBoundState(this.bindings.get(rule), args);
					});
				}
			}
		}
	}

	async updateBoundState(binding, args) {
		let updatedData;
		if (binding.func !== null) {
			// pass the filter to the func
			args = Object.assign(args, { filter: binding.filter });
			if (binding.func.constructor.name === "AsyncFunction") {
				updatedData = await binding.func(args, this.getState());
			} else {
				updatedData = binding.func(args, this.getState());
			}
			//let type = binding.entityClass.type;
			let type = this.#schema[binding.key].type;
			if (type === "map" && Array.isArray(updatedData)) {
				updatedData = binding.service.convertArrayToMap(updatedData);
			}

			this.view.setState({ [binding.key]: updatedData });
		} else {
			updatedData = binding.service.get();
			if (binding.filter !== null) {
				updatedData = this.filter(updatedData, binding.filter);
			}
			let type = this.#schema[binding.key].type;

			// for object types
			if (type === "object") {
				updatedData = Array.from(updatedData.values());
				updatedData = updatedData[0];
			}
			this.view.setState({ [binding.key]: updatedData });
		}
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
		let bindingsUpdated = new Map();
		// check if the updated keys are dependencies for bound keys
		for (let key in args) {
			this.bindings.forEach((binding) => {
				if (
					binding.dependencies !== null &&
					binding.dependencies.includes(key)
				) {
					if (!bindingsUpdated.has(binding)) {
						this.updateBoundState(binding, { action: "refresh" });
						bindingsUpdated.set(binding, "");
					}
				}
			});
		}
	}

	getState() {
		return Object.assign({}, this.#state);
	}
}
