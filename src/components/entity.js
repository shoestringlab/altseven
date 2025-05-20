class Entity extends Component {
	constructor(props) {
		super();
		for (item in props) {
			this[item] = props[item];
		}
	}

	validate() {
		for (field in this.schema) {
			if (field.required && !this[field]) {
				throw new Error(`Field ${field} is required`);
			}
			if (field.type && typeof this[field] !== field.type) {
				throw new Error(`Field ${field} must be of type ${field.type}`);
			}
		}
		return true;
	}
}
