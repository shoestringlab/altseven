// derived from work by David Walsh
// https://davidwalsh.name/pubsub-javascript
// MIT License http://opensource.org/licenses/MIT

a7.Events = ( function() {
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
			a7.Events.subscribe( "auth.login", function( params ){
				a7.Remote.invoke( "auth.login", { username : params.username, password : params.password } );
			});
			a7.Events.subscribe( "auth.refresh", function( params ){
				a7.Remote.invoke( "auth.refresh", params );
			});
			a7.Events.subscribe( "auth.sessionTimeout", function( params ){
			//	a7.Remote.invoke( "auth.sessionTimeout" );
			});
			a7.Events.subscribe( "auth.invalidateSession", function( params ){
				//	a7.Remote.invoke( "auth.sessionTimeout" );
			});
		},
		publish : function( topic, info ) {
			a7.Log.trace( "event: " + topic );
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