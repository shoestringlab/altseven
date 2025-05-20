a7.services = (function () {
	"use strict";

	const _services = new Map();

	return {
		init: function (options) {
			// init the services module
			// add services
			for (let service in options.services) {
				a7.services.register(service);
			}
		},

		getService: function (id) {
			return _services.get(id);
		},
		getAll: function () {
			return _services;
		},
		register: function (service) {
			_services.set(service.id, service);
		},
	};
})();
