a7.util = ( function(){


	return{
		// split by commas, used below
		split : function( val ) {
			return val.split( /,\s*/ );
		},

		// return the last item from a comma-separated list
		extractLast : function( term ) {
			return this.split( term ).pop();
		},

		// encode and decode base64
		base64 : {
			keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

			encode64 : function( input ) {
				if ( !String( input ).length ) {
					return false;
				}
				var output = "", chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				do {
					chr1 = input.charCodeAt( i++ );
					chr2 = input.charCodeAt( i++ );
					chr3 = input.charCodeAt( i++ );

					enc1 = chr1 >> 2;
					enc2 = ( ( chr1 & 3 ) << 4 ) | ( chr2 >> 4 );
					enc3 = ( ( chr2 & 15 ) << 2 ) | ( chr3 >> 6 );
					enc4 = chr3 & 63;

					if ( isNaN( chr2 ) ) {
						enc3 = enc4 = 64;
					} else if ( isNaN( chr3 ) ) {
						enc4 = 64;
					}

					output = output + this.keyStr.charAt( enc1 )
							+ this.keyStr.charAt( enc2 )
							+ this.keyStr.charAt( enc3 )
							+ this.keyStr.charAt( enc4 );
				} while ( i < input.length );

				return output;
			},

			decode64 : function( input ) {
				if ( !input ) {
					return false;
				}
				var output = "", chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
				input = input.replace( /[^A-Za-z0-9\+\/\=]/g, "" );

				do {
					enc1 = this.keyStr.indexOf( input.charAt( i++ ) );
					enc2 = this.keyStr.indexOf( input.charAt( i++ ) );
					enc3 = this.keyStr.indexOf( input.charAt( i++ ) );
					enc4 = this.keyStr.indexOf( input.charAt( i++ ) );

					chr1 = ( enc1 << 2 ) | ( enc2 >> 4 );
					chr2 = ( ( enc2 & 15 ) << 4 ) | ( enc3 >> 2 );
					chr3 = ( ( enc3 & 3 ) << 6 ) | enc4;

					output = output + String.fromCharCode( chr1 );

					if ( enc3 !== 64 ) {
						output = output + String.fromCharCode( chr2 );
					}
					if ( enc4 !== 64 ) {
						output = output + String.fromCharCode( chr3 );
					}
				} while ( i < input.length );

				return output;
			}
		},

		// add a leading zero to single numbers so the string is at least two characters
		leadingZero : function( n ) {
			return ( n < 10 ) ? ( "0" + n ) : n;
		},

		dynamicSort : function( property ) {
			var sortOrder = 1;
			if ( property[ 0 ] === "-" ) {
				sortOrder = -1;
				property = property.substr( 1 );
			}
			return function( a, b ) {
				var result = ( a[ property ] < b[ property ] ) ? -1
						: ( a[ property ] > b[ property ] ) ? 1 : 0;
				return result * sortOrder;
			};
		},

		// return yes|no for 1|0
		yesNo : function( val ) {
			return parseInt( val, 10 ) < 1 ? "No" : "Yes";
		},

		// validate a javascript date object
		isValidDate : function( d ) {
			if ( Object.prototype.toString.call( d ) !== "[object Date]" ) {
				return false;
			}
			return !isNaN( d.getTime() );
		},

		// generate a pseudo-random ID
		id : function() {
			return ( ( Math.random() * 100 ).toString() + ( Math.random() * 100 )
					.toString() ).replace( /\./g, "" );
		},

		// try/catch a function
		tryCatch : function( fn, ctx, args ) {
			var errorObject = {
				value : null
			};
			try {
				return fn.apply( ctx, args );
			} catch ( e ) {
				errorObject.value = e;
				return errorObject;
			}
		},

		// return a numeric representation of the value passed
		getNumberValue : function( pixelValue ) {
			return ( isNaN( Number( pixelValue ) ) ? Number( pixelValue.substring( 0, pixelValue.length - 2 ) ) : pixelValue );
		},

		// check whether a value is numeric
		isNumeric : function( num ) {
			return !isNaN( parseFloat( num ) ) && isFinite( num );
		},

		// get top/left offset of a selector on screen
		getOffset : function( selector ) {
			var rect = selector.getBoundingClientRect();

			return {
				top : rect.top + document.body.scrollTop,
				left : rect.left + document.body.scrollLeft
			};
		}
	};
}());
