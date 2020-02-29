
const Base64 = require('js-base64').Base64;
const shajs = require('sha.js');
const ttl = 30;

function generateToken( user ){
  let authtoken = Object.assign( {}, user );
  let now = new Date();
  authtoken.expires =  new Date( now );
  authtoken.expires.setMinutes( now.getMinutes() + ttl );
  let base64Token = Base64.encode( JSON.stringify( authtoken ) );
  let hash = new shajs.sha512().update( base64Token ).digest('hex');

  return JSON.stringify( { token: base64Token, hash: hash } );
}

module.exports = {

  login: function( request, response ){
    let authorization = request.header( "Authorization" ) || "";
    let username = "";
    let password = "";
    if( authorization.length ){
      let authArray = authorization.split(" ");
      authorization = Base64.decode( authArray[1] );
      username = authorization.split(":")[0];
      password = authorization.split(":")[1];
    }
    if( username === 'user' && password === 'password' ){
      let user = { userId: 1, userName: 'user', firstName: 'User', lastName: 'Name', disabled: false };
      response.setHeader( "X-Token", generateToken( user ) );
      response.send( { user: user, success: true } );
    }else{
      throw( "Invalid username/password combination." );
    }
  },
  logout: function( request, response ){
    response.send( { success: true } );
  },
  refresh: function( request, response ){
    //let token = request.header( "X-Token" );
    response.send( { success: true } );
  }
};
