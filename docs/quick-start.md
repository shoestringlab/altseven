# Quick Start Tutorial: Building Your First AltsEven App

## Overview

This tutorial will guide you through building a complete Todo application using AltsEven. You'll learn all the core concepts by creating a real, functional application.

**What you'll build**:
- Todo list with add/edit/delete functionality
- Mark todos as complete/incomplete
- Filter todos (All/Active/Completed)
- Persistent storage via REST API

**What you'll learn**:
- Creating Entities with validation
- Implementing Services for business logic
- Using DataProviders for state management
- Building Views with templates and events
- Connecting everything together

**Time to complete**: 30-45 minutes

## Prerequisites

- Basic HTML, CSS, and JavaScript knowledge
- Understanding of ES6 modules
- Node.js installed (for local development server)
- Text editor or IDE

## Table of Contents

1. [Project Setup](#project-setup)
2. [Step 1: Create the Entity](#step-1-create-the-entity)
3. [Step 2: Create the Service](#step-2-create-the-service)
4. [Step 3: Create the DataProvider](#step-3-create-the-dataprovider)
5. [Step 4: Create the Views](#step-4-create-the-views)
6. [Step 5: Wire Everything Together](#step-5-wire-everything-together)
7. [Step 6: Add Filtering](#step-6-add-filtering)
8. [Step 7: Test Your App](#step-7-test-your-app)
9. [Next Steps](#next-steps)

## Project Setup

### Create Project Structure

Create the following directory structure:

```
todo-app/
├── client/
│   ├── assets/
│   │   ├── js/
│   │   │   ├── entity/
│   │   │   │   └── todo.js
│   │   │   ├── service/
│   │   │   │   └── todo.js
│   │   │   ├── dataprovider/
│   │   │   │   └── todolist.js
│   │   │   ├── view/
│   │   │   │   ├── todos.js
│   │   │   │   └── todo.js
│   │   │   ├── event/
│   │   │   │   └── todo.js
│   │   │   ├── app.js
│   │   │   └── app.config.js
│   │   └── css/
│   │       └── main.css
│   ├── lib/
│   │   └── altseven/
│   │       └── dist/
│   │           └── a7.js
│   └── index.html
└── package.json
```

### Download AltsEven

Copy the AltsEven framework file to `client/lib/altseven/dist/a7.js` from the AltsEven repository.

### Create index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App - AltsEven</title>
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/assets/js/app.js"></script>
</body>
</html>
```

### Create Basic CSS

Create `client/assets/css/main.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f5f5;
  padding: 20px;
}

.todo-app {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.todo-app h1 {
  color: #333;
  margin-bottom: 20px;
}

.todo-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-form input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.todo-form button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.todo-form button:hover {
  background: #0056b3;
}

.todo-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.todo-filters button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.todo-filters button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.todo-list {
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
  gap: 10px;
}

.todo-item:hover {
  background: #f9f9f9;
}

.todo-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-item .todo-text {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.todo-item button {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.todo-item button:hover {
  background: #c82333;
}

.todo-stats {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  color: #666;
  font-size: 14px;
}
```

## Step 1: Create the Entity

Entities represent your data models with validation and schema.

Create `client/assets/js/entity/todo.js`:

```javascript
import { Entity } from "/lib/altseven/dist/a7.js";

export class Todo extends Entity {
  constructor(obj) {
    super();

    // Define the schema for validation
    this.schema = {
      todoID: { type: "string", required: false },  // Server generates
      title: { type: "string", required: true },
      completed: { type: "boolean", default: false },
      dateCreated: { type: "date", default: () => new Date() },
      dateCompleted: { type: "date", required: false }
    };

    // Initialize with validation
    this.init(obj);
  }

  // Business method: Toggle completion status
  toggle() {
    this.completed = !this.completed;
    this.dateCompleted = this.completed ? new Date() : null;
  }

  // Business method: Check if active
  isActive() {
    return !this.completed;
  }
}
```

**What's happening here**:
- We extend the `Entity` base class
- Define a `schema` with field types and validation rules
- Call `this.init(obj)` to validate and populate the entity
- Add business methods for entity-specific logic

## Step 2: Create the Service

Services handle business logic, API calls, and caching.

Create `client/assets/js/service/todo.js`:

```javascript
import { Service } from "/lib/altseven/dist/a7.js";
import { Todo } from "/assets/js/entity/todo.js";

export class TodoService extends Service {
  constructor() {
    super({
      entityClass: Todo,
      entityName: "Todo"
    });

    // API endpoint (we'll simulate it for now)
    this.baseURL = "/api/todos";
    this.mockData = new Map(); // Simulate server storage
    this.nextID = 1;
  }

  // Override create to simulate API
  async create(obj) {
    const todo = new Todo(obj);

    // Simulate API call delay
    await this.delay(100);

    // Simulate server generating ID
    todo.todoID = `todo-${this.nextID++}`;
    this.mockData.set(todo.todoID, todo);

    // Store in cache with "create" action
    this.cacheSet(todo, "create");

    return todo;
  }

  // Override read to simulate API
  async read(todoID) {
    await this.delay(100);

    const todoData = this.mockData.get(todoID);
    if (!todoData) {
      throw new Error("Todo not found");
    }

    const todo = new Todo(todoData);
    this.cacheSet(todo, "update");

    return todo;
  }

  // Override update to simulate API
  async update(obj) {
    await this.delay(100);

    const todo = new Todo(obj);
    this.mockData.set(todo.todoID, todo);

    this.cacheSet(todo, "update");

    return todo;
  }

  // Override delete to simulate API
  async delete(todoID) {
    await this.delay(100);

    this.mockData.delete(todoID);
    this.cacheDelete(todoID);

    return true;
  }

  // Custom method: Get all todos
  async getAllTodos() {
    await this.delay(100);

    const todos = Array.from(this.mockData.values());
    await this.merge(todos);

    return todos;
  }

  // Refresh method for DataProvider binding
  async refreshTodos(args, dp) {
    const todoIDs = dp.getState().todoIDs;
    if (!todoIDs || todoIDs.length === 0) {
      return [];
    }

    // Get todos from cache (already loaded)
    return this.filter({ todoID: todoIDs });
  }

  // Helper: Simulate network delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**What's happening here**:
- Extend `Service` base class
- Set `entityClass` and `entityName`
- Override CRUD methods to simulate API (in real app, use `this.remote.invoke()`)
- Use `cacheSet()` to store entities and fire events
- Add custom methods (`getAllTodos()`, `refreshTodos()`)

**Note**: In a real application, you'd use `this.remote.invoke()` to call actual REST APIs. We're simulating it here for simplicity.

## Step 3: Create the DataProvider

DataProviders manage view state and data bindings.

Create `client/assets/js/dataprovider/todolist.js`:

```javascript
import { DataProvider } from "/lib/altseven/dist/a7.js";
import { Todo } from "/assets/js/entity/todo.js";

export class TodoListDP extends DataProvider {
  constructor(props) {
    // Configure data binding
    props.binding = {
      todos: {
        entityClass: Todo,
        func: props.todoService.refreshTodos,
        dependencies: ["todos.todoIDs"],
        renderOn: ["create", "delete"],  // Only re-render list on add/remove
        sort: { dateCreated: "desc" }
      }
    };

    // Define state schema
    props.schema = {
      todos: { type: "map", entityClass: Todo },
      todoIDs: { type: "array" },
      filter: { type: "string", default: "all" }  // all, active, completed
    };

    super(props);
  }
}
```

**What's happening here**:
- Configure binding in constructor (before `super()`)
- Specify `entityClass` for type safety
- Set `func` to call when dependencies change
- Use `renderOn: ["create", "delete"]` for performance (only re-render list when todos added/removed)
- Define state schema with types

## Step 4: Create the Views

Views render UI and handle user interactions.

### Create Todos List View

Create `client/assets/js/view/todos.js`:

```javascript
import { View } from "/lib/altseven/dist/a7.js";
import { a7 } from "/assets/js/app.js";
import { Todo } from "/assets/js/entity/todo.js";
import { TodoListDP } from "/assets/js/dataprovider/todolist.js";
import { TodoView } from "/assets/js/view/todo.js";

export var Todos = function(props) {
  const todoService = a7.services.getService("todoService");
  const todos = new View(props);

  // Register view with UI manager
  a7.ui.register(todos);

  // Create and register DataProvider
  const tldp = new TodoListDP({
    view: todos,
    todoService: todoService,
    state: {
      todos: new Map(),
      todoIDs: [],
      filter: "all"
    }
  });

  a7.dataproviders.register(tldp);
  todos.registerDataProvider(tldp);

  // Template function
  todos.template = function() {
    const state = todos.getState();

    return `
      <div class="todo-app">
        <h1>My Todos</h1>

        <!-- Add Todo Form -->
        <form class="todo-form" data-onsubmit="addTodo">
          <input
            type="text"
            name="title"
            placeholder="What needs to be done?"
            required
          />
          <button type="submit">Add</button>
        </form>

        <!-- Filter Buttons -->
        <div class="todo-filters">
          <button
            class="${state.filter === 'all' ? 'active' : ''}"
            data-onclick="setFilter"
            data-filter="all"
          >All</button>
          <button
            class="${state.filter === 'active' ? 'active' : ''}"
            data-onclick="setFilter"
            data-filter="active"
          >Active</button>
          <button
            class="${state.filter === 'completed' ? 'active' : ''}"
            data-onclick="setFilter"
            data-filter="completed"
          >Completed</button>
        </div>

        <!-- Todo List -->
        <ul class="todo-list" name="todoList"></ul>

        <!-- Stats -->
        <div class="todo-stats">
          ${todos.getStats()}
        </div>
      </div>
    `;
  };

  // Helper method: Get statistics
  todos.getStats = function() {
    const state = todos.getState();
    const total = state.todos.size;
    const active = Array.from(state.todos.values()).filter(t => !t.completed).length;
    const completed = total - active;

    return `${total} total, ${active} active, ${completed} completed`;
  };

  // Lifecycle: Create child views after render
  todos.on("rendered", function() {
    const state = todos.getState();

    // Remove existing children to avoid duplicates
    todos.removeChildren();

    // Get filtered todos
    const filteredTodos = todos.getFilteredTodos();

    // Create a TodoView for each todo
    filteredTodos.forEach((todo) => {
      TodoView({
        id: "todo-" + todo.todoID,
        parentID: todos.props.id,
        selector: todos.props.selector + ' ul[name="todoList"]',
        todo: todo
      });
    });
  });

  // Helper method: Get filtered todos
  todos.getFilteredTodos = function() {
    const state = todos.getState();
    let todosArray = Array.from(state.todos.values());

    if (state.filter === "active") {
      todosArray = todosArray.filter(t => !t.completed);
    } else if (state.filter === "completed") {
      todosArray = todosArray.filter(t => t.completed);
    }

    // Sort by dateCreated (newest first)
    todosArray.sort((a, b) => b.dateCreated - a.dateCreated);

    return todosArray;
  };

  // Event handlers
  todos.eventHandlers = {
    addTodo: function(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const title = formData.get("title").trim();

      if (title) {
        a7.events.publish("todo.create", { title: title });
        event.target.reset(); // Clear form
      }
    },

    setFilter: function(event) {
      const filter = event.target.dataset.filter;
      todos.setState({ filter: filter });
    }
  };
};
```

### Create Individual Todo View

Create `client/assets/js/view/todo.js`:

```javascript
import { View } from "/lib/altseven/dist/a7.js";
import { a7 } from "/assets/js/app.js";
import { TodoDP } from "/assets/js/dataprovider/todo.js";
import { Todo } from "/assets/js/entity/todo.js";

export var TodoView = function(props) {
  const todoService = a7.services.getService("todoService");
  const todo = new View(props);

  a7.ui.register(todo);

  // Create DataProvider with entity-specific binding
  const tdp = new TodoDP({
    view: todo,
    todoID: props.todo.todoID,  // Bind to specific todo
    state: {
      todo: props.todo
    }
  });

  a7.dataproviders.register(tdp);
  todo.registerDataProvider(tdp);

  // Template
  todo.template = function() {
    const state = todo.getState();
    const todoItem = state.todo;

    return `
      <li class="todo-item ${todoItem.completed ? 'completed' : ''}">
        <input
          type="checkbox"
          ${todoItem.completed ? 'checked' : ''}
          data-onclick="toggleTodo"
        />
        <span class="todo-text">${todoItem.title}</span>
        <button data-onclick="deleteTodo">Delete</button>
      </li>
    `;
  };

  // Event handlers
  todo.eventHandlers = {
    toggleTodo: function(event) {
      const state = todo.getState();
      a7.events.publish("todo.toggle", {
        todoID: state.todo.todoID
      });
    },

    deleteTodo: function(event) {
      const state = todo.getState();
      a7.events.publish("todo.delete", {
        todoID: state.todo.todoID
      });
    }
  };
};
```

### Create Todo DataProvider

Create `client/assets/js/dataprovider/todo.js`:

```javascript
import { DataProvider } from "/lib/altseven/dist/a7.js";
import { Todo } from "/assets/js/entity/todo.js";

export class TodoDP extends DataProvider {
  constructor(props) {
    // Configure entity-specific binding
    props.binding = props.todoID
      ? {
          todo: {
            entityClass: Todo,
            id: props.todoID  // Bind to specific todo by ID
          }
        }
      : {};

    props.schema = {
      todo: { type: "object", entityClass: Todo }
    };

    super(props);
  }
}
```

## Step 5: Wire Everything Together

### Create Event Handlers

Create `client/assets/js/event/todo.js`:

```javascript
import { a7 } from "/assets/js/app.js";

export function registerTodoEvents() {
  const todoService = a7.services.getService("todoService");

  // Event: Create todo
  a7.events.subscribe("todo.create", async function(obj) {
    const todo = await todoService.create({
      title: obj.title
    });

    // Update todos list
    const view = a7.ui.getView("todos");
    const currentIDs = view.getState().todoIDs;
    view.setState({
      todoIDs: [...currentIDs, todo.todoID]
    });
  });

  // Event: Toggle todo completion
  a7.events.subscribe("todo.toggle", async function(obj) {
    const todo = todoService.get(obj.todoID);
    if (todo) {
      todo.toggle();
      await todoService.update(todo);
    }
  });

  // Event: Delete todo
  a7.events.subscribe("todo.delete", async function(obj) {
    await todoService.delete(obj.todoID);

    // Update todos list
    const view = a7.ui.getView("todos");
    const currentIDs = view.getState().todoIDs;
    view.setState({
      todoIDs: currentIDs.filter(id => id !== obj.todoID)
    });
  });

  // Event: Load all todos
  a7.events.subscribe("todos.loadAll", async function() {
    const todos = await todoService.getAllTodos();

    const view = a7.ui.getView("todos");
    view.setState({
      todoIDs: todos.map(t => t.todoID)
    });
  });
}
```

### Create Config

Create `client/assets/js/app.config.js`:

```javascript
export const config = {
  apiBaseURL: "/api",
  debugMode: true
};
```

### Create Main App File

Create `client/assets/js/app.js`:

```javascript
import { Application } from "/lib/altseven/dist/a7.js";
import { config } from "/assets/js/app.config.js";
import { TodoService } from "/assets/js/service/todo.js";
import { Todos } from "/assets/js/view/todos.js";
import { registerTodoEvents } from "/assets/js/event/todo.js";

// Create application instance
export const a7 = new Application({ config: config });

// Initialize application
async function initializeApp() {
  // 1. Register services
  a7.services.register("todoService", new TodoService());

  // 2. Register event handlers
  registerTodoEvents();

  // 3. Create main view
  Todos({
    id: "todos",
    selector: "#app"
  });

  // 4. Render initial view
  const todosView = a7.ui.getView("todos");
  todosView.render();

  // 5. Load initial data
  a7.events.publish("todos.loadAll", {});
}

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
```

## Step 6: Add Filtering

The filtering functionality is already built in! Let's review how it works:

1. **Filter State**: Stored in TodoListDP state (`filter: "all"`)

2. **Filter Buttons**: In Todos view template:
   ```javascript
   <button
     class="${state.filter === 'all' ? 'active' : ''}"
     data-onclick="setFilter"
     data-filter="all"
   >All</button>
   ```

3. **Set Filter Handler**: In Todos event handlers:
   ```javascript
   setFilter: function(event) {
     const filter = event.target.dataset.filter;
     todos.setState({ filter: filter }); // Triggers re-render
   }
   ```

4. **Filter Logic**: In `getFilteredTodos()` helper:
   ```javascript
   if (state.filter === "active") {
     todosArray = todosArray.filter(t => !t.completed);
   } else if (state.filter === "completed") {
     todosArray = todosArray.filter(t => t.completed);
   }
   ```

When user clicks a filter button, the view re-renders with filtered todos!

## Step 7: Test Your App

### Run Development Server

You'll need a local web server to run the app (ES modules require HTTP).

**Option 1: Using Python**:
```bash
cd todo-app/client
python3 -m http.server 8000
```

**Option 2: Using Node.js (http-server)**:
```bash
npm install -g http-server
cd todo-app/client
http-server -p 8000
```

**Option 3: Using VS Code Live Server extension**:
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### Open in Browser

Navigate to `http://localhost:8000`

### Test Functionality

1. **Add a todo**: Type "Buy groceries" and click "Add"
   - Todo appears in list
   - Form clears

2. **Add more todos**: Add "Learn AltsEven" and "Build an app"

3. **Mark complete**: Click checkbox on "Buy groceries"
   - Text strikes through
   - Stats update

4. **Filter todos**:
   - Click "Active" → Shows only uncompleted todos
   - Click "Completed" → Shows only completed todos
   - Click "All" → Shows all todos

5. **Delete todo**: Click "Delete" on any todo
   - Todo removed immediately
   - Stats update

### What's Happening Under the Hood

When you check a todo:
```
1. User clicks checkbox
   ↓
2. TodoView event handler fires
   ↓
3. Event "todo.toggle" published
   ↓
4. Event handler gets todo from cache
   ↓
5. todo.toggle() called (business method)
   ↓
6. Service.update() called
   ↓
7. Service.merge() updates cache
   ↓
8. "entityChanged" event fired with action: "update"
   ↓
9. TodoDP (bound to this todo) receives update
   ↓
10. ONLY that TodoView re-renders (not entire list!)
    ↓
11. Stats recalculated and displayed
```

**Performance**: Because we used `renderOn: ["create", "delete"]`, toggling a todo only re-renders that single item, not the entire list!

## Next Steps

Congratulations! You've built a complete AltsEven application. Here are some ideas to extend it:

### Add Features

1. **Edit todo titles**:
   - Add double-click to edit
   - Show input field
   - Save on blur or Enter key

2. **Due dates**:
   - Add `dueDate` field to schema
   - Show date picker in form
   - Highlight overdue todos

3. **Categories**:
   - Add `category` field
   - Create category filter
   - Color-code by category

4. **Persistence**:
   - Replace mock service with real REST API
   - Use `this.remote.invoke()` for API calls
   - Add localStorage fallback

5. **Search**:
   - Add search input
   - Filter todos by search term
   - Highlight matching text

### Learn More

Read these guides to deepen your knowledge:

- **[Application Architecture](./application-architecture.md)** - Understand the layered architecture
- **[Building Blocks](./building-blocks.md)** - Deep dive into Entities, Services, DataProviders, Views
- **[Data Flow](./data-flow.md)** - How data moves through the system
- **[Best Practices](./best-practices.md)** - Patterns and anti-patterns
- **[Entity-Specific Binding](./entity-specific-binding.md)** - Optimize performance for complex views
- **[RenderOn Control](./renderon-binding-control.md)** - Fine-grained re-render control

### Connect Real API

To connect a real API, update `TodoService`:

```javascript
import { Service } from "/lib/altseven/dist/a7.js";
import { Todo } from "/assets/js/entity/todo.js";

export class TodoService extends Service {
  constructor() {
    super({
      entityClass: Todo,
      entityName: "Todo"
    });

    this.baseURL = "https://api.example.com/todos";
  }

  // Use built-in CRUD methods that call real API
  // create(), read(), update(), delete() are inherited!

  // Custom method
  async getAllTodos() {
    const response = await this.remote.invoke({
      url: this.baseURL,
      method: "GET"
    });

    return await this.merge(response.todos);
  }

  // Refresh method for DataProvider
  async refreshTodos(args, dp) {
    const todoIDs = dp.getState().todoIDs;
    if (todoIDs && todoIDs.length > 0) {
      return await this.readMany(todoIDs);
    }
    return [];
  }
}
```

The inherited CRUD methods will automatically:
- Make HTTP requests to your API
- Handle errors
- Cache responses
- Fire events for automatic view updates

### Build Something Bigger

Apply what you learned to build:
- **Blog**: Posts, comments, users, tags
- **E-commerce**: Products, cart, orders, checkout
- **Social network**: Posts, likes, comments, followers
- **Project management**: Projects, tasks, teams, timelines

AltsEven scales from simple apps to complex applications!

## Summary

You've learned:

✅ **Entities**: Define data models with validation
✅ **Services**: Implement business logic and caching
✅ **DataProviders**: Manage state and bindings
✅ **Views**: Render UI and handle events
✅ **Events**: Coordinate between components
✅ **Reactive updates**: Automatic view synchronization
✅ **Performance**: Selective re-rendering with `renderOn`

You now have the foundation to build real-world AltsEven applications!

## Troubleshooting

### Issue: Blank page, no errors

**Check**:
1. Open browser DevTools → Console tab
2. Look for module loading errors
3. Verify file paths match your structure
4. Ensure running from web server (not `file://`)

### Issue: "Failed to fetch" errors

**Cause**: ES modules require HTTP server

**Solution**: Use Python, http-server, or Live Server (see [Run Development Server](#run-development-server))

### Issue: Todos not appearing

**Check**:
1. DevTools → Console for JavaScript errors
2. Verify `a7.events.publish("todos.loadAll")` is called
3. Check that TodoService is registered: `a7.services.getService("todoService")`
4. Verify view is rendering: `a7.ui.getView("todos")`

### Issue: Checkbox doesn't toggle todo

**Check**:
1. Event handler is defined in `todo.eventHandlers`
2. `data-onclick="toggleTodo"` attribute is on checkbox
3. Event "todo.toggle" has subscriber
4. Service.update() is being called

### Issue: Stats not updating

**Cause**: Todos view not re-rendering after state change

**Solution**: Ensure `setState()` is called, which triggers re-render

### Get Help

- Review the documentation guides
- Check the example application in `/examples/client/`
- Post issues on the AltsEven GitHub repository

Happy coding with AltsEven! 🚀
