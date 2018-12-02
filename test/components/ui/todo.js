function Todo(props) {
  this.config(props);
  this.state = { text: "", items: [] };
  this.render();
  this.setEventHandlers();
}

Todo.prototype = {
  config: function(props) {
    // nothing to config yet
  },

  render: function() {
    a7.ui.render(
      "todoForm",
      { text: this.state.text, next: this.state.items.length + 1 },
      { todoList: this.state.items }
    );
    this.selector = document.querySelector("div[name='todoForm']");
    this.inputSelector = document.querySelector("input[name='todoInput']");
    this.buttonSelector = document.querySelector("button[name='todoSubmit']");
  },

  setEventHandlers: function() {
    this.inputSelector.addEventListener("change", function(event) {
      this.state.text = event.target.value;
    });

    this.buttonSelector.addEventListener("click", function(event) {
      event.preventDefault();
      var newItem = {
          text: this.state.text,
          id: Date.now()
        },
        newState = {
          items: this.state.items.concat(newItem),
          text: ""
        };
      this.state = newState;
      this.render();
    });
  }
};
