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
