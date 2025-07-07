class View extends Component {
	constructor(props) {
		super();
		this.type = "View";
		this.timeout;
		this.timer;
		this.element; // HTML element the view renders into
		this.props = props;
		this.log;
		this.model;
		this.ui;
		this.isTransient = props.isTransient || false;
		this.state = {};
		this.skipRender = false;
		this.children = {}; // Child views
		this.components = {}; // Register objects external to the framework so we can address them later
		this.config();
		this.fireEvent("mustRegister");
	}

	setLog(logger) {
		this.log = logger;
	}

	setModel(_model) {
		this.model = _model;
	}

	setUI(_ui) {
		this.ui = _ui;
	}

	config() {
		// this.on(
		// 	"mustRegister",
		// 	function () {
		// 		this.log.trace("mustRegister: " + this.props.id);
		// 		this.ui.register(this);
		// 		if (this.ui.getView(this.props.parentID)) {
		// 			this.ui.getView(this.props.parentID).addChild(this);
		// 		}
		// 	}.bind(this),
		// );
		// TODO: remove a7 references
		this.on(
			"mustRender",
			this.debounce(
				function () {
					this.renderer = this.model.get("a7").ui.renderer;
					this.log.trace("mustRender: " + this.props.id);
					if (this.shouldRender()) {
						this.ui.enqueueForRender(this.props.id);
					} else {
						this.log.trace("Render cancelled: " + this.props.id);
						this.skipRender = false;
					}
				}.bind(this),
			),
			18,
			//this.model.get("a7").ui.debounceTime,
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
						600000,
						//this.model.get("a7").ui.timeout,
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
				this.ui.unregister(this.props.id);
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
			// if there is no dataProvider, fire stateChanged here, otherwise wait for the dataProvider (see registerDataProvider())
			this.fireEvent("stateChanged", args);
		}

		this.fireEvent("mustRender");
	}

	getState() {
		if (this.dataProvider) {
			return this.dataProvider.getState();
		} else {
			return Object.assign(this.state);
		}
	}

	registerDataProvider(dp) {
		this.dataProvider = dp;
		// listen for the dataProvider to fire its stateChanged event, then fire
		this.dataProvider.on("stateChanged", (dataProvider, args) => {
			this.fireEvent("stateChanged", args);
		});
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
		return this.props.parentID
			? this.ui.getView(this.props.parentID)
			: undefined;
	}

	render() {
		this.log.trace("render: " + this.props.id);
		if (this.element === undefined || this.element === null) {
			this.element = document.querySelector(this.props.selector);
		}
		if (!this.element) {
			this.log.error(
				"The DOM element for view " +
					this.props.id +
					" was not found. The view will be removed and unregistered.",
			);
			if (this.props.parentID !== undefined) {
				this.ui.getView(this.props.parentID).removeChild(this);
			}
			this.fireEvent("mustUnregister");
			return;
		}

		this.element.innerHTML =
			typeof this.template == "function" ? this.template() : this.template;

		var eventArr = [];
		this.ui.getEvents().forEach(function (eve) {
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
			this.model.bind(ele.attributes["data-bind"].value, ele);
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
			this.ui.unregister(this.id);
		} else {
			if (this.isTransient) {
				this.timer = setTimeout(
					this.checkRenderStatus.bind(this),
					this.model.get("a7").ui.timeout,
				);
			}
		}
	}

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
	 * have elapsed since the last time the debounced function was invoked.
	 *
	 * @param {Function} func - The function to debounce.
	 * @param {number} wait - The number of milliseconds to delay.
	 * @param {boolean} [immediate=false] - Trigger the function on the leading edge, instead of the trailing.
	 * @return {Function} A new debounced function.
	 */
	debounce(func, wait, immediate = false) {
		let timeout;

		return function executedFunction() {
			// Save the context and arguments for later invocation
			const context = this;
			const args = arguments;

			// Define the function that will actually call `func`
			const later = function () {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};

			const callNow = immediate && !timeout;

			// Clear the previous timeout
			clearTimeout(timeout);

			// Set a new timeout
			timeout = setTimeout(later, wait);

			// If 'immediate' is true and this is the first time the function has been called,
			// execute it right away
			if (callNow) func.apply(context, args);
		};
	}
}
