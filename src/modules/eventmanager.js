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
		// Create the topic's object if not yet created
		if (!this.hasProp.call(this.topics, topic)) {
			this.topics[topic] = [];
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

		// Cycle through topics queue, fire!
		this.topics[topic].forEach(function (item) {
			item(info || {});
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
