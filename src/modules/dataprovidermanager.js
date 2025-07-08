class DataProviderManager extends Component {
	constructor() {
		super();
		this.app = app;
		this.services = this.app.services.getAll();
		this._dataproviders = new Map();
		a7.log.info("DataProviderManager initialized...");
	}

	getDataProvider(id) {
		return this._dataproviders.get(id);
	}

	getAll() {
		return this._dataproviders;
	}

	register(dataprovider) {
		this._dataproviders.set(dataprovider.id, dataprovider);
		this.bind(dataprovider);
		this.services.forEach((service) => {
			service.registerDataProvider(dataprovider);
		});

		this.app.log.info(`DataProvider "${dataprovider.id}" registered.`);
	}

	bind(dp) {
		if (dp.binding) {
			for (let rule in dp.binding) {
				let dependencies = dp.binding[rule].dependencies || null;
				let matchingService = [...this.services.values()].find(
					(service) => service.entityClass === dp.binding[rule].entityClass,
				);
				if (matchingService) {
					this.app.log.trace("Binding: ", rule);
					let filter = dp.binding[rule].filter || null;
					let func = dp.binding[rule].func || null;
					let sort = dp.binding[rule].sort || null;
					let id = dp.binding[rule].id || null;
					dp.bindings.set(rule, {
						key: rule,
						service: matchingService,
						filter: filter,
						sort: sort,
						func: func,
						dependencies: dependencies,
						id: id,
					});

					matchingService.bind(rule, filter);

					let boundData = this.getBoundData(dp, dp.bindings.get(rule));

					dp.setStateOnly({ [rule]: boundData });

					//Listen for changes in the service cache
					matchingService.on("cacheChanged", (service, args) => {
						//pass in the DP state
						args.state = dp.getState();
						this.updateBoundState(dp, dp.bindings.get(rule), args);
					});
				}

				dependencies = dp.binding[rule].dependencies || [];
				dependencies.forEach((depKey) => {
					let key = depKey.split(".");
					if (key.length === 1) {
						dp.on("stateChanged", (dataProvider, props) => {
							this.app.log.trace("Binding dependency");
							if ([key] in props) {
								this.app.log.trace("updated " + key);
								this.updateBoundState(dp, dp.bindings.get(rule), {
									action: "refresh",
									state: dp.getState(),
								});
							}
							//	this.updateBoundState(this.bindings.get(rule), { action: "refresh" });
						});
					} else if (key.length === 2) {
						// if the dependency is on another view, the dependency will be listed as ${viewID}.key.
						this.app.ui.getView(key[0]).on("stateChanged", (view, props) => {
							this.app.log.trace("Binding dependency");
							if ([key[1]] in props) {
								this.app.log.trace("updated " + key[1]);
								this.updateBoundState(dp, dp.bindings.get(rule), {
									action: "refresh",
									state: dp.getState(),
									dependentState: view.getState(),
								});
							}
						});
					}
				});
			}
		}
	}

	getBoundData(dp, binding) {
		let updatedData;

		let type = dp.schema[binding.key].type;
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

	async updateBoundState(dp, binding, args) {
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
			let type = dp.schema[binding.key].type;
			if (type === "map" && Array.isArray(updatedData)) {
				updatedData = binding.service.convertArrayToMap(updatedData);
			}

			dp.view.setState({ [binding.key]: updatedData });
		} else {
			let updatedData = this.getBoundData(dp, binding);

			dp.view.setState({ [binding.key]: updatedData });
		}
	}
}

// Usage example:
// const dataProviders = new DataProviders();
// dataProviders.init({ dataproviders: [dataProvider1, dataProvider2] });
