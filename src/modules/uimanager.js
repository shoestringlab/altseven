class UIManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.events = [];
		this.selectors = {};
		this.nodes = {};
		this.queue = [];
		this.deferred = [];
		this.stateTransition = false;
		this.views = [];
		this.app.log.trace("Layout initializing...");

		let eventGroups = this.app.options.ui.eventGroups
			? this.app.options.ui.eventGroups
			: "standard";

		switch (eventGroups) {
			case "extended":
				reject("Extended events are not implemented yet.");
			case "standard":
				this.events = _standardEvents;
				break;
			default:
				this.app.options.ui.eventGroups.forEach((group) =>
					this.events.concat(group),
				);
		}
	}

	setSelector(name, selector) {
		this.selectors[name] = selector;
		this.nodes[name] = document.querySelector(selector);
	}

	getSelector(name) {
		return this.selectors[name];
	}

	getNode(name) {
		return this.nodes[name];
	}

	setStateTransition(val) {
		this.stateTransition = val;
		this.app.log.trace("this.app.ui.stateTransition: " + val);
	}

	getStateTransition() {
		return this.stateTransition;
	}

	getEvents() {
		return this.events;
	}

	register(view) {
		switch (this.app.options.ui.renderer) {
			case "Handlebars":
			case "Mustache":
			case "templateLiterals":
				view.log = this.app.log;
				view.model = this.app.model;
				view.ui = this.app.ui;
				this.views[view.props.id] = view;
				// register as a child of the parent
				if (this.getView(view.props.parentID)) {
					this.getView(view.props.parentID).addChild(view);
				}
				view.fireEvent("registered");
				break;
		}
	}

	unregister(id) {
		delete this.views[id];
	}

	getParentViewIds(id) {
		this.app.log.trace("Find parents of " + id);
		let parentIds = [];
		let view = this.views[id];
		while (view.props.parentID !== undefined) {
			parentIds.unshift(view.props.parentID);
			view = this.views[view.props.parentID];
		}
		return parentIds;
	}

	getChildViewIds(id) {
		this.app.log.trace("Find children of " + id);
		let childIds = [];
		let view = this.views[id];

		for (let child in view.children) {
			let childId = view.children[child].props.id;
			if (this.getView(childId) !== undefined) {
				childIds.push(childId);
				childIds.concat(this.getChildViewIds(childId));
			}
		}
		return childIds;
	}

	enqueueForRender(id) {
		if (!this.getStateTransition()) {
			this.app.log.trace("enqueue: " + id);
			if (!this.queue.length) {
				this.app.log.trace("add first view to queue: " + id);
				this.queue.push(id);
				this.processRenderQueue();
			} else {
				let childIds = this.getChildViewIds(id);
				if (this.views[id].props.parentID === undefined) {
					this.app.log.trace("add to front of queue: " + id);
					this.queue.unshift(id);
				} else {
					let parentIds = this.getParentViewIds(id);

					let highParent = undefined;
					if (parentIds.length) {
						highParent = parentIds.find(
							(parentId) => this.queue.indexOf(parentId) >= 0,
						);
					}

					if (highParent === undefined) {
						this.app.log.trace("add to end of queue: " + id);
						this.queue.push(id);
					}
				}

				childIds.forEach((childId) => {
					if (this.queue.indexOf(childId) >= 0) {
						this.app.log.trace("remove child from queue: " + childId);
						this.queue.splice(this.queue.indexOf(childId), 1);
					}
				});
			}
		} else {
			this.deferred.push(id);
		}
	}

	processRenderQueue() {
		this.app.log.trace("processing the queue");
		this.setStateTransition(true);
		try {
			this.queue.forEach((id) => this.views[id].render());
		} catch (err) {
			this.app.log.trace(err);
		}
		this.queue = [];
		this.setStateTransition(false);
		this.deferred.forEach((id) => this.enqueueForRender(id));
		this.deferred = [];
	}

	removeView(id) {
		delete this.views[id];
	}
}

// Usage example:
// const uiManager = new UIManager();
// uiManager.init(() => { console.log('UI Manager initialized'); }, (error) => { console.error('Failed to initialize UI Manager:', error); });
