a7.Layout = ( function() {
		"use strict";

		var _selectors = {},
			_templateMap = {},

		_setSelector = function( name, selector ){
			_selectors[ name ] = selector;
		},

		_addTemplate = function( key, html ){
			_templateMap[ key ] = html.trim();
		},

		_loadTemplates = function( templates, resolve, reject ){
			var ot = Math.ceil( Math.random( ) * 500 );

			switch( a7.Model.get( "renderer" ) ){
				case "mustache":
					fetch( templates + '?' + ot )
						.then( function( response ) {
							return response.text();
						})
						.then( function( text ){
							a7.Log.info( "Loading Mustache templates... " );
							var parser = new DOMParser(),
								doc = parser.parseFromString( text, "text/html" ),
								scripts = doc.querySelectorAll( "script" );
							scripts.forEach( function( script ){
								_addTemplate( script.getAttribute( "id" ), script.innerHTML );
							});
							resolve();
						});

					break;
				case "handlebars":
					//not implemented
					resolve();
					break;
			}
		},
		
		_render = function( template, params ){
			switch( a7.Model.get( "renderer" ) ){
			case "mustache":
				Mustache.render( _templateMap[ template ], params );
				break;
			}
		};

		return{
			render : _render,
			selectors: _selectors,
			setSelector: _setSelector,
			init : function( options, resolve, reject ){
				var renderers = "handlebars,mustache";
				a7.Log.info( "Layout initializing..." );
				if( renderers.indexOf( a7.Model.get( "renderer" ) ) >=0 ){
					a7.Model.set( "templatesLoaded", false );
					if( options.templates !== undefined ){
						_loadTemplates( options.templates, resolve, reject );
					}
				}else{
					resolve();
				}
			}
		};

}( ) );