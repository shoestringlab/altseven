module.exports = {
	css: {
			options: {
			      sourceMap: true
			    },				
			src : 'src/css/*.css',
			dest : 'dist/a7.css'						
		},
	objects: {
		options: {
		      sourceMap: true,
		      banner: 'a7.objects = ( function() {"use strict";',
		      footer: '}());'
		    },	
		src: [	'src/objects/util/constructor.js',
				'src/objects/util/eventbindings.js',
				'src/objects/user.js',
				'src/objects/objects.js' ],
		dest :  'src/a7.objects.js'		
	},
		
	a7 : {
		options: {
		      sourceMap: true
		    },	
		src: [	'src/a7.js',
				'src/a7.console.js',
				'src/a7.events.js',
				'src/a7.layout.js',
				'src/a7.log.js',
				'src/a7.model.js',
				'src/a7.objects.js',
				'src/a7.remote.js',
				'src/a7.security.js'
		],
		dest :  'dist/a7.js'
	}
};