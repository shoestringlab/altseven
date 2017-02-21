app.components = ( function(){

  function Todo( props ){
    this.config( props );
    this.state = { text : "", items: [] };
    this.render();
  }

  Todo.prototype = {
    config : function( props ){
      this.selector = props.selector;
    },

    render : function(){
      this.selector.innerHTML = a7.UI.render( "todoForm", { text : this.state.text, next : this.state.items.length + 1, items :  this.state.items }, { todoList : a7.UI.getTemplate( "todoList" ) } );
      this.todoSelector = document.querySelector( "div[name='todoForm']" );
      this.inputSelector = document.querySelector( "input[name='todoInput']" );
      this.buttonSelector = document.querySelector( "button[name='todoSubmit']" );
      this.setEventHandlers();
    },

    setEventHandlers : function(){
      var self = this;
      this.inputSelector.addEventListener( "change", function( event ){
        self.state.text = event.target.value;
      });

      this.buttonSelector.addEventListener( "click", function( event ){
        event.preventDefault();
        var newItem = {
          text: self.state.text,
          id: Date.now()
        },
        newState = {
          items: self.state.items.concat( newItem ),
          text: ''};
        self.state = newState;
        self.render();
      });
    }
  };

  function LoginForm( props ){
    this.config( props );
    this.state = { username : "", password: "" };
    this.render();
  }

  LoginForm.prototype = {
    config : function( props ){
      this.selector = props.selector;
    },

    render : function(){
      // render login
      this.selector.innerHTML = a7.UI.render( "loginForm", {} );
      this.selector.innerHTML += a7.UI.render( "instructions", {} );
      this.setEventHandlers();
    },

    setEventHandlers : function(){
      var loginButton = document.querySelector( "input[name='login']" );

      loginButton.addEventListener( "click", function( event ){
        a7.Events.publish( "auth.login", [ 	document.querySelector( "input[name='username']" ).value,
                                            document.querySelector( "input[name='password']" ).value,
                                            app.auth.loginHandler ] );
      });
    }
  };

  function Header( props ){
    this.config( props );
    this.state = { user : props.user };
    this.render();
  }

  Header.prototype = {
    config : function( props ){
      this.selector = props.selector;
    },

    render : function(){
      // render Header
      this.selector.innerHTML = a7.UI.render( "header", this.state.user );
      this.setEventHandlers();
    },

    setEventHandlers : function(){
      var signout = document.querySelector( "a[name='signout']" );

      signout.addEventListener( "click", function( event ){
        a7.Events.publish( "auth.signout", [] );
      });
    }
  };

  return{
    Todo : Todo,
    LoginForm : LoginForm,
    Header : Header
  };

}());
