// derived from work by David Walsh
// https://davidwalsh.name/pubsub-javascript
// MIT License http://opensource.org/licenses/MIT

a7.events = ( function() {
	"use strict";
	var topics = {},
		hOP = topics.hasOwnProperty;

	return {

		subscribe : function( topic, listener ) {
			// Create the topic's object if not yet created
			if ( !hOP.call( topics, topic ) ){
				topics[ topic ] = [];
			}

			// Add the listener to queue
			var index = topics[ topic ].push( listener ) - 1;

			// Provide handle back for removal of topic
			return {
				remove : function() {
					delete topics[ topic ][ index ];
				}
			};
		},
		init: function(){
			a7.events.subscribe( "auth.login", function( params ){
				a7.remote.invoke( "auth.login", params );
			});
			a7.events.subscribe( "auth.refresh", function( params ){
				a7.remote.invoke( "auth.refresh", params );
			});
			a7.events.subscribe( "auth.sessionTimeout", function( params ){
			//	a7.remote.invoke( "auth.sessionTimeout" );
			});
			a7.events.subscribe( "auth.invalidateSession", function( params ){
				//	a7.remote.invoke( "auth.sessionTimeout" );
			});
		},
		publish : function( topic, info ) {
			a7.log.trace( "event: " + topic );
			// If the topic doesn't exist, or there's no listeners in queue,
			// just leave
			if ( !hOP.call( topics, topic ) ){
				return;
			}

			// Cycle through topics queue, fire!
			topics[ topic ].forEach( function( item ) {
				item( info || {} );
			} );
		}
	};
}());
