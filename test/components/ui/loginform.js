function LoginForm(props) {
  this.config(props);
  this.state = { username: "", password: "" };
  this.render();
}

LoginForm.prototype = {
  config: function(props) {
    this.selector = props.selector;
  },

  render: function() {
    // render login
    this.selector.innerHTML = a7.ui.render("loginForm", {});
    this.selector.innerHTML += a7.ui.render("instructions", {});
    this.setEventHandlers();
  },

  setEventHandlers: function() {
    var loginButton = document.querySelector("input[name='login']");

    loginButton.addEventListener("click", function(event) {
      a7.events.publish("auth.login", [
        document.querySelector("input[name='username']").value,
        document.querySelector("input[name='password']").value,
        app.auth.loginHandler
      ]);
    });
  }
};
