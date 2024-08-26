function User(args){
	// init User
	// if you pass an args structure into the function, the elements of args will be added to the User object
	
	Object.assign( this, args );
	return this;
}

User.prototype.getMemento = function(){
	var user = {}, self = this;
	Object.keys( this ).forEach( function( key ){
		user[ key ] = self[ key ];
	});
	return user;
};
