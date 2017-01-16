a7.Debug = ( function() {
	"use strict";

	var title = "Debug Window", 
		// width of window relative to it's container ( i.e. browser window )
		width = "50%",
		// location of the debug window
		position = { my: "right top", at: "right top", of: "window" },
		// the div we'll create to host the debug content
		debugDiv,
		// flag whether debug is running
		active = false,
		_addMessage = function( message, dt, source ) {
			var div = document.createElement( "div" );
			div.setAttribute( "class", "a7-debug-" + source );
			div.innerHTML = +( dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours() ) + ':' + ( dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes() ) + ': ' + message;
			debugDiv.appendChild( div );
		};

	return {
		init : function( options, resolve, reject ) {
			// check for debug state
			if ( a7.Model.get( "debug" ) ) {
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
						position : position
					} );

				window.WebSocket = window.WebSocket || window.MozWebSocket;

				// if browser doesn't support WebSocket, just show some
				// notification and exit
				if ( !window.WebSocket ) {
					debugDiv.innerHTML( "Sorry, but your browser doesn't support WebSockets." );
					return;
				}

				// open connection
				connection = new WebSocket( options.wsServer );

				connection.onopen = function() {
					//a7.Log.info( "Debug initializing..." );
				};

				connection.onerror = function( error ) {
					// just in there were some problems with conenction...
					debugDiv.innerHTML( "Sorry, but there's some problem with your connection or the server is down." );
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
						a7.Log.error( "Hmm..., I've never seen JSON like this: ", json );
					}
				};

				window.addEventListener( "close", function( event ) {
					connection.close();
				} );

				/*	var addMessage = function( message, dt ) {
					var div = document.createElement( "div" );
					div.innerHTML = +( dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours() ) + ':' + ( dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes() ) + ': ' + message;
					debugDiv.insertBefore( div, debugDiv.firstChild );
				};	*/

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