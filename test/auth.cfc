/**
 * auth
 *
 * @author rmunn
 * @date 1/21/17
 **/
component {
	variables.sessionTTL = 16;
	variables.secretKey = "KJHiuY(U)@%(kj)Fjh-)i!@3ed";

	remote any function login() returnformat="json"{
		local.credentials = getHTTPBasicCredentials();
		writelog( file="a7-auth", text="username: " & local.credentials.username & ", password: " & local.credentials.password );
		if( local.credentials.username eq 'user' and local.credentials.password eq 'password' ){
			var user = { userId: 1, userName: 'user', firstName: 'User', lastName: 'Name', disabled: false };
			local.token = generateAuthToken( user = user );
			setHTTPHeader( name="X-Token", value="#local.token.token# #local.token.hash#" );
			return { success: true, user: user };
		}else{
			return { success: false, message: "Not authenticated..." };
		}
	}

	remote any function logout() returnformat="json"{
		// do logout if needed- invalidate session, etc.
		return { "success" : true };
	}

	remote any function refresh() returnformat="json"{
		if( len( getHTTPHeader("X-Token","") ) ){
			var user = checkAuthToken();
			writelog( file="a7-auth", text = "Checking token: " & serializeJSON( user ) );
			writelog( file="a7-auth", text = "user exp: " & user.expires & ", now: " & now() & ", valid: " & user.expires gt now() );
			//var user = { userId: 1, userName: 'user', firstName: 'User', lastName: 'Name', disabled: false };
			if( user.expires gt now() and NOT user.disabled ){
				local.token = generateAuthToken( user = user );
				setHTTPHeader( name="X-Token", value="#local.token.token# #local.token.hash#" );
				return { "success" : true };
			}else{
				return { "success" : false };
			}
		}else{
			return { "success" : false };
		}
	}

	private any function generateAuthToken( required struct user ){
		local.authtoken = duplicate( arguments.user );
		local.authtoken.expires = dateAdd( 'n', variables.sessionTTL, now() );
		local.jsonToken = serializeJSON( local.authtoken );
		writelog( file="a7-auth", text = "Writing new token: " & local.jsonToken );
		local.base64Token = toBase64( jsonToken );
		local.hash = hmac( local.base64Token, variables.secretKey, "HMACSHA256"  );
		local.token = { token: local.base64Token, hash: local.hash };
		return local.token;
	}

	private any function checkAuthToken( string timeout ){
		//log.debug( "Utils - check auth token" );
		local.auth = { userId : 0, expires : now() };
		local.token = getToken( getHttpRequestData().headers['X-Token'], 1," " );
		local.hashCode = getToken( getHttpRequestData().headers['X-Token'], 2," " );
		if( local.hashCode eq hmac( local.token, variables.secretKey, "HMACSHA256"  ) ){
			// token is valid
			local.auth = deserializeJSON( toString( toBinary( gettoken( getHttpRequestData().headers['X-Token'], 1," " ) ) ) );
		}
		return local.auth;
	}


	/* convenience methods from ColdBox
	 * copyright Ortus Solutions, Inc since 2005
	 * www.coldbox.org | www.luismajano.com | www.ortussolutions.com
	 **/
	struct function getHTTPBasicCredentials(){
		var results 	= structnew();
		var authHeader 	= "";

		// defaults
		results.username = "";
		results.password = "";

		// set credentials
		authHeader = getHTTPHeader("Authorization","");

		// continue if it exists
		if( len(authHeader) ){
			authHeader = charsetEncode( binaryDecode( listLast(authHeader," "),"Base64"), "utf-8");
			results.username = listFirst( authHeader, ":");
			results.password = listLast( authHeader, ":");
		}

		return results;
    }

	function getHTTPHeader( required header, defaultValue="" ){
		var headers = getHttpRequestData().headers;

		if( structKeyExists( headers, arguments.header ) ){
			return headers[ arguments.header ];
		}
		if( structKeyExists( arguments, "defaultValue" ) ){
			return arguments.defaultValue;
		}

		throw( message="Header #arguments.header# not found in HTTP headers",
			   detail="Headers found: #structKeyList( headers )#",
			   type="RequestContext.InvalidHTTPHeader");
	}

	function setHTTPHeader(
		statusCode,
		statusText="",
		name,
		value=""
	){

		// status code?
		if( structKeyExists( arguments, "statusCode" ) ){
			getPageContext().getResponse().setStatus( javaCast( "int", arguments.statusCode ), javaCast( "string", arguments.statusText ) );
		}
		// Name Exists
		else if( structKeyExists( arguments, "name" ) ){
			getPageContext().getResponse().addHeader( javaCast( "string", arguments.name ), javaCast( "string", arguments.value ) );
		} else {
			throw( message="Invalid header arguments",
				  detail="Pass in either a statusCode or name argument",
				  type="RequestContext.InvalidHTTPHeaderParameters" );
		}

		return this;
	}
}
