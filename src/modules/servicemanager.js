class ServiceManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.services = new Map();
	}

	getService(id) {
		return this.services.get(id);
	}

	getAll() {
		return this.services;
	}

	register(service) {
		this.services.set(service.id, service);
		// set the log for the service
		service.log = this.app.log;
		service.model = this.app.model;
		service.remote = this.app.remote;
		this.app.log.trace(`Service registered: ${service.id}`);
	}
}
