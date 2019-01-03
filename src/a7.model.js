a7.model = ( function() {
	"use strict";
	var _model,
		_methods = {};

	return {
		create : function(){
			return _methods[ "create" ].apply( _model, arguments );
		},
		destroy : function(){
			return _methods[ "destroy" ].apply( _model, arguments );
		},
		get : function(){
			return _methods[ "get" ].apply( _model, arguments );
		},
		set : function(){
			return _methods[ "set" ].apply( _model, arguments );
		},
		exists : function(){
			return _methods[ "exists" ].apply( _model, arguments );
		},
		bind : function(){
			return _methods[ "bind" ].apply( _model, arguments );
		},
		init: function( options, resolve ){
			a7.log.info( "Model initializing... " );

			if( typeof options.model == "string" ){
				switch( options.model ){
					case "gadgetui":
						_model = gadgetui.model;
						break;
				}
			}else if( typeof options.model == "object" ){
				_model = options.model;
			}
			a7.log.trace( "Model set: " + _model );
			// gadgetui maps directly, so we can loop on the keys
			Object.keys( _model ).forEach( function( key ){
				if( key !== "BindableObject" ){
					_methods[ key ] = _model[ key ];
				}
			});

			resolve();
		}
	};
}() );
