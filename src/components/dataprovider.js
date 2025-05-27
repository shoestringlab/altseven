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
				if (this.binding[rule].filter) {
					// bind the filter
					console.log("Binding: ", rule);

					// console.dir(rule);
					console.dir(this.binding[rule]);
					console.dir(this.#schema[rule]);
				}
			}
		}
	}

	get schema() {
		return this.#schema;
	}

	setState(args) {
		// Defaults to the built-in behavior of the View
		this.#state = Object.assign(args);
	}

	getState() {
		return Object.assign(this.#state);
	}
}
