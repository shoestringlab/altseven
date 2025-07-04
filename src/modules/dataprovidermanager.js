class DataProviderManager extends Component {
	constructor() {
		super();

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
		a7.log.info(`DataProvider "${dataprovider.id}" registered.`);
	}
}

// Usage example:
// const dataProviders = new DataProviders();
// dataProviders.init({ dataproviders: [dataProvider1, dataProvider2] });
