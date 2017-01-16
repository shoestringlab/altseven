module.exports = {
	app:{
		options:{
			sourceMap: true,
			sourceMapName: 'dist/a7.min.js.map',
			mangle: {
		        except: ['jQuery', '$']
		     }
		},
		src : 'dist/a7.js',
		dest :  'dist/a7.min.js'

	}
};