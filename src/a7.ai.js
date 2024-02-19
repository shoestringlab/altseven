a7.ai = (function() {
	"use strict";
	var pipes = {};
  
	return {
 
	init: function(options){
		if( options.enabled ){
			import('/node_modules/@xenova/transformers/dist/transformers.min.js').then((pipeline)=>{

				console.log('Transformers; loaded.');
				console.dir( pipeline );
				for( var idx = 0; idx <= options.tasks.length; idx++ ){
					console.dir( options.tasks[idx] );
					switch( options.tasks[idx].id ){
						case "translation":
							pipes[options.tasks[idx].id.replaceAll("-","_")] = pipeline( options.tasks[idx].id,{
								src_lang: options.tasks[idx].src,
								tgt_lang: options.tasks[idx].tgt
							} );
						default:
							pipes[options.tasks[idx].id.replaceAll("-","_")] = pipeline( options.tasks[idx].id );
					}
				}
			});
		}
	}
	};
  })();
  