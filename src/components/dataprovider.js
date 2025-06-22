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
				let dependencies = this.binding[rule].dependencies || null;
				let matchingService = [...this.services.values()].find(
					(service) => service.entityClass === this.binding[rule].entityClass,
				);
				if (matchingService) {
					a7.log.trace("Binding: ", rule);
					let filter = this.binding[rule].filter || null;
					let func = this.binding[rule].func || null;
					let sort = this.binding[rule].sort || null;
					let id = this.binding[rule].id || null;
					this.bindings.set(rule, {
						key: rule,
						service: matchingService,
						filter: filter,
						sort: sort,
						func: func,
						dependencies: dependencies,
						id: id,
					});

					matchingService.bind(rule, filter);

					let boundData = this.getBoundData(this.bindings.get(rule));

					this.setStateOnly({ [rule]: boundData });

					//Listen for changes in the service cache
					matchingService.on("cacheChanged", (service, args) => {
						//pass in the DP state
						args.state = this.getState();
						this.updateBoundState(this.bindings.get(rule), args);
					});
				}

				dependencies = this.binding[rule].dependencies || [];
				dependencies.forEach((depKey) => {
					let key = depKey.split(".");
					if (key.length === 1) {
						this.on("stateChanged", (dataProvider, props) => {
							a7.log.trace("Binding dependency");
							if ([key] in props) {
								a7.log.trace("updated " + key);
								this.updateBoundState(this.bindings.get(rule), {
									action: "refresh",
									state: this.getState(),
								});
							}
							//	this.updateBoundState(this.bindings.get(rule), { action: "refresh" });
						});
					} else if (key.length === 2) {
						// if the dependency is on another view, the dependency will be listed as ${viewID}.key.
						a7.ui.getView(key[0]).on("stateChanged", (view, props) => {
							a7.log.trace("Binding dependency");
							if ([key[1]] in props) {
								a7.log.trace("updated " + key[1]);
								this.updateBoundState(this.bindings.get(rule), {
									action: "refresh",
									state: this.getState(),
									dependentState: view.getState(),
								});
							}
						});
					}
				});
			}
		}
	}

	getBoundData(binding) {
		let updatedData;

		let type = this.#schema[binding.key].type;
		if (type === "object") {
			updatedData = binding.service.get(binding.id);
		} else if (type === "map") {
			updatedData = binding.service.get();
			if (binding.filter !== null) {
				updatedData = binding.service.filter(updatedData, binding.filter);
			}

			if (binding.sort !== null) {
				updatedData = binding.service.sort(updatedData, binding.sort);
			}
		}

		return updatedData;
	}

	async updateBoundState(binding, args) {
		let updatedData;
		if (binding.func !== null) {
			// pass the filter to the func
			args = Object.assign(args, {
				filter: binding.filter,
				sort: binding.sort,
			});
			if (binding.func.constructor.name === "AsyncFunction") {
				updatedData = await binding.func(args);
			} else {
				updatedData = binding.func(args);
			}
			//let type = binding.entityClass.type;
			let type = this.#schema[binding.key].type;
			if (type === "map" && Array.isArray(updatedData)) {
				updatedData = binding.service.convertArrayToMap(updatedData);
			}

			this.view.setState({ [binding.key]: updatedData });
		} else {
			let updatedData = this.getBoundData(binding);

			this.view.setState({ [binding.key]: updatedData });
		}
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
