import { a7 } from "/dist/a7.js";

var app = {
	main: (function () {
		return {
			init: function (state) {
				// render the hello page
				app.components.BindingTest({
					id: "bindingTest",
					selector: "#main",
				}),
					app.components.ModelDisplay({
						id: "modelDisplay",
						selector: "#modelDiv",
					});
			},
		};
	})(),
	components: (function () {
		function BindingTest(props) {
			var bindingTest = a7.components.Constructor(
				a7.components.View,
				[props],
				true,
			);

			bindingTest.state = {};

			bindingTest.template = function () {
				return `<h3>Form Binding Test</h3>
				<form action="#" method="post" class="form-stacked">
					<div class="columns is-multiline">
						<div class="col-sm-5">
							<label for="firstName">First Name:</label>
						</div>
						<div class="col-sm-5">
							<input
								type="text"
								class="form-input"
								id="firstName"
								name="firstName"
								data-bind="user.firstName"
							/>
						</div>
					</div>
					<div class="columns is-multiline">
						<div class="col-sm-5">
							<label for="lastName">Last Name:</label>
						</div>
						<div class="col-sm-5">
							<input
								type="text"
								class="form-input"
								id="lastName"
								name="lastName"
								data-bind="user.lastName"
							/>
						</div>
					</div>
					<div class="columns is-multiline">
						<div class="col-sm-5">
							<label for="username">Username:</label>
						</div>
						<div class="col-sm-5">
							<input
								type="text"
								class="form-input"
								id="username"
								name="username"
								data-bind="user.username"
							/>
						</div>
					</div>
					<div class="columns is-multiline">
						<div class="col-sm-5">
							<label for="email">Email:</label>
						</div>
						<div class="col-sm-5">
							<input
								type="email"
								class="form-input"
								id="email"
								name="email"
								data-bind="user.email"
							/>
						</div>
					</div>

					 <div class="column">
						<button type="button" class="button primary full-width" data-onclick="resetModel">
						Reset Model
						</button>
					</div>
				</form>
				`;
			};

			bindingTest.eventHandlers = {
				resetModel: function () {
					a7.model.set("user", {
						firstName: "",
						lastName: "",
						username: "",
						email: "",
					});
				},
			};

			return bindingTest;
		}

		function ModelDisplay(props) {
			var modelDisplay = a7.components.Constructor(
				a7.components.View,
				[props],
				true,
			);

			modelDisplay.state = {};

			modelDisplay.template = function () {
				return `<div>First Name:	<span id="fName" data-bind="user.firstName"></span></div>
				<div>Last Name: <span id="lName" data-bind="user.lastName"></span></div>
				<div>Username: <span id="uName" data-bind="user.username"></span></div>
				<div>Email: <span id="emailAddr" data-bind="user.email"></span></div>
				`;
			};

			modelDisplay.eventHandlers = {};

			return modelDisplay;
		}

		return {
			BindingTest: BindingTest,
			ModelDisplay: ModelDisplay,
		};
	})(),
};

export var application = function init() {
	var options = {
		security: {
			enabled: false,
		},
	};

	var p = new Promise(function (resolve, reject) {
		a7.init(options, resolve, reject);
	});
	p.then(function (state) {
		app.main.init();
		a7.model.set("user", {
			firstName: "",
			lastName: "",
			username: "",
			email: "",
		});
		a7.log.info("App init.");
	});
	p["catch"](function (message) {
		console.log(message);
	});

	return app;
};
