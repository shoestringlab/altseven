a7.log = ( function(){
	// logging levels ALL < TRACE < INFO < WARN < ERROR < FATAL < OFF
	var _ready = false,
		_deferred = [],
		_logLevel = "ERROR,FATAL,INFO",
		_log = function( message, level ){
			if( _ready && _logLevel.indexOf( level ) >=0 || _logLevel.indexOf( "ALL" ) >=0 ){
				//console.log( message );
				if( a7.model.get( "a7.console" ).enabled ){
					a7.console.addMessage( message, new Date(), "local", level );
				}
			} else if( ! _ready ){
				// store log messages before init so they can be logged after init
				_deferred.push( { message: message, level: level } );
			}
		};

	return{
		init: function(){

			_logLevel = a7.model.get( "a7.logging" ).logLevel;
			_ready = true;
			_deferred.forEach( function( item ){
				_log( item.message, item.level );
			});
			_deffered = [];
			a7.log.info( "Log initializing..." );
		},
		error: function( message ){
			_log( message, "ERROR" );
		},
		fatal: function( message ){
			_log( message, "FATAL" );
		},
		info: function( message ){
			_log( message, "INFO" );
		},
		trace: function( message ){
			_log( message, "TRACE" );
		},
		warn: function( message ){
			_log( message, "WARN" );
		}
	};
}());
