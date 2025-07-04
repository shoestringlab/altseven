class UIManager extends Component {
	constructor(options) {
		super();
		this.options = options;
		this.events = [];
		this.selectors = {};
		this.nodes = {};
		this.queue = [];
		this.deferred = [];
		this.stateTransition = false;
		this.views = [];
		a7.log.trace("Layout initializing...");

		let eventGroups = this.options.ui.eventGroups
			? this.options.ui.eventGroups
			: "standard";

		switch (eventGroups) {
			case "extended":
				reject("Extended events are not implemented yet.");
			case "standard":
				this.events = _standardEvents;
				break;
			default:
				this.options.ui.eventGroups.forEach((group) =>
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
		a7.log.trace("a7.ui.stateTransition: " + val);
	}

	getStateTransition() {
		return this.stateTransition;
	}

	getEvents() {
		return this.events;
	}

	register(view) {
		switch (this.options.ui.renderer) {
			case "Handlebars":
			case "Mustache":
			case "templateLiterals":
				this.views[view.props.id] = view;
				view.fireEvent("registered");
				break;
		}
	}

	unregister(id) {
		delete this.views[id];
	}

	getParentViewIds(id) {
		a7.log.trace("Find parents of " + id);
		let parentIds = [];
		let view = this.views[id];
		while (view.props.parentID !== undefined) {
			parentIds.unshift(view.props.parentID);
			view = this.views[view.props.parentID];
		}
		return parentIds;
	}

	getChildViewIds(id) {
		a7.log.trace("Find children of " + id);
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
			a7.log.trace("enqueue: " + id);
			if (!this.queue.length) {
				a7.log.trace("add first view to queue: " + id);
				this.queue.push(id);
				this.processRenderQueue();
			} else {
				let childIds = this.getChildViewIds(id);
				if (this.views[id].props.parentID === undefined) {
					a7.log.trace("add to front of queue: " + id);
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
						a7.log.trace("add to end of queue: " + id);
						this.queue.push(id);
					}
				}

				childIds.forEach((childId) => {
					if (this.queue.indexOf(childId) >= 0) {
						a7.log.trace("remove child from queue: " + childId);
						this.queue.splice(this.queue.indexOf(childId), 1);
					}
				});
			}
		} else {
			this.deferred.push(id);
		}
	}

	processRenderQueue() {
		a7.log.trace("processing the queue");
		this.setStateTransition(true);
		try {
			this.queue.forEach((id) => this.views[id].render());
		} catch (err) {
			a7.log.trace(err);
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
