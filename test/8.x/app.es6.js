import { Application } from "/dist/a7.js";
import { Hello } from "./hello.js";

export var myApp;

var app = {
	main: (function () {
		return {
			init: function () {
				// render the hello page
				Hello({ id: "hello", selector: "div[name='main']" });
			},
		};
	})(),
};

export var application = () => {
	var options = { name: "ES6", security: { enabled: false } };

	myApp = new Application(options);

	app.main.init();
	myApp.log.info("App init.");
};
