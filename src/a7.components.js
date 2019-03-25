a7.components = ( function() {"use strict";function Constructor( constructor, args, addBindings ) {
	var returnedObj,
		obj;

	// add bindings for custom events
	// this section pulls the bindings ( on, off, fireEvent ) from the
	// EventBindings object and add them to the object being instantiated
	if( addBindings === true ){
		//bindings = EventBindings.getAll();
 		EventBindings.getAll().forEach( function( binding ){
			if( constructor.prototype[ binding ] === undefined ) {
				constructor.prototype[ binding.name ] = binding.func;
			}
		});
	}

	// construct the object
	obj = Object.create( constructor.prototype );

	// this section adds any events specified in the prototype as events of
	// the object being instantiated
	// you can then trigger an event from the object by calling:
	// <object>.fireEvent( eventName, args );
	// args can be anything you want to send with the event
	// you can then listen for these events using .on( eventName, function(){});
	// <object>.on( eventName, function(){ })
	if( addBindings === true ){
		// create specified event list from prototype
		obj.events = {};
		if( constructor.prototype.events !== undefined ){
			constructor.prototype.events.forEach( function( event ){
				obj.events[ event ] = [ ];
			});
		}
	}

	returnedObj = constructor.apply( obj, args );
	if( returnedObj === undefined ){
		returnedObj = obj;
	}
	//returnedObj.prototype = constructor.prototype;
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
		if( this.events[ key ] !== undefined ){
			this.events[ key ].forEach( function( func ){
				func( _this, args );
			});
		}
	},

	getAll : function(){
		return [ 	{ name : "on", func : this.on },
							{ name : "off", func : this.off },
							{ name : "fireEvent", func : this.fireEvent } ];
	}
};

var Model = ( function() {
	"use strict";

	var _model = {};
	var _mementos = [];
	var _maxEntries = 20;
	var _currentIndex = 0;

	var _setModelValue = function( name, value ){
		a7.log.trace( "Set key: " + name + " = " + JSON.stringify( value ) );

		switch( typeof value ){
			case "undefined":
			case "number":
			case "boolean":
			case "function":
			case "Symbol":
			case "string":
				// simple values are copied by value
				// functions and symbols
				_model[ name ] = value;
				break;
			case "object":
				// null objects are set to null
				if( value === null ){
					_model[ name ] = null;
				}else{
					// deep copying objects (will not copy method definitions, but we expect only data )
					_model[ name ] = JSON.parse( JSON.stringify( value ) );
				}
				break;
		}
		// save the state of the model
		_setMemento();
	};

	var _keyExists = function( object, key ){
		return ( object.hasOwnProperty( key ) );
	};

	var _getMemento = function( index ){
		return JSON.parse( JSON.stringify( _mementos[ index ] ) );
	};

	var _setMemento = function(){
		a7.log.trace( "Set memento" );
		if( _currentIndex < _mementos.length - 1 ){
			_mementos = _mementos.slice( 0, _currentIndex );
		}
		if( _mementos.length === _maxEntries ){
			a7.log.trace( "model - moving an item off the stack history." );
			// push the oldest entry off the stack
			_mementos.shift();
		}
		_mementos.push( JSON.parse( JSON.stringify( _model ) ) );
		// we saved last model state, set index to latest entry
		_currentIndex = _mementos.length -1;
	};

	var _rewind = function( steps ){
		var myIndex = 0;
		steps = ( steps !== undefined ? steps : 1 );
		a7.log.trace( "Move back in history index by " + steps + " operations " );
		myIndex = _currentIndex - steps;
		_setCurrentIndex( myIndex );
	};

	var _fastForward = function( steps ){
		var myIndex = 0;
		steps = ( steps !== undefined ? steps : 1 );
		a7.log.trace( "Move forward in history index by " + steps + " operations " );
		myIndex = _currentIndex + steps;
		_setCurrentIndex( myIndex );
	};

	var _undo = function( steps ){
		_rewind( steps );
		_model = _getMemento( _currentIndex );
	};

	var _redo = function( steps ){
		_fastForward( steps );
		_model = _getMemento( _currentIndex );
	};

	var _setCurrentIndex = function( index ){
		_currentIndex = ( index < 0 ? 0 : index > _mementos.length - 1 ? _mementos.length - 1 : index );
	};

	return {
		undo: _undo,
		redo: _redo,
		init: function( options ){
			_maxEntries = ( options !== undefined && options.maxEntries !== undefined ? options.maxEntries : 20 );
		},
		destroy: function( name ){
			_setMemento();
			delete _model[ name ];
		},
		exists: function( name ){
			return _keyExists( _model, name );
		},
		get: function( name ) {
			try{
				return JSON.parse( JSON.stringify( _model[ name ] ) );
			}catch( e ){
				a7.log.error( e );
				throw( e );
			}
		},
		set: function( name, value ){
			_setModelValue( name, value );
			return;
		}
	};
}() );

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

function View( props ){
	this.renderer = a7.model.get("a7").ui.renderer;
	this.type = 'View';
	this.props = props;
	this.state = {};

	this.config();
}

View.prototype = {
	config: function(){

		this.on( "mustRegister", function( component, parent ){
			a7.log.trace( 'mustRegister: ' + this.props.id + ', parent: ' + parent.props.id );
			this.props.parentID = parent.props.id;
			a7.ui.register( this );
		}.bind( this ) );

		this.on( "mustRender", function(){
			a7.ui.enqueueForRender( this.props.id );
		}.bind( this ));

		this.on( "rendered", function(){
			this.onRendered();
		}.bind( this ));

		this.on( "registered", function(){
			// register children
			if( this.props !== undefined && this.props.children !== undefined && this.props.children !== null ){
				for( var child in this.props.children ){
					if( a7.ui.getView( this.props.children[ child ].props.id ) === undefined ){
						a7.log.trace( 'parent: ' + this.props.id + ', register child: ' + this.props.children[ child ].props.id );
						this.props.children[ child ].fireEvent( "mustRegister", Object.assign( this ) );
					}
				}
			}
			if( this.props.parentID === undefined ){
				// only fire render event for root views, children will render in the chain
				this.fireEvent( "mustRender" );
			}
		}.bind( this ));
	},
	events : ['mustRender','rendered', 'mustRegister', 'registered'],
  setState: function( args ){
    this.state = args;
    // setting state requires a re-render
		this.fireEvent( 'mustRender' );
	},
	render: function(){
		a7.log.info( 'render: ' + this.props.id );
		if( this.props.element === undefined || this.props.element === null ){
			this.props.element = document.querySelector( this.props.selector );
		}
		if( !this.props.element ) throw( "You must define a selector for the view." );
		this.props.element.innerHTML = ( typeof this.template == "function" ? this.template() : this.template );

		var eventArr = [];
		a7.ui.getEvents().forEach( function( eve ){
			eventArr.push("[data-on" + eve + "]");
		});
		var eles = this.props.element.querySelectorAll( eventArr.toString() );

		eles.forEach( function( sel ){
			for( var ix=0; ix < sel.attributes.length; ix++ ){
				var attribute = sel.attributes[ix];
				if( attribute.name.startsWith( "data-on" ) ){
					var event = attribute.name.substring( 7, attribute.name.length );
					sel.addEventListener( event, this.eventHandlers[ sel.attributes["data-on" + event].value ] );
				}
			}
		}.bind( this ));

		this.fireEvent( "rendered" );
	},
	onRendered: function(){
		if( this.props !== undefined && this.props.children !== undefined && this.props.children !== null ){
			for( var child in this.props.children ){
				this.props.children[ child ].props.element = document.querySelector( this.props.children[ child ].props.selector );
				this.props.children[ child ].render();
			}
		}
	}
};

return {
  Constructor: Constructor,
  EventBindings: EventBindings,
  Model: Model,
  User: User,
  View: View
};
}());
//# sourceMappingURL=a7.components.js.map