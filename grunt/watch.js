module.exports = {
	css : {
		files : [ 'src/css/*.css' ],
		tasks : [ 'newer:concat:css' ],
		options : {
			spawn : false
		}
	},
	grunt: {
		files : ['Gruntfile.js','grunt/*.js'],
		options : {
			reload : true
		}		
	},
	objects:{
		files:'src/objects/**/*.js', 
		tasks: ['newer:concat:objects', 'concat:a7', 'uglify'],
		options : {
			spawn : false
		}
	},

	a7:{
		files:'src/*.js', 
		tasks: [ 'newer:concat:a7', 'newer:uglify' ],
		options : {
			spawn : false
		}
	}
};