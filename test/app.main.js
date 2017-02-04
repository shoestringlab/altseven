var app = { 
	main: ( function() {
		"use strict";
	
		return {
			run: function(){
				a7.Events.publish( "helloworld" );
				var mainDiv = document.querySelector( "div[name='main']" );
				mainDiv.innerHTML = "Username: ";
				mainDiv.innerHTML += a7.UI.render( "input", { name:'username', value:"", type: "text" } );
				mainDiv.innerHTML += "<br/>";
				mainDiv.innerHTML += "Password: ";
				mainDiv.innerHTML += a7.UI.render( "input", { name:'password', value:"", type: "password" } );
				mainDiv.innerHTML += "<br/>";
				mainDiv.innerHTML += a7.UI.render( "input", { name:'login', value:"Login", type: "button" } );

				var loginButton = document.querySelector( "input[name='login']" );

				loginButton.addEventListener( "click", function( event ){
					a7.Events.publish( "auth.login", { 	username:	document.querySelector( "input[name='username']" ).value,
														password: document.querySelector( "input[name='password']" ).value }, app.auth.loginHandler );
				});
			}
		};
	}()),

	auth: ( function() {
		"use strict";

		return {
			loginHandler: function( promise ){
				promise
					.then( function( response ){
						a7.Log.info( JSON.stringify( response.json() ) );
					});
			}
		};
	}())
};