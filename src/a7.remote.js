a7.Remote = ( function(){
	var modules = {},
		hOP = modules.hasOwnProperty;

	return{
		setModule: function( key, module ){
			modules[ key ] = module;
		},

		// a7.Remote.invoke( 'user.refresh', params );
		invoke: function( moduleAction, params ){
			var mA = moduleAction.split( "." );
			// if no action specified, return the list of actions
			if( mA.length < 2 ){
				a7.Log.error( "No action specified. Valid actions are: " + Object.keys( modules[ mA[ 0 ] ] ).toString() );
				return;
			}
			if( typeof modules[ mA[ 0 ] ][ mA[ 1 ] ] === "function" ){
				modules[ mA[ 0 ] ][ mA[ 1 ] ]( params );
			}
		}
	};
}());