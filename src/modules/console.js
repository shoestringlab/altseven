class Console extends Component {
	constructor(options) {
		super();
		this.title = "Console Window";
		this.consoleDiv = null;
		this.active = false;
		this.app = app;
		this.resolve = resolve;
		this.reject = reject;
		this.options = this.app.options.console;

		// if (this.options.container === "") {
		// 	this.reject(
		// 		"You must specify a container object for the console display.",
		// 	);
		// 	return;
		// }

		if (this.options.enabled) {
			this.active = true;
			this.consoleDiv = document.createElement("div");
			this.consoleDiv.setAttribute("id", "a7consoleDiv");
			this.consoleDiv.setAttribute("class", "a7-console");
			document.body.appendChild(this.consoleDiv);

			var fp = new this.options.container(this.consoleDiv, {
				width: this.options.width,
				left: this.options.left,
				height: this.options.height,
				title: this.title,
				top: this.options.top,
				enableShrink: true,
				enableClose: true,
			});
			if (fp.element) fp.element.setAttribute("right", 0);

			if (this.options.wsServer) {
				var connection = a7.remote.webSocket(
					this.options.wsServer,
					this.handleMessage.bind(this),
				);
			}

			a7.console.addMessage = this.addMessage.bind(this);
			a7.log.info("Console initializing...");
			this.resolve();
		} else {
			this.reject(
				"Console init should not be called when console option is set to false.",
			);
		}
	}

	addMessage(message, dt, source, level) {
		var div = document.createElement("div");
		div.setAttribute("class", "a7-console-row-" + source);
		if (level !== undefined) {
			div.innerHTML = level + ": ";
			div.setAttribute(
				"class",
				div.getAttribute("class") + " a7-console-row-" + level,
			);
		}
		div.innerHTML +=
			+(dt.getHours() < 10 ? "0" + dt.getHours() : dt.getHours()) +
			":" +
			(dt.getMinutes() < 10 ? "0" + dt.getMinutes() : dt.getMinutes()) +
			": " +
			message;
		this.consoleDiv.appendChild(div);
	}

	handleMessage(message, json) {
		var ix = 0;
		if (json.type === "history") {
			for (ix = 0; ix < json.data.length; ix++) {
				this.addMessage(
					json.data[ix].text,
					new Date(json.data[ix].time),
					"websocket",
				);
			}
		} else if (json.type === "message") {
			this.addMessage(json.data.text, new Date(json.data.time), "websocket");
		} else {
			a7.log.error("This doesn't look like valid JSON: ", json);
		}
	}
}

// Usage example:
// const consoleOptions = { ... }; // Define your options here
// new Console(consoleOptions, resolveFunction, rejectFunction);
