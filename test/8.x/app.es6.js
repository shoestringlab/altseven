import { Application } from "/dist/a7.js";

var app = {
	main: (function () {
		return {
			init: function (state) {
				// render the hello page
				app.components.Hello({ id: "hello", selector: "div[name='main']" });
			},
		};
	})(),
	components: (function () {
		function Hello(props) {
			var hello = new a7.components.View(props);

			hello.state = {
				text: " World!",
			};

			hello.template = function () {
				return `<h3>Hello ${hello.state.text}</h3>`;
			};

			return hello;
		}

		return {
			Hello: Hello,
		};
	})(),
};

export var application = function init() {
	var options = { applicationName: "ES6", security: { enabled: false } };

	let app = new Application(options);
	// var p = new Promise(function (resolve, reject) {
	// 	a7.init(options, resolve, reject);
	// });
	// p.then(function (state) {
	// 	app.main.init();
	// 	a7.log.info("App init.");
	// });
	// p["catch"](function (message) {
	// 	console.log(message);
	// });

	return app;
};
