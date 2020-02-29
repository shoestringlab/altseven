import {a7} from '/dist/a7.js';
import {floatingpane} from '/node_modules/gadget-ui/dist/gadget-ui.es6.js';

var app = {
  main: (function() {
    "use strict";

    return {
      init: function(state) {

        // cache initial selectors
        a7.ui.setSelector( 'anonDiv', "div[name='anon']" );
        a7.ui.setSelector('secureDiv', "div[name='secure']");

        // render the login form
        app.components.LoginForm( { id: 'loginForm', selector: "div[name='anon']" } );

        var user = a7.model.get("user");

        app.components.Header( { id: 'header', user: user, selector: "div[name='header']" } );

        app.components.Todo( {
          id: 'todo',
          selector: "div[name='app']"
        } );

        a7.events.publish( "app.init", { secure: state.secure });
      }
    };
  })(),

  auth: (function() {
    "use strict";

    var _authenticate = function() {
      var promise = new Promise(function(resolve, reject) {
        // check whether user is authenticated
        a7.security.isAuthenticated(resolve, reject);
      });

      promise.then(function(secure) {
        a7.ui.views['header'].setState( { user: a7.model.get( "user" ) } );
        app.ui.setLayout(secure);
      });
    };

		var _logout;

    return {
      authenticate: _authenticate
    };
  })(),
  components: (function() {

    function Todo(props) {
      var todo = a7.components.Constructor(a7.components.View, [props], true);

      todo.state = {
        text: ""
      };

      app.components.TodoList( { id: 'todoList', parentID: 'todo', items: [], selector: "div[data-id='todoList']" } );

      todo.template = function(){
        return `<div name="todoForm">
				<h3>TODO</h3>
				<div data-id="todoList"></div>
				<form>
					<input name="todoInput" value="${todo.state.text}" data-onchange="changeTodoInput" />
					<button type="button" name="todoSubmit" data-onclick="clickSubmit">Add ${todo.children.todoList.state.items.length + 1}</button>
				</form>
				</div>`;
      };

      todo.eventHandlers = {
        changeTodoInput: function(event) {
          todo.state.text = event.target.value;
        },
        clickSubmit: function(event) {
          event.preventDefault();
          var newItem = {
            text: todo.state.text,
            id: Date.now()
          };

          todo.setState( { text: '' } );
          var items = todo.children.todoList.state.items.concat(newItem);
          todo.children.todoList.setState({
            items: items
          });
        }
      };

      return todo;
    }

    function TodoList(props) {
      var todolist = a7.components.Constructor(a7.components.View, [props], true);
      todolist.state = {
        items: props.items
      };

      todolist.template = function() {
        var str = `<ul>`;
        this.state.items.forEach(function(item) {
          str += `<li>${item.text}</li>`;
        });
        str += `</ul>`;
        return str;
      };

      return todolist;
    }

    function LoginForm(props) {
      var loginform = a7.components.Constructor(a7.components.View, [props], true);
      loginform.state = {
        username: "",
        password: ""
      };

      loginform.template = `<div name="loginDiv" class="pane" style="width:370px;">
						<div class="right-align">
							<div class="col md right-align"><label for="username">Username</label></div>
							<div class="col md"><input name="username" type="text" data-onchange="handleUsername"/></div>
						</div>
						<div class="right-align">
							<div class="col md right-align"><label for="password">Password</label></div>
							<div class="col md"><input name="password" type="password" data-onchange="handlePassword"/></div>
						</div>
						<div class="right-align">
							<div class="col md"></div>
							<div class="col md"><input name="login" type="button" value="Login" data-onclick="handleClick"/></div>
						</div>
					</div>
					<p>
						<h3>Instructions</h3>
					</p>
					<p>
						Login using the credentials:
					</p>
					<p>
						&nbsp;&nbsp;username : user
					</p>
					<p>
						&nbsp;&nbsp;password: password
					</p>`;

      loginform.eventHandlers = {
        handleClick: function(event) {

          a7.router.open( '/auth/login', {
            username: loginform.state.username,
            password: loginform.state.password,
            success: '/test/app'
          });
        },
        handleUsername: function(event) {
          loginform.state.username = event.target.value;
        },
        handlePassword: function(event) {
          loginform.state.password = event.target.value;
        }
      };

      return loginform;
    }

    function Header(props) {
      var header = a7.components.Constructor(a7.components.View, [props], true);
        
      header.state = {
        user: props.user
      };

			header.eventHandlers = {
				logout: function(){
					a7.router.open( '/auth/logout', { success: '/test/tl.htm' }) ;
				}
			};

      header.template = function(){
				return `Welcome, ${header.state.user.firstName} <a name="signout" data-onclick="logout">[ Sign out ]</a>`;
			};

      return header;
    }

    return {
      Todo: Todo,
      TodoList: TodoList,
      LoginForm: LoginForm,
      Header: Header
    };

  })(),

  events: (function() {
    a7.events.subscribe( "app.show", function( obj ){
      a7.ui.views['header'].setState( { user: a7.model.get( "user" ) } );
      app.ui.setLayout(true);
    });

    a7.events.subscribe( "app.init", function( obj ){
      app.auth.authenticate();
    });
  })(),
  remote: {},
  ui: (function() {
    "use strict";

    return {
      //	templates: _templates,
      setLayout: function(secure) {
        a7.ui.getNode( secure ? a7.ui.selectors['secureDiv'] : a7.ui.selectors['anonDiv'] ).style.display = 'block';
        a7.ui.getNode(!secure ?  a7.ui.selectors['secureDiv'] :  a7.ui.selectors['anonDiv'] ).style.display = 'none';
      }
    };
  })()
};

export var application = function init() {

  var options = {
    console: {
      enabled: true,
      container: floatingpane
    },
    logging: {
      logLevel: "INFO,ERROR,FATAL,TRACE"
    },
    // remote module is optional, only required if you want to use the built-in auth system / token system
    // or if you want to use the remote module for remote calls
    remote: {
      modules: {},
      loginURL: "/api/auth/login",
			logoutURL: "/api/auth/logout",
      refreshURL: "/api/auth/refresh",
      useTokens: true // defaults to true for the auth system
    },
    // router is optional. If you leave out the router options, it will not be initialized on app init.
    // you can manually init the router later if you choose, e.g. a7.router.init( options, [routes] );
    router: {
      options: { useEvents: true },
      routes: [
        [ '/auth/login', 'auth.login' ],
        [ '/auth/logout', 'auth.logout' ],
        [ '/test/app', 'app.show' ],
        [ '/test/tl.htm', 'app.init' ]
      ]
    },
    ui: {
      timeout: 30000
    }
  };

  var p = new Promise(function(resolve, reject) {
    a7.init(options, resolve, reject);
  });
  p.then(function(state) {
    app.main.init(state);
    a7.log.info("App init.");
  });
  p['catch'](function(message) {
    console.log(message);
  });

  return app;
};
