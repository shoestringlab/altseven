class LogManager extends Component {
	constructor(app) {
		super();
		this.app = app;

		this._ready = false;
		this._deferred = [];
		this.logLevel = this.app.options.logging.logLevel;
		this._toBrowserConsole = this.app.options.logging.toBrowserConsole;
		this._consoleEnabled = this.app.options.console.enabled;
		this._ready = true;

		// Log any deferred messages
		this._deferred.forEach((item) => {
			this.log(item.message, item.level);
		});

		// Clear the deferred messages after logging them
		this._deferred = [];

		this.info("Log initializing...");
		this.fireEvent("initialized");
	}

	error(message) {
		this.log(message, "ERROR");
	}

	fatal(message) {
		this.log(message, "FATAL");
	}

	info(message) {
		this.log(message, "INFO");
	}

	trace(message) {
		this.log(message, "TRACE");
	}

	warn(message) {
		this.log(message, "WARN");
	}

	log(message, level) {
		if (
			(this._ready && this.logLevel.indexOf(level) >= 0) ||
			this.logLevel.indexOf("ALL") >= 0
		) {
			if (this._consoleEnabled) {
				this.app.console.addMessage(message, new Date(), "local", level);
			}
			if (this._toBrowserConsole) {
				console.log(message);
			}
		} else if (!this._ready) {
			this._deferred.push({ message: message, level: level });
		}
	}
}
