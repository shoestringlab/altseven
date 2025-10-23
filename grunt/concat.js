module.exports = {
	css: {
		options: {
			sourceMap: true,
		},
		src: "src/css/*.css",
		dest: "dist/a7.css",
	},
	components: {
		options: {
			sourceMap: true,
		},
		src: [
			"src/components/util/constructor.js",
			"src/components/util/eventbindings.js",
			"src/components/component.js",
			"src/components/dataprovider.js",
			"src/components/entity.js",
			"src/components/model.js",
			"src/components/service.js",
			"src/components/user.js",
			"src/components/view.js",
		],
		dest: "src/a7.components.js",
	},
	a7: {
		options: {
			sourceMap: true,
		},
		src: [
			"src/a7.components.js",
			"src/modules/console.js",
			"src/modules/dataprovidermanager.js",
			"src/modules/errormanager.js",
			"src/modules/eventmanager.js",
			"src/modules/logmanager.js",
			"src/modules/modelmanager.js",
			"src/modules/remotemanager.js",
			"src/modules/routermanager.js",
			"src/modules/securitymanager.js",
			"src/modules/servicemanager.js",
			"src/modules/uimanager.js",
			"src/modules/util.js",
			"src/application.js",
		],
		dest: "dist/a7.js",
	},
};
