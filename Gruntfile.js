
module.exports = function(grunt) {
	var path = require('path');

	require('load-grunt-config')(grunt, {
	    configPath: path.join(process.cwd(), 'grunt'),
	    init: true,
	    data: {
	    	 pkg: require('./package.json')
	    },
	    loadGruntTasks: {
	    	pattern: ['grunt-contrib-*', 'grunt-jslint', 'grunt-newer'],
	        scope: 'devDependencies'
	    },
	    postProcess: function(config) {}
	});
	grunt.registerTask("default", ["newer:concat:components", "newer:jslint:src", "newer:concat:css", "newer:concat:a7", "newer:concat:a7es6", "newer:jslint:dist"]);
	grunt.registerTask("clean", ["concat:components", "jslint:src", "concat:css", "concat:a7", "concat:a7es6", "jslint:dist"]);
	grunt.registerTask("lint", ["newer:concat:components", "newer:jslint"]);
};
