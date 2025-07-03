class DataProviderManager extends Component {
	constructor(app) {
		super();
		this.app = app;

		this._dataproviders = new Map();
		this.app.log.info("DataProviderManager initialized...");
	}

	getDataProvider(id) {
		return this._dataproviders.get(id);
	}

	getAll() {
		return this._dataproviders;
	}

	register(dataprovider) {
		this._dataproviders.set(dataprovider.id, dataprovider);
		this.app.log.info(`DataProvider "${dataprovider.id}" registered.`);
	}
}

// Usage example:
// const dataProviders = new DataProviders();
// dataProviders.init({ dataproviders: [dataProvider1, dataProvider2] });
