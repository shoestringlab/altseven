a7.router = (function () {
	"use strict";

	// url-router code from here courtesy Jiang Fengming
	// https://github.com/jiangfengming/url-router

	/*
  Copyright 2015-2019 Jiang Fengming

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */

	var REGEX_PARAM_DEFAULT = /^[^/]+/;
	var REGEX_START_WITH_PARAM = /^(:\w|\()/;
	var REGEX_INCLUDE_PARAM = /:\w|\(/;
	var REGEX_MATCH_PARAM = /^(?::(\w+))?(?:\(([^)]+)\))?/;

	function Router(routes) {
		var _this = this;

		this.root = this._createNode();

		if (routes) {
			routes.forEach(function (route) {
				return _this.add.apply(_this, route);
			});
		}
	}

	var _proto = Router.prototype;

	_proto._createNode = function _createNode(_temp) {
		var _ref = _temp === void 0 ? {} : _temp,
			regex = _ref.regex,
			param = _ref.param,
			handler = _ref.handler;

		return {
			regex: regex,
			param: param,
			handler: handler,
			children: {
				string: {},
				regex: {},
			},
		};
	};

	_proto.add = function add(pattern, handler) {
		this._parseOptim(pattern, handler, this.root);

		return this;
	};

	_proto._parse = function _parse(remain, handler, parent) {
		if (REGEX_START_WITH_PARAM.test(remain)) {
			var match = remain.match(REGEX_MATCH_PARAM);
			var node = parent.children.regex[match[0]];

			if (!node) {
				node = parent.children.regex[match[0]] = this._createNode({
					regex: match[2] ? new RegExp("^" + match[2]) : REGEX_PARAM_DEFAULT,
					param: match[1],
				});
			}

			if (match[0].length === remain.length) {
				node.handler = handler;
			} else {
				this._parseOptim(remain.slice(match[0].length), handler, node);
			}
		} else {
			var _char = remain[0];
			var _node = parent.children.string[_char];

			if (!_node) {
				_node = parent.children.string[_char] = this._createNode();
			}

			this._parse(remain.slice(1), handler, _node);
		}
	};

	_proto._parseOptim = function _parseOptim(remain, handler, node) {
		if (REGEX_INCLUDE_PARAM.test(remain)) {
			this._parse(remain, handler, node);
		} else {
			var child = node.children.string[remain];

			if (child) {
				child.handler = handler;
			} else {
				node.children.string[remain] = this._createNode({
					handler: handler,
				});
			}
		}
	};

	_proto.find = function find(path) {
		return this._findOptim(path, this.root, {});
	};

	_proto._findOptim = function _findOptim(remain, node, params) {
		var child = node.children.string[remain];

		if (child && child.handler !== undefined) {
			return {
				handler: child.handler,
				params: params,
			};
		}

		return this._find(remain, node, params);
	};

	_proto._find = function _find(remain, node, params) {
		var child = node.children.string[remain[0]];

		if (child) {
			var result = this._find(remain.slice(1), child, params);

			if (result) {
				return result;
			}
		}

		for (var k in node.children.regex) {
			child = node.children.regex[k];
			var match = remain.match(child.regex);

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
					var _result = this._findOptim(
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
	};

	// end url-router code

	var _options,
		_router,
		_add = function (path, handler) {
			_router.add(path, handler);
		},
		_find = function (path) {
			return _router.find(path);
		},
		_open = function (path, params = {}) {
			let result = _find(path);
			let handler = result.handler;
			history.pushState(JSON.parse(JSON.stringify(params)), "", path);
			let combinedParams = Object.assign(params || {}, result.params || {});
			if (_options.useEvents && typeof handler === "string") {
				a7.events.publish(handler, combinedParams);
			} else {
				handler(combinedParams);
			}
		},
		_match = function (path, params = {}) {
			let result = _router.find(path);
			let combinedParams = Object.assign(params || {}, result.params || {});
			history.pushState(JSON.parse(JSON.stringify(params)), "", path);
			if (_options.useEvents) {
				a7.events.publish(result.handler, combinedParams);
			} else {
				result.handler(combinedParams);
			}
		};

	return {
		open: _open,
		add: _add,
		find: _find,
		match: _match,
		init: function (options, routes) {
			_router = new Router(routes);
			_options = options;
			_options.useEvents = _options.useEvents ? true : false;
			window.onpopstate = function (event) {
				//a7.log.trace( 'state: ' + JSON.stringify( event.state ) );
				_match(document.location.pathname + document.location.search);
			};
		},
	};
})();
