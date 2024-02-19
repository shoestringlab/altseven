module.exports = {

		src : {
			src : [ 'src/a7.js',
					'a7.ai.js',
					'src/a7.console.js',
					'src/a7.error.js',
					'src/a7.events.js',
					'src/a7.log.js',
					'src/a7.model.js',
					'src/a7.components.js',
					'src/a7.remote.js',
					"src/a7.router.js",
					'src/a7.ui.js',
					'src/a7.util.js'

					],
			/*	exclude : [ 'includes/javascript/app.min.js',
					'server/config.js', './Gruntfile.js' ],	*/
			directives : { // example directives
				node : true,
				todo : true,
				white : true,
				nomen : true,
				unparam : true,
				plusplus : true,
				bitwise : true,
				predef : [ 'a7', 'History', 'window', 'WebSocket',
						'getToken','alert', 'Mustache',
						'sessionStorage',
						'Promise','gadgetui','EventBindings',
						'document', 'moment', 'Worker',
						'navigator', 'FormData', 'location',
						'XMLHttpRequest' ]
			},
			options : {
				junit : 'grunt/jslint/server-junit.xml', // write the output
												// to a JUnit XML
				log : 'grunt/jslint/server-lint.log',
				jslintXml : 'grunt/jslint/server-jslint.xml',
				errorsOnly : true, // only display errors
				failOnError : false, // defaults to true
				checkstyle : 'grunt/jslint/server-checkstyle.xml'
			}
	},

	dist : {
		src : [ // some example files
				'dist/a7.js'],
		directives : { // example directives
			node : true,
			todo : true,
			white : true,
			nomen : true,
			unparam : true,
			plusplus : true,
			bitwise : true,
			predef : [ 'a7', 'History', 'window',
					'getToken','alert',
					'sessionStorage',
					'Promise','gadgetui','EventBindings',
					'document', 'moment', 'Worker',
					'navigator', 'FormData', 'location',
					'XMLHttpRequest' ]
		},
		options : {
			junit : 'grunt/jslint/server-junit.xml', // write the output
											// to a JUnit XML
			log : 'grunt/jslint/server-lint.log',
			jslintXml : 'grunt/jslint/server-jslint.xml',
			errorsOnly : true, // only display errors
			failOnError : false, // defaults to true
			checkstyle : 'grunt/jslint/server-checkstyle.xml'
		}
	}
};
