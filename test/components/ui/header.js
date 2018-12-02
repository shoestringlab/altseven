function Header(props) {
  this.config(props);
  this.state = { user: props.user };
  this.render();
}

Header.prototype = {
  config: function(props) {
    this.selector = props.selector;
  },

  render: function() {
    // render Header
    this.selector.innerHTML = a7.ui.render("header", this.state.user);
    this.setEventHandlers();
  },

  setEventHandlers: function() {
    var signout = document.querySelector("a[name='signout']");

    signout.addEventListener("click", function(event) {
      a7.events.publish("auth.signout", []);
    });
  }
};
