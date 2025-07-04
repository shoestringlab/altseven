class ErrorManager extends Component {
	constructor() {
		super();

		window.onerror = (msg, url, lineNo, columnNo, error) => {
			this.captureError(msg, url, lineNo, columnNo, error);
			return false;
		};

		a7.log.info("ErrorManager initialized...");
	}

	captureError(msg, url, lineNo, columnNo, error) {
		var string = msg.toLowerCase();
		var substring = "script error";
		if (string.indexOf(substring) > -1) {
			a7.log.error("Script Error: See Browser Console for Detail");
		} else {
			var message = [
				"Message: " + msg,
				"URL: " + url,
				"Line: " + lineNo,
				"Column: " + columnNo,
				"Error object: " + JSON.stringify(error),
			].join(" - ");

			this.fireEvent("scriptError", [msg, url, lineNo, columnNo, error]);
			a7.log.error(message);
		}
	}
}

// Usage example:
// const errorManager = new ErrorManager();
// errorManager.init();
