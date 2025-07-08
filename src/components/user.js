export class User extends Component {
	constructor(args) {
		super();
		// Initialize the User object with provided arguments
		Object.assign(this, args);
	}

	getMemento() {
		const user = {};
		const self = this;
		Object.keys(this).forEach((key) => {
			user[key] = self[key];
		});
		return user;
	}
}
