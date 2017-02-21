function Constructor( constructor, args, addBindings ) {
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
