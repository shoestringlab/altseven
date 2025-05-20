class DataProvider extends Component {
	constructor(props) {
		super();
		this.schema = {};
		this.baseState = {};
		this.view = props.view;
		this.id = this.view.id + "-dataProvider";
		this.data = {};
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
	}

	register() {
		// Register with the view
		this.view.registerDataProvider(this);
		// Register with the services
		this.services.forEach((service) => {
			service.registerDataProvider(this);
		});
	}

	setData(args) {
		// Defaults to the built-in behavior of the View
		this.data = Object.assign(args);
	}

	getData() {
		return Object.assign(this.data);
	}
}
