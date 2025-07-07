import { myApp } from "./app.es6.js";

export function Hello(props) {
	var hello = new myApp.components.View(props);

	hello.state = {
		text: " World!",
	};

	hello.template = function () {
		return `<h3>Hello ${hello.state.text}</h3>`;
	};

	myApp.ui.register(hello);
}
