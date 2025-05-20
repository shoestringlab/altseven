class Component {
	constructor() {
		this.events = {};
	}

	// event bindings
	on(event, func) {
		if (this.events[event] === undefined) {
			this.events[event] = [];
		}
		this.events[event].push(func);
		return this;
	}

	off(event) {
		// Clear listeners
		this.events[event] = [];
		return this;
	}

	fireEvent(key, args) {
		if (this.events[key] !== undefined) {
			this.events[key].forEach((func) => {
				func(this, args);
			});
		}
	}

	getAll() {
		return [
			{ name: "on", func: this.on },
			{ name: "off", func: this.off },
			{ name: "fireEvent", func: this.fireEvent },
		];
	}
}
