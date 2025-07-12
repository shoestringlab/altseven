class UIManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		this.events = [];
		this.selectors = {};
		this.nodes = {};
		this.queue = [];
		this.deferred = [];
		this.stateTransition = false;
		this.views = [];
		app.log.trace("Layout initializing...");

		let eventGroups = this.options.ui.eventGroups
			? this.options.ui.eventGroups
			: "standard";

		this.config();

		switch (eventGroups) {
			case "extended":
				break;
			//	reject("Extended events are not implemented yet.");
			case "standard":
				this.events = this.standardEvents;
				break;
			default:
				this.options.ui.eventGroups.forEach((group) =>
					this.events.concat(group),
				);
		}
	}

	config() {
		// browser events that can be used in templating, e.g. data-click will be added to the resulting HTML as a click event handler
		const resourceEvents = ["cached", "error", "abort", "load", "beforeunload"];

		const networkEvents = ["online", "offline"];

		const focusEvents = ["focus", "blur"];

		const websocketEvents = ["open", "message", "error", "close"];

		const sessionHistoryEvents = ["pagehide", "pageshow", "popstate"];

		const cssAnimationEvents = [
			"animationstart",
			"animationend",
			"animationiteration",
		];

		const cssTransitionEvents = [
			"transitionstart",
			"transitioncancel",
			"transitionend",
			"transitionrun",
		];

		const formEvents = ["reset", "submit"];

		const printingEvents = ["beforeprint", "afterprint"];

		const textCompositionEvents = [
			"compositionstart",
			"compositionupdate",
			"compositionend",
		];

		const viewEvents = [
			"fullscreenchange",
			"fullscreenerror",
			"resize",
			"scroll",
		];

		const clipboardEvents = ["cut", "copy", "paste"];

		const keyboardEvents = ["keydown", "keypress", "keyup"];

		const mouseEvents = [
			"auxclick",
			"click",
			"contextmenu",
			"dblclick",
			"mousedown",
			"mousenter",
			"mouseleave",
			"mousemove",
			"mouseover",
			"mouseout",
			"mouseup",
			"pointerlockchange",
			"pointerlockerror",
			"wheel",
		];

		const dragEvents = [
			"drag",
			"dragend",
			"dragstart",
			"dragleave",
			"dragover",
			"drop",
		];

		const mediaEvents = [
			"audioprocess",
			"canplay",
			"canplaythrough",
			"complete",
			"durationchange",
			"emptied",
			"ended",
			"loadeddata",
			"loadedmetadata",
			"pause",
			"play",
			"playing",
			"ratechange",
			"seeked",
			"seeking",
			"stalled",
			"suspend",
			"timeupdate",
			"columechange",
			"waiting",
		];

		const progressEvents = [
			// duplicates from resource events
			/* 'abort',
		'error',
		'load', */
			"loadend",
			"loadstart",
			"progress",
			"timeout",
		];

		const storageEvents = ["change", "storage"];

		const updateEvents = [
			"checking",
			"downloading",
			/* 'error', */
			"noupdate",
			"obsolete",
			"updateready",
		];

		const valueChangeEvents = [
			"broadcast",
			"CheckBoxStateChange",
			"hashchange",
			"input",
			"RadioStateChange",
			"readystatechange",
			"ValueChange",
		];

		const uncategorizedEvents = [
			"invalid",
			"localized",
			/* 'message',
		'open', */
			"show",
		];

		this.standardEvents = resourceEvents
			.concat(networkEvents)
			.concat(focusEvents)
			.concat(websocketEvents)
			.concat(sessionHistoryEvents)
			.concat(cssAnimationEvents)
			.concat(cssTransitionEvents)
			.concat(formEvents)
			.concat(printingEvents)
			.concat(textCompositionEvents)
			.concat(viewEvents)
			.concat(clipboardEvents)
			.concat(keyboardEvents)
			.concat(mouseEvents)
			.concat(dragEvents)
			.concat(mediaEvents)
			.concat(progressEvents)
			.concat(storageEvents)
			.concat(updateEvents)
			.concat(valueChangeEvents)
			.concat(uncategorizedEvents);
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

	getView(id) {
		return this.views[id];
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
		switch (this.options.ui.renderer) {
			case "Handlebars":
			case "Mustache":
			case "templateLiterals":
				view.setLog(this.app.log);
				view.setModel(this.app.model);
				view.setUI(this.app.ui);
				view.setTimeout(this.app.options.ui.timeout);
				view.setDebounceTime(this.app.options.ui.debounceTime);
				view.setRenderer(this.app.options.ui.renderer);
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
