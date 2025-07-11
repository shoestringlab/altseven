//import { Model } from "../components/model.js";

class ModelManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = this.app.options;
		this._model = null;
		this._methods = {};
		app.log.info("Model initializing... ");

		if (typeof this.options.model === "string") {
			switch (this.options.model) {
				case "altseven":
					this._model = Model;
					this._model.init(this.options, this.app.log);
					break;
				case "gadgetui":
					this._model = gadgetui.model;
					break;
			}
		} else if (typeof this.options.model === "object") {
			this._model = this.options.model;
		}

		app.log.trace("Model set: " + this._model);

		// gadgetui maps directly, so we can loop on the keys
		Object.keys(this._model).forEach((key) => {
			this._methods[key] = this._model[key];
		});
	}

	destroy(...args) {
		return this._methods["destroy"].apply(this._model, args);
	}

	get(...args) {
		return this._methods["get"].apply(this._model, args);
	}

	set(...args) {
		return this._methods["set"].apply(this._model, args);
	}

	exists(...args) {
		return this._methods["exists"].apply(this._model, args);
	}

	bind(...args) {
		return this._methods["bind"].apply(this._model, args);
	}

	undo(...args) {
		return this._methods["undo"].apply(this._model, args);
	}

	redo(...args) {
		return this._methods["redo"].apply(this._model, args);
	}

	rewind(...args) {
		return this._methods["rewind"].apply(this._model, args);
	}

	fastForward(...args) {
		return this._methods["fastForward"].apply(this._model, args);
	}
}

// Usage example:
// const modelManager = new ModelManager();
// modelManager.init({ model: 'altseven' }, () => { console.log('Model initialized'); });
