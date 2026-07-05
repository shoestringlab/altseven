class EventManager extends Component {
	constructor(app) {
		super();
		this.app = app;
		this.options = app.options;
		this.topics = {};
		this.hasProp = this.topics.hasOwnProperty;

		this.subscribe("auth.login", (params) => {
			this.app.remote.invoke("auth.login", params);
		});
		this.subscribe("auth.logout", (params) => {
			this.app.remote.invoke("auth.logout", params);
		});
		this.subscribe("auth.refresh", (params) => {
			this.app.remote.invoke("auth.refresh", params);
		});
		this.subscribe("auth.sessionTimeout", () => {
			this.app.security.invalidateSession();
		});
		this.subscribe("auth.invalidateSession", () => {
			this.app.security.invalidateSession();
		});
		// Subscribe to all events in options.events
		for (const [topic, listener] of Object.entries(this.options.events)) {
			this.subscribe(topic, listener);
		}
	}

	subscribe(topic, listener) {
		// Create the topic's queue if not yet created. We register the topic even
		// when the listener isn't callable so that a *declared-but-unhandled*
		// event — e.g. `{ "settings.foo.show": null }` in options.events, meant to
		// be handled later by a view subscribe — doesn't make publish() early-return.
		if (!this.hasProp.call(this.topics, topic)) {
			this.topics[topic] = [];
		}

		// Ignore non-function listeners. A null/undefined placeholder must never be
		// queued: publish() would call it and throw, aborting the whole dispatch and
		// silently killing every other listener on the topic.
		if (typeof listener !== "function") {
			return { remove: () => {} };
		}

		// Add the listener to queue
		var index = this.topics[topic].push(listener) - 1;

		// Provide handle back for removal of topic
		return {
			remove: () => {
				delete this.topics[topic][index];
			},
		};
	}

	publish(topic, info) {
		this.app.log.trace("event: " + topic);
		// If the topic doesn't exist, or there's no listeners in queue,
		// just leave
		if (!this.hasProp.call(this.topics, topic)) {
			return;
		}

		// Cycle through topics queue, fire! Each listener is isolated: a
		// non-function slot (a placeholder, or a hole left by remove()) is skipped,
		// and a listener that throws is logged rather than aborting the ones after it.
		this.topics[topic].forEach((item) => {
			if (typeof item !== "function") {
				return;
			}
			try {
				item(info || {});
			} catch (e) {
				this.app.log.error("event listener for '" + topic + "' threw", e);
			}
		});
	}
}

// derived from work by David Walsh
// https://davidwalsh.name/pubsub-javascript
// MIT License http://opensource.org/licenses/MIT

// Usage example:
// const eventManager = new EventManager();
// eventManager.on('customEvent', (eventManager, args) => { console.log(args); });
// eventManager.fireEvent('customEvent', { message: 'Hello, world!' });
