a7.Debug = ( function() {
	"use strict";

	var title = "Debug Window", 
		// width of window relative to it's container ( i.e. browser window )
		width = "50%",
		// the div we'll create to host the debug content
		debugDiv,
		// flag whether debug is running
		active = false,
		_addMessage = function( message, dt, source, level ) {
			var div = document.createElement( "div" );
			div.setAttribute( "class", "a7-debug-row-" + source );
			if( level !== undefined ){
				div.innerHTML = level + ": ";
				div.setAttribute( "class", div.getAttribute( "class" ) +  " a7-debug-row-" + level );
			}
			div.innerHTML += +( dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours() ) + ':' + ( dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes() ) + ': ' + message;
			debugDiv.appendChild( div );
		};

	return {
		init : function( resolve, reject ) {
			var debug = a7.Model.get( "debug" ),
				top = ( debug.top === undefined ? 0 : debug.top ), 
				right = ( debug.right === undefined ? 0 : debug.right );
			// check for debug state
			if ( debug.enabled ) {
				active = true;
				debugDiv = document.createElement( "div" );
				debugDiv.setAttribute( "id", "debugDiv" );
				debugDiv.setAttribute( "class", "a7-debug" );
				document.body.append( debugDiv );
				var connection,
					fp = new gadgetui.display.FloatingPane( debugDiv, {
						width : width,
						title : title,
						opacity : 0.7,
						position : "absolute",
						right : right,
						top : top
					} );
				
				fp.selector.setAttribute( "right", 0 );

				window.WebSocket = window.WebSocket || window.MozWebSocket;

				// if browser doesn't support WebSocket, just show some
				// notification and exit
				if ( !window.WebSocket ) {
					debugDiv.innerHTML( "Your browser doesn't support WebSockets." );
					return;
				}

				// open connection
				connection = new WebSocket( debug.wsServer );

				connection.onopen = function() {
					//a7.Log.info( "Debug initializing..." );
				};

				connection.onerror = function( error ) {
					var message =  "Can't connect to the debug socket server.";
					if ( debug.enabled ) {
						// just in there were some problems with conenction...
						_addMessage( message, new Date(), "local" );
					}else{
						a7.Log.error( message );
					}
					
				};

				// most important part - incoming messages
				connection.onmessage = function( message ) {
					var json, ix;
					// try to parse JSON message. Because we know that the
					// server always returns
					// JSON this should work without any problem but we should
					// make sure that
					// the massage is not chunked or otherwise damaged.
					try {
						json = JSON.parse( message.data );
					} catch ( er ) {
						a7.Log.error( "This doesn't look like valid JSON: ", message.data );
						return;
					}

					if ( json.type === 'history' ) { // entire message
														// history
						// insert every single message to the chat window
						for ( ix = 0; ix < json.data.length; ix++ ) {
							_addMessage( json.data[ ix ].text, new Date( json.data[ ix ].time ), "websocket" );
						}
					} else if ( json.type === 'message' ) { // it's a single
															// message
						_addMessage( json.data.text, new Date( json.data.time ), "websocket" );
					} else {
						a7.Log.error( "This doesn't look like valid JSON: ", json );
					}
				};

				window.addEventListener( "close", function( event ) {
					connection.close();
				} );

				a7.Debug.addMessage = _addMessage;
				a7.Log.info( "Debug initializing..." );
				resolve();
			}else{
				// debugging init should not run if debug is set to false
				reject( "Debug init should not be called when debug option is set to false." );
			}

		}
	};

}() );