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
		init: function( options, resolve, reject ){
			a7.log.info( "Model initializing... " );
			switch( options.model ){
				case "gadgetui":
					_model = gadgetui.model;
					// gadgetui maps directly, so we can loop on the keys
					Object.keys( gadgetui.model ).forEach( function( key, index ){
						if( key !== "BindableObject" ){
							_methods[ key ] = gadgetui.model[ key ];
						}
					});
					break;
			}
			resolve();
		}
	};

}() );