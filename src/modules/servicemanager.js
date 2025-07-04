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
	}
}
