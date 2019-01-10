import {a7} from '/dist/a7.js';
// you only need to import the floatingpane if you use it as the container for the console
//import {floatingpane} from '/node_modules/gadget-ui/dist/gadget-ui.es6.js';

var app = {
  main: (function() {
    "use strict";

    return {
      init: function(state) {
        // cache initial selectors
        a7.ui.setSelector('anonDiv', document.querySelector("div[name='anon']"));
        a7.ui.setSelector('secureDiv', document.querySelector("div[name='secure']"));
        a7.ui.setSelector('header', document.querySelector("div[name='header']"));
        a7.ui.setSelector('app', document.querySelector("div[name='app']"));

        app.main.run(state.secure);
      },

      run: function(secure) {
        // render the login form
        a7.ui.setView('loginForm', app.components.LoginForm( [] ), a7.ui.selectors['anonDiv']);

				if (secure) {
          var user = a7.model.get("a7.user");

          a7.ui.setView('header', app.components.Header( { user: user } ), a7.ui.selectors['header']);
					var todoList = app.components.TodoList( { items: [] } );
          a7.ui.setView('todo', app.components.Todo( { todoList: todoList } ), a7.ui.selectors['app']);
        }

        app.ui.setLayout(secure);
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
        app.main.run(secure);
      });
    };

		var _logout

    return {
      authenticate: _authenticate,
      loginHandler: function(json) {
        app.main.run(json.success);
      }
    };
  })(),
  components: (function() {

    function Todo(props) {
      var todo = a7.components.Constructor(a7.components.View, [props], true);
      todo.state = {
        text: ""
      };

      todo.render = function() {
        return `<div name="todoForm">
				<h3>TODO</h3>
				${todo.props.todoList.render()}
				<form>
					<input name="todoInput" value="${todo.state.text}" data-onchange="changeTodoInput" />
					<button type="button" name="todoSubmit" data-onclick="clickSubmit">Add ${todo.props.todoList.state.items.length + 1}</button>
				</form>
				</div>`;
      }

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

          todo.state.text = '';
          var items = todo.props.todoList.state.items.concat(newItem);
          todo.props.todoList.setState({
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
      todolist.render = TodoList.prototype.render;
      return todolist;
    }

    TodoList.prototype.render = function() {
      var str = `<ul>`;
      this.state.items.forEach(function(item) {
        str += `<li>${item.text}</li>`;
      });
      str += `</ul>`;
      return str;
    };

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
          a7.events.publish('auth.login', {
            username: loginform.state.username,
            password: loginform.state.password,
            callback: app.auth.loginHandler
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
					a7.events.publish( 'auth.logout', { callback: app.auth.authenticate }) ;
				}
			};

      header.render = function(){
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
  remote: {},
  ui: (function() {
    "use strict";

    return {
      //	templates: _templates,
      setLayout: function(secure) {
        a7.ui.selectors[(secure ? 'secureDiv' : 'anonDiv')].style.display = 'block';
        a7.ui.selectors[(!secure ? 'secureDiv' : 'anonDiv')].style.display = 'none';
      }
    };
  })()
};

export var application = function init() {

  var options = {
/*     auth: { //default :  sessionTimeout: ( 60 * 15 * 1000 ) // time in
      //milliseconds to refresh system auth
    },
    // console is optional (for debugging)
    console: {
      enabled: true,
      wsServer: 'ws://127.0.0.1:8000',
      container: floatingpane,
      top: 100,
      left: 500,
      height: 300,
      width: 500
    },
    // logLevel defaults to "ERROR,FATAL,INFO"
    logging: {
      logLevel: "INFO,ERROR,FATAL,TRACE"
    }, */
    // remote module is optional, only required if you want to use the built-in auth system / token system
    // or if you want to use the remote module for remote calls
    remote: {
      modules: {},
      loginURL: "/test/auth.cfc?method=login",
			logoutURL: "/test/auth.cfc?method=logout",
      refreshURL: "/test/auth.cfc?method=refresh",
      useTokens: true // defaults to true for the auth system
    }
    // defaults to templateLiterals
    /* ,
    ui: {

      renderer: "templateLiterals"
    } */
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
