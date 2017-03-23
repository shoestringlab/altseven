a7.components = ( function() {"use strict";function Constructor( constructor, args, addBindings ) {
	var ix,
		returnedObj,
		obj;

	if( addBindings === true ){
		//bindings = EventBindings.getAll();
		EventBindings.getAll().forEach( function( binding ){
			if( constructor.prototype[ binding ] === undefined ) {
				constructor.prototype[ binding ] = binding.func;
			}
		});
	}

	// construct the object
	obj = Object.create( constructor.prototype );
	returnedObj = constructor.apply( obj, args );
	if( returnedObj === undefined ){
		returnedObj = obj;
	}

	if( addBindings === true ){
		// create specified event list from prototype
		returnedObj.events = {};
		if( constructor.prototype.events !== undefined ){
			constructor.prototype.events.forEach( function( event ){
				returnedObj.events[ event ] = [ ];
			});
		}
	}

	return returnedObj;

}

/*
 * EventBindings
 * author: Robert Munn <robert.d.munn@gmail.com>
 *
 */

var EventBindings = {
	on : function( event, func ){
		if( this.events[ event ] === undefined ){
			this.events[ event ] = [];
		}
		this.events[ event ].push( func );
		return this;
	},

	off : function( event ){
		// clear listeners
		this.events[ event ] = [];
		return this;
	},

	fireEvent : function( key, args ){
		var _this = this;
		this.events[ key ].forEach( function( func ){
			func( _this, args );
		});
	},

	getAll : function(){
		return [ { name : "on", func : this.on },
		         { name : "off", func : this.off },
				 { name : "fireEvent", func : this.fireEvent } ];
	}
};
function User(){
	// init User
	return this;
}

User.prototype.getMemento = function(){
	var user = {}, self = this;
	Object.keys( this ).forEach( function( key ){
		user[ key ] = self[ key ];
	});
	return user;
};

return {
	Constructor : Constructor,
	EventBindings : EventBindings,
	User: User
};
}());
//# sourceMappingURL=a7.components.js.map
