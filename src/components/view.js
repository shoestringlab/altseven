class View extends Component {
	constructor(props) {
		super();
		this.renderer = a7.model.get("a7").ui.renderer;
		this.type = "View";
		this.timeout;
		this.timer;
		this.element; // HTML element the view renders into
		this.props = props;
		this.isTransient = props.isTransient || false;
		this.state = {};
		this.skipRender = false;
		this.children = {}; // Child views
		this.components = {}; // Register objects external to the framework so we can address them later
		this.config();
		this.fireEvent("mustRegister");
	}

	config() {
		this.on(
			"mustRegister",
			function () {
				a7.log.trace("mustRegister: " + this.props.id);
				a7.ui.register(this);
				if (a7.ui.getView(this.props.parentID)) {
					a7.ui.getView(this.props.parentID).addChild(this);
				}
			}.bind(this),
		);

		this.on(
			"mustRender",
			a7.util.debounce(
				function () {
					a7.log.trace("mustRender: " + this.props.id);
					if (this.shouldRender()) {
						a7.ui.enqueueForRender(this.props.id);
					} else {
						a7.log.trace("Render cancelled: " + this.props.id);
						this.skipRender = false;
					}
				}.bind(this),
			),
			a7.model.get("a7").ui.debounceTime,
			true,
		);

		this.on(
			"rendered",
			function () {
				if (this.isTransient) {
					if (this.timer !== undefined) {
						clearTimeout(this.timer);
					}
					this.timer = setTimeout(
						this.checkRenderStatus.bind(this),
						a7.model.get("a7").ui.timeout,
					);
				}
				this.onRendered();
			}.bind(this),
		);

		this.on(
			"registered",
			function () {
				if (this.props.parentID === undefined || this.mustRender) {
					this.fireEvent("mustRender");
				}
			}.bind(this),
		);

		this.on(
			"mustUnregister",
			function () {
				a7.ui.unregister(this.props.id);
			}.bind(this),
		);
	}

	// events = [
	// 	"mustRender",
	// 	"rendered",
	// 	"mustRegister",
	// 	"registered",
	// 	"mustUnregister",
	// ];

	setState(args) {
		if (this.dataProvider) {
			this.dataProvider.setState(args);
		} else {
			this.state = Object.assign(args);
		}
		// if (typeof this.state === "object") {
		// 	this.state = Object.assign(args);
		// } else {
		// 	this.dataProvider.setState(args);
		// }
		this.fireEvent("mustRender");
	}

	getState() {
		if (this.dataProvider) {
			return this.dataProvider.getState();
		} else {
			return Object.assign(this.state);
		}
		// if (typeof this.state === "object") {
		// 	return Object.assign(this.state);
		// } else {
		// 	return this.dataProvider.getState();
		// }
	}

	registerDataProvider(dp) {
		this.dataProvider = dp;
	}

	unregisterDataProvider() {
		this.dataProvider = null;
	}

	addChild(view) {
		this.children[view.props.id] = view;
	}

	removeChild(view) {
		delete this.children[view.props.id];
	}

	clearChildren() {
		this.children = {};
	}

	getParent() {
		return this.props.parentID ? a7.ui.getView(this.props.parentID) : undefined;
	}

	render() {
		a7.log.info("render: " + this.props.id);
		if (this.element === undefined || this.element === null) {
			this.element = document.querySelector(this.props.selector);
		}
		if (!this.element) {
			a7.log.error(
				"The DOM element for view " +
					this.props.id +
					" was not found. The view will be removed and unregistered.",
			);
			if (this.props.parentID !== undefined) {
				a7.ui.getView(this.props.parentID).removeChild(this);
			}
			this.fireEvent("mustUnregister");
			return;
		}

		this.element.innerHTML =
			typeof this.template == "function" ? this.template() : this.template;

		var eventArr = [];
		a7.ui.getEvents().forEach(function (eve) {
			eventArr.push("[data-on" + eve + "]");
		});
		var eles = this.element.querySelectorAll(eventArr.toString());

		eles.forEach(
			function (sel) {
				for (var ix = 0; ix < sel.attributes.length; ix++) {
					var attribute = sel.attributes[ix];
					if (attribute.name.startsWith("data-on")) {
						var event = attribute.name.substring(7, attribute.name.length);
						sel.addEventListener(
							event,
							this.eventHandlers[sel.attributes["data-on" + event].value],
						);
					}
				}
			}.bind(this),
		);

		let boundEles = this.element.querySelectorAll("[data-bind]");
		boundEles.forEach(function (ele) {
			a7.model.bind(ele.attributes["data-bind"].value, ele);
		});
		this.fireEvent("rendered");
	}

	shouldRender() {
		if (this.skipRender) {
			return false;
		} else {
			return true;
		}
	}

	onRendered() {
		for (var child in this.children) {
			this.children[child].element = document.querySelector(
				this.children[child].props.selector,
			);
			this.children[child].render();
		}
	}

	checkRenderStatus() {
		if (document.querySelector(this.props.selector) === null) {
			a7.ui.unregister(this.id);
		} else {
			if (this.isTransient) {
				this.timer = setTimeout(
					this.checkRenderStatus.bind(this),
					a7.model.get("a7").ui.timeout,
				);
			}
		}
	}
}
