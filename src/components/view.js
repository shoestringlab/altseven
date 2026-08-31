export class View extends Component {
	constructor(props) {
		super();
		this.type = "View";
		this.timeout = 600000;
		this.renderer = "templateLiterals";
		this.debounceTime = 18;
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
		this.templateCache = null;
		// Opt-in per-view caching. Default false: forgetting it costs perf, not correctness.
		this.cacheTemplate = props.cacheTemplate ?? false;
		// Has this view ever painted? Used by render() to tell "my mount point
		// does not exist YET" from "my mount point is gone". See render().
		this.hasRendered = false;
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
	// set these values on registration
	setRenderer(renderer) {
		this.renderer = renderer;
	}
	setTimeout(timeout) {
		this.timeout = timeout;
	}
	setDebounce(debounce) {
		this.debounce = debounce;
	}
	setDebounceTime(debounceTime) {
		this.debounceTime = debounceTime;
	}

	setCacheTemplate(enabled) {
		this.cacheTemplate = !!enabled;
	}

	config() {
		// mustRender: template inputs may have changed. Always re-evaluates the template.
		this.on(
			"mustRender",
			this.debounce(
				function () {
					this.log.trace("mustRender: " + this.props.id);
					this.templateCache = null;
					if (this.shouldRender()) {
						this.ui.enqueueForRender(this.props.id);
					} else {
						this.log.trace("Render cancelled: " + this.props.id);
						this.skipRender = false;
					}
				}.bind(this),
				this.debounceTime,
			),
		);

		// mayRender: repaint, may use cached template if the view opted in.
		// Use when you know the template output hasn't changed (e.g. re-attach
		// after a parent re-render).
		this.on(
			"mayRender",
			this.debounce(
				function () {
					this.log.trace("mayRender: " + this.props.id);
					if (this.shouldRender()) {
						this.ui.enqueueForRender(this.props.id);
					} else {
						this.log.trace("Render cancelled: " + this.props.id);
						this.skipRender = false;
					}
				}.bind(this),
				this.debounceTime,
			),
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
						this.timeout,
					);
				}
				this.onRendered();
			}.bind(this),
		);

		this.on(
			"registered",
			function () {
				if (this.props.parentID === undefined) {
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

	setState(args) {
		// blank the template cache so the view re-renders
		this.templateCache = null;
		if (this.dataProvider) {
			this.dataProvider.setState(args);
			this.log.debug("setState using dataProvider for ", this.props.id);
		} else {
			this.log.debug("setState for ", this.props.id);
			this.state = Object.assign(this.state, args);
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
			// A missing mount point means one of two very different things, and
			// treating them alike destroys working views.
			//
			// A CHILD view renders into a node that its PARENT's template
			// creates, so before the parent has painted even once that node does
			// not exist yet. That is not an error — it is just ordering. It
			// happens whenever something renders the child on its own before the
			// parent's first paint: a child whose setState is driven by an async
			// load (a fetch resolving in ~25ms) races the parent's debounced
			// first render, and which one wins depends on how much other work
			// the app happens to be doing. Unregistering there is silent and
			// permanent: the view is dropped from its parent's children and from
			// the UI manager, and nothing re-creates it, so a component that is
			// merely early disappears for the life of the page.
			//
			// So: if the parent exists and has not painted yet, keep the view
			// registered and do nothing. The parent's onRendered() re-binds and
			// renders every child, so this view paints as soon as its mount
			// point actually exists.
			//
			// Once the parent HAS painted, a still-missing selector is a real
			// misconfiguration (the parent's template does not contain the
			// node), and the original behaviour applies. Keying on the parent's
			// paint rather than retrying is what keeps this loop-free.
			const parent =
				this.props.parentID !== undefined
					? this.ui.getView(this.props.parentID)
					: undefined;

			if (parent && !parent.hasRendered) {
				this.log.trace(
					"Deferring render of child view " +
						this.props.id +
						": parent " +
						this.props.parentID +
						" has not rendered yet, so its mount point does not exist.",
				);
				return;
			}

			this.log.trace(
				"The DOM element for view " +
					this.props.id +
					" was not found. The view will be removed and unregistered.",
			);
			if (parent) {
				parent.removeChild(this);
			}
			this.fireEvent("mustUnregister");
			return;
		}

		let content = "";
		let cacheEnabled = this.cacheTemplate && this.ui.options.ui.cacheTemplates;
		if (this.templateCache !== null && cacheEnabled) {
			content = this.templateCache;
			this.log.debug("Using cached template for view " + this.props.id);
		} else {
			this.log.debug("Rendering template for view " + this.props.id);
			content =
				typeof this.template == "function" ? this.template() : this.template;
			// Only retain the cache if this view opted in. Otherwise null it so a
			// stale cache can never be served if cacheTemplate is toggled later.
			this.templateCache = cacheEnabled ? content : null;
		}
		this.element.innerHTML = content;
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
		this.log.trace("Rendered: " + this.props.id);
		// Set BEFORE firing "rendered": that fires onRendered(), which renders
		// this view's children, and each of them tests this flag to decide
		// whether a missing mount point is "not yet" or "gone". Setting it
		// afterwards would make every child defer on its parent's first paint —
		// exactly the case this flag exists to let through.
		this.hasRendered = true;
		this.skipRender = true;
		try {
			this.fireEvent("rendered");
		} catch (err) {
			this.log.error("Error in rendered callback for view " + this.props.id + ": " + err);
		} finally {
			this.skipRender = false;
		}
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
					this.timeout,
				);
			}
		}
	}
}
