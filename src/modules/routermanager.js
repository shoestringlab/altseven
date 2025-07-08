class RouterManager extends Component {
	constructor(options, routes) {
		super();
		this.app = app;
		this.router = new Router(app.options.router.routes);
		this.useEvents = this.app.options.router.options.useEvents ?? false;

		window.onpopstate = (event) => {
			this.match(document.location.pathname + document.location.search);
		};

		a7.log.info("RouterManager initialized...");
	}

	add(path, handler) {
		this.router.add(path, handler);
		return this;
	}

	find(path) {
		return this.router.find(path);
	}

	open(path, params = {}) {
		let result = this.find(path);
		if (!result || !result.handler) {
			a7.log.error(`No route found for path: ${path}`);
			return;
		}

		history.pushState(JSON.parse(JSON.stringify(params)), "", path);
		let combinedParams = Object.assign(params || {}, result.params || {});
		if (this.useEvents && typeof result.handler === "string") {
			this.app.events.publish(result.handler, combinedParams);
		} else {
			result.handler(combinedParams);
		}
	}

	match(path, params = {}) {
		let result = this.find(path);
		if (!result || !result.handler) {
			a7.log.error(`No route found for path: ${path}`);
			return;
		}

		history.pushState(JSON.parse(JSON.stringify(params)), "", path);
		let combinedParams = Object.assign(params || {}, result.params || {});
		if (this.useEvents) {
			this.app.events.publish(result.handler, combinedParams);
		} else {
			result.handler(combinedParams);
		}
	}
}

// URL Router class
class Router {
	constructor(routes) {
		this.REGEX_PARAM_DEFAULT = /^[^/]+/;
		this.REGEX_START_WITH_PARAM = /^(:\w|\()/;
		this.REGEX_INCLUDE_PARAM = /:\w|\(/;
		this.REGEX_MATCH_PARAM = /^(?::(\w+))?(?:\(([^)]+)\))?/;

		this.root = this.createNode();

		if (routes) {
			routes.forEach((route) => this.add.apply(this, route));
		}
	}

	createNode(_temp = {}) {
		const { regex = null, param = null, handler = null } = _temp;
		return {
			regex: regex,
			param: param,
			handler: handler,
			children: {
				string: {},
				regex: {},
			},
		};
	}

	add(pattern, handler) {
		this.parseOptim(pattern, handler, this.root);
		return this;
	}

	parse(remain, handler, parent) {
		if (this.REGEX_START_WITH_PARAM.test(remain)) {
			const match = remain.match(this.REGEX_MATCH_PARAM);
			let node = parent.children.regex[match[0]];

			if (!node) {
				node = parent.children.regex[match[0]] = this.createNode({
					regex: match[2]
						? new RegExp("^" + match[2])
						: this.REGEX_PARAM_DEFAULT,
					param: match[1],
				});
			}

			if (match[0].length === remain.length) {
				node.handler = handler;
			} else {
				this.parse(remain.slice(match[0].length), handler, node);
			}
		} else {
			const _char = remain[0];
			let _node = parent.children.string[_char];

			if (!_node) {
				_node = parent.children.string[_char] = this.createNode();
			}

			this.parse(remain.slice(1), handler, _node);
		}
	}

	parseOptim(remain, handler, node) {
		if (this.REGEX_INCLUDE_PARAM.test(remain)) {
			this.parse(remain, handler, node);
		} else {
			const child = node.children.string[remain];

			if (child) {
				child.handler = handler;
			} else {
				node.children.string[remain] = this.createNode({
					handler: handler,
				});
			}
		}
	}

	find(path) {
		return this.findOptim(path, this.root, {});
	}

	findOptim(remain, node, params) {
		const child = node.children.string[remain];

		if (child && child.handler !== undefined) {
			return {
				handler: child.handler,
				params: params,
			};
		}

		return this._find(remain, node, params);
	}

	_find(remain, node, params) {
		const child = node.children.string[remain[0]];

		if (child) {
			const result = this._find(remain.slice(1), child, params);

			if (result) {
				return result;
			}
		}

		for (const k in node.children.regex) {
			let child = node.children.regex[k];
			const match = remain.match(child.regex);

			if (match) {
				if (match[0].length === remain.length && child.handler !== undefined) {
					if (child.param) {
						params[child.param] = decodeURIComponent(match[0]);
					}

					return {
						handler: child.handler,
						params: params,
					};
				} else {
					const _result = this.findOptim(
						remain.slice(match[0].length),
						child,
						params,
					);

					if (_result) {
						if (child.param) {
							params[child.param] = decodeURIComponent(match[0]);
						}

						return _result;
					}
				}
			}
		}

		return null;
	}
}

// Usage example:
// const routerManager = new RouterManager();
// routerManager.init({ useEvents: true }, [{ path: '/home', handler: () => { console.log('Home page'); } }]);
// routerManager.open('/home');
