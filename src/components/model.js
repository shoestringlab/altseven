var Model = ( function() {
	"use strict";

	var _model = {};
	function BindableObject( data, element ) {
		this.data = data;
		this.elements = [ ];
		if ( element !== undefined ) {
			this.bind( element );
		}
	}

	BindableObject.prototype.handleEvent = function( ev ) {
		var ix, obj;
		switch ( ev.type ) {
			case "change":
				for( ix = 0; ix < this.elements.length; ix++ ){
					obj = this.elements[ ix ];
					if( ev.originalSource === undefined ){
						ev.originalSource = "BindableObject.handleEvent['change']";
					}
					if( ev.target.name === obj.prop && ev.originalSource !== 'BindableObject.updateDomElement' ){
						//select box binding
						if( ev.target.type.match( /select/ ) ){
							this.change( { 	id : ev.target.value,
									text : ev.target.options[ev.target.selectedIndex].innerHTML
								}, ev, obj.prop );
						}
						else{
						// text input binding
						this.change( ev.target.value, ev, obj.prop );
						}
					}
				}

		}
	};

	// for each bound control, update the value
	BindableObject.prototype.change = function( value, event, property ) {
		var ix, obj;
		if( event.originalSource === undefined ){
			event.originalSource = "BindableObject.change";
		}
		console.log( "change : Source: " + event.originalSource );

		// this code changes the value of the BinableObject to the incoming value
		if ( property === undefined ) {
			// Directive is to replace the entire value stored in the BindableObject
			// update the BindableObject value with the incoming value
			// value could be anything, simple value or object, does not matter
			this.data = value;
		}
		else if ( typeof this.data === 'object' ) {
			//Directive is to replace a property of the value stored in the BindableObject
			// verifies _this "data" is an object and not a simple value
			// update the BindableObject's specified property with the incoming value
			// value could be anything, simple value or object, does not matter

			if( this.data[ property ] === undefined ){
				throw( "Property '" + property + "' of object is undefined." );
			}
			else{
				this.data[ property ] = value;
			}
			// check if we are updating only a single property or the entire object

		}
		else {
			throw "Attempt to treat a simple value as an object with properties. Change fails.";
		}

		// check if there are other dom elements linked to the property
		for( ix = 0; ix < this.elements.length; ix++ ){
			obj = this.elements[ ix ];
			if( ( property === undefined || property === obj.prop ) && ( event.target !== undefined && obj.elem != event.target ) ){
				this.updateDomElement( event,  obj.elem, value );
			}
		}
	};

	BindableObject.prototype.updateDom = function( event, value, property ){
		var ix, obj, key;
		if( event.originalSource === undefined ){
			event.originalSource = 'BindableObject.updateDom';
		}
		// this code changes the value of the DOM element to the incoming value
		for( ix = 0; ix < this.elements.length; ix++ ){
			obj = this.elements[ ix ];

			if ( property === undefined  ){
				if( typeof value === 'object' ){
					for( key in value ){
						if( this.elements[ ix ].prop === key ){
							this.updateDomElement( event, obj.elem, value[ key ] );
						}
					}
				}else{
					// this code sets the value of each control bound to the BindableObject
					// to the correspondingly bound property of the incoming value
					this.updateDomElement( event, obj.elem, value );
				}

				//break;
			}else if ( obj.prop === property ){
				this.updateDomElement( event, obj.elem, value );
			}
		}
	};

	BindableObject.prototype.updateDomElement = function( event, selector, newValue ){
		var valueElements = "INPUT";
		var arrayElements = "OL,UL,SELECT";
		var wrappingElements = "DIV,SPAN,H1,H2,H3,H4,H5,H6,P,TEXTAREA,LABEL,BUTTON";

		var _updateOptions = function(){
			switch( selector.tagName ){
				case "SELECT":
					while (selector.firstChild) {
						selector.removeChild(selector.firstChild);
					}
					var idx = 0;
					newValue.forEach( function( item ){
						var opt = document.createElement("option");
						if( typeof item === 'object' ){
							opt.value = item.id;
							opt.text = item.text;
						}else{
							opt.text = item;
						}
						selector.appendChild( opt );
						idx++;
					});
				break;
				case "UL":
				case "OL":
					while (selector.firstChild) {
						selector.removeChild(selector.firstChild);
					}
					newValue.forEach( function( item ){
						var opt = document.createElement("li");
						opt.textContent = item;
						selector.appendChild( opt );
					});
				break;
			}
		};

		if( event.originalSource === undefined ){
			event.originalSource = "BindableObject.updateDomElement";
		}
		//console.log( "updateDomElement : selector: { type: " + selector.nodeName + ", name: " + selector.name + " }" );
		//console.log( "updateDomElement : Source: " + event.originalSource );

		// updating the bound DOM element requires understanding what kind of DOM element is being updated
		// and what kind of data we are dealing with

		if( typeof newValue === 'object' ){
			// select box objects are populated with { text: text, id: id }
			if( valueElements.indexOf( selector.tagName ) >=0 ){
				selector.value = newValue.id;
			}else if( arrayElements.indexOf( selector.tagName ) >=0 ){
				_updateOptions();
			}else{
				selector.textContent = newValue.text;
			}
		}else{
			if( valueElements.indexOf( selector.tagName ) >=0 ){
				selector.value = newValue;
			}else if( arrayElements.indexOf( selector.tagName ) >=0 ){
				_updateOptions();
			}else{
				selector.textContent = newValue;
			}
		}

		// we have three ways to update values
		// 1. via a change event fired from changing the DOM element
		// 2. via model.set() which should change the model value and update the dom element(s)
		// 3. via a second dom element, e.g. when more than one dom element is linked to the property
		//    we need to be able to update the other dom elements without entering an infinite loop
		if( event.originalSource !== 'model.set' ){
			var ev = new Event( "change" );
			ev.originalSource = 'model.updateDomElement';
			selector.dispatchEvent( ev );
		}
	};

	// bind an object to an HTML element
	BindableObject.prototype.bind = function( element, property ) {
		var e, _this = this;

		if ( property === undefined ) {
			// BindableObject holds a simple value
			// set the DOM element value to the value of the Bindable object
			element.value = this.data;
			e = {
				elem : element,
				prop : ""
			};
		}
		else {
			// Bindable object holds an object with properties
			// set the DOM element value to the value of the specified property in the
			// Bindable object
			element.value = this.data[ property ];
			e = {
				elem : element,
				prop : property
			};
		}
		//add an event listener so we get notified when the value of the DOM element
		// changes
		//element[ 0 ].addEventListener( "change", this, false );
		//IE 8 support
		if (element.addEventListener) {
			element.addEventListener( "change", this, false);
		}
		else {
			// IE8
			element.attachEvent("onpropertychange", function( ev ){
				if( ev.propertyName === 'value'){
					var el = ev.srcElement, val = ( el.nodeName === 'SELECT' ) ? { id: el.value, text: el.options[el.selectedIndex].innerHTML } : el.value;
					_this.change( val, { target: el }, el.name );
				}
			});
		}
		this.elements.push( e );
	};

	return {
		BindableObject : BindableObject,

		create : function( name, value, element ) {
			if ( element !== undefined ) {
				_model[ name ] = new BindableObject( value, element );
			}
			else {
				_model[ name ] = new BindableObject( value );
			}
		},

		destroy : function( name ) {
			delete _model[ name ];
		},

		bind : function( name, element ) {
			var n = name.split( "." );
			if ( n.length === 1 ) {
				_model[ name ].bind( element );
			}
			else {
				_model[ n[ 0 ] ].bind( element, n[ 1 ] );
			}
		},

		exists : function( name ) {
			if ( _model.hasOwnProperty( name ) ) {
				return true;
			}

			return false;
		},
		// getter - if the name of the object to get has a period, we are
		// getting a property of the object, e.g. user.firstname
		get : function( name ) {
			if( name === null || name === undefined ){
				console.log( "Expected parameter [name] is not defined." );
				return;
			}

			var n = name.split( "." );
			try{
				if ( n.length === 1 ) {
					if( _model[name] === undefined ){
						throw "Key '" + name + "' does not exist in the model.";
					}else{
						return _model[ name ].data;
					}
				}
				if( _model[n[0]] === undefined ){
					throw "Key '" + n[0] + "' does not exist in the model.";
				}
				return _model[n[0]].data[ n[ 1 ] ];

			}catch( e ){
				console.log( e );
				return undefined;
			}
		},

		// setter - if the name of the object to set has a period, we are
		// setting a property of the object, e.g. user.firstname
		set : function( name, value ) {
			if( name === null || name === undefined ){
				console.log( "Expected parameter [name] is not defined." );
				return;
			}

			var n = name.split( "." ), event = { originalSource : 'model.set'};
			if ( this.exists( n[ 0 ] ) === false ) {
				if ( n.length === 1 ) {
					this.create( name, value );
				}
				else {
					// don't create complex objects, only simple values
					throw "Object " + n[ 0 ] + "is not yet initialized.";
				}
			}
			else {
				if ( n.length === 1 ) {
					_model[ name ].change( value, event );
					_model[ name ].updateDom( event, value );
				}
				else {
					_model[ n[ 0 ] ].change( value, event, n[1] );
					_model[ n[ 0 ] ].updateDom( event, value, n[1] );
				}
			}
			//console.log( "model value set: name: " + name + ", value: " + value );
		}
	};

}() );
