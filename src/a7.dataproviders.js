a7.dataproviders = (function () {
	"use strict";

	const _dataproviders = new Map();

	return {
		init: function (options) {
			// init the dataproviders module
			// add dataproviders
			for (let dataprovider in options.dataproviders) {
				a7.dataproviders.register(dataprovider);
			}
		},

		getDataProvider: function (id) {
			return _dataproviders.get(id);
		},
		getAll: function () {
			return _dataproviders;
		},
		register: function (dataprovider) {
			_dataproviders.set(dataprovider.id, dataprovider);
		},
	};
})();
