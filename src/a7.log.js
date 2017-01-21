a7.Log = ( function(){
	// logging levels ALL < TRACE < INFO < WARN < ERROR < FATAL < OFF
	var logLevel = "ERROR,FATAL,INFO",
		_log = function( message, level ){
			if( logLevel.indexOf( level ) >=0 || logLevel.indexOf( "ALL" ) >=0 ){
				console.log( message );
				if( a7.Model.get( "debug.enabled" ) ){
					a7.Debug.addMessage( message, new Date(), "local", level );
				}
			}
		};

	return{
		init: function( options ){
			logLevel = ( options.logLevel !== undefined ? options.logLevel : "ERROR,FATAL,INFO" );
			a7.Log.info( "Log initializing..." );
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