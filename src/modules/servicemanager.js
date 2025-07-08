class ServiceManager extends Component {
	constructor() {
		super();
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
		service.setLog(this.app.log);
		service.setModel(this.app.model);
		service.setRemote(this.app.remote);
		// set the cache for the service

		service.config();
		this.app.log.trace(`Service registered: ${service.id}`);
	}
}
