var a7 = {
  log: {
    error: function( message ){
      console.log( message );
    },
    warn: function( message ){
      console.log( message );
    },
    info: function( message ){
      console.log( message );
    },
    trace: function( message ){
      console.log( message );
    }
  }
}

var user = {
  firstName: 'Robert',
  lastName: 'Munn',
  age: 49
};
console.log( "Sending to model: " + user );

Model.set( "user", user );

var user2 = Model.get( "user" );
console.log( "Returned from model: " +  user2 );

user2.firstName = 'Robbie';

Model.set( "user", user2 );

var user3 = Model.get( "user" );
user3.lastName = 'Munster';

for( var ix = 1; ix <= 20; ix++ ){
  user = Model.get( "user" );
  user.age++;
  Model.set( "user", user );
  console.log( JSON.stringify( user ) );
}

console.log( "user: " + JSON.stringify( user ) );
console.log( "user2: " + JSON.stringify( user2 ) );
console.log( "user3: " + JSON.stringify( user3 ) );
