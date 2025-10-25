# AltsEven Application Architecture

## Overview

AltsEven is a full-featured JavaScript framework designed for building scalable, reactive single-page applications. This document describes the recommended architecture for building applications using AltsEven.

## Table of Contents

1. [Architectural Layers](#architectural-layers)
2. [Core Principles](#core-principles)
3. [Component Model](#component-model)
4. [Data Flow](#data-flow)
5. [Separation of Concerns](#separation-of-concerns)
6. [Directory Structure](#directory-structure)

---

## Architectural Layers

AltsEven applications follow a layered architecture with clear separation between data, logic, and presentation:

```
┌─────────────────────────────────────────────────────┐
│                 Presentation Layer                   │
│              (Views & UI Components)                 │
├─────────────────────────────────────────────────────┤
│                  State Layer                         │
│              (DataProviders & Bindings)              │
├─────────────────────────────────────────────────────┤
│               Business Logic Layer                   │
│              (Services & Event Handlers)             │
├─────────────────────────────────────────────────────┤
│                   Data Layer                         │
│              (Entities & Schemas)                    │
├─────────────────────────────────────────────────────┤
│              Communication Layer                     │
│            (Remote API & WebSocket)                  │
└─────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Data Layer (Entities)
- **Purpose**: Define data structure and validation rules
- **Components**: Entity classes with schemas
- **Responsibility**: Data modeling, validation, type coercion

```javascript
export class Product extends Entity {
  static schema = {
    productId: { type: "string", id: true, required: true },
    name: { type: "string", required: true },
    price: { type: "number", required: true },
    inStock: { type: "boolean", required: false }
  };
}
```

#### 2. Communication Layer (Remote API)
- **Purpose**: Handle HTTP/WebSocket communication
- **Components**: Remote modules, API configurations
- **Responsibility**: Network communication, token management

#### 3. Business Logic Layer (Services & Events)
- **Purpose**: Implement business rules and coordinate operations
- **Components**: Service classes, event handlers
- **Responsibility**: CRUD operations, caching, custom business logic

```javascript
export class ProductService extends Service {
  constructor() {
    super({
      id: "products",
      key: "productId",
      entityClass: Product,
      remoteMethods: {
        create: "POST /api/products",
        read: "GET /api/products/:productId",
        update: "PUT /api/products/:productId",
        delete: "DELETE /api/products/:productId",
        readMany: "POST /api/products/many"
      }
    });
  }
}
```

#### 4. State Layer (DataProviders)
- **Purpose**: Manage view state and data bindings
- **Components**: DataProvider classes
- **Responsibility**: State management, automatic data synchronization

```javascript
export class ProductListDP extends DataProvider {
  constructor(props) {
    props.binding = {
      products: {
        entityClass: Product,
        func: productService.refreshProducts,
        dependencies: ["productList.categoryId"],
        renderOn: ["create", "delete"]
      }
    };
    props.schema = {
      products: { type: "map", entityClass: Product },
      selectedCategory: { type: "string" }
    };
    super(props);
  }
}
```

#### 5. Presentation Layer (Views)
- **Purpose**: Render UI and handle user interactions
- **Components**: View classes
- **Responsibility**: Template rendering, event handling, child view management

```javascript
export var ProductList = function(props) {
  var view = new View(props);

  view.template = function() {
    const state = view.getState();
    return `
      <div class="product-list">
        ${Array.from(state.products.values())
          .map(p => `<div name="product-${p.productId}"></div>`)
          .join('')}
      </div>
    `;
  };

  return view;
};
```

---

## Core Principles

### 1. Unidirectional Data Flow

Data flows in one direction through the application:

```
User Action
    ↓
Event Handler
    ↓
Service (Business Logic)
    ↓
Service Cache Update
    ↓
DataProvider (via Binding)
    ↓
View State Update
    ↓
View Re-render
```

**Benefits:**
- Predictable state changes
- Easier debugging
- Clear data dependencies

### 2. Reactive Updates

Views automatically update when their data changes through the binding system:

```javascript
// Service cache updates trigger automatic view updates
await productService.merge([updatedProduct]);
// All views bound to this product automatically re-render
```

**Benefits:**
- No manual view updates
- Consistent state across views
- Reduced boilerplate

### 3. Component Composition

Complex UIs are built by composing smaller components:

```
App
├── Header
├── Sidebar
│   ├── Navigation
│   └── UserProfile
└── MainContent
    ├── ProductList
    │   ├── Product (item 1)
    │   ├── Product (item 2)
    │   └── Product (item 3)
    └── ProductDetail
```

**Benefits:**
- Reusable components
- Easier testing
- Better organization

### 4. Separation of Concerns

Each layer has a single, well-defined responsibility:

| Layer | Responsibility | Should NOT |
|-------|---------------|-----------|
| Entity | Data structure | Make API calls, render UI |
| Service | Business logic | Manipulate DOM, know about views |
| DataProvider | State management | Make API calls directly |
| View | Presentation | Contain business logic |
| Event Handler | Orchestration | Directly manipulate views |

---

## Component Model

### Lifecycle

Every AltsEven component follows this lifecycle:

```
1. Creation
   ↓
2. Registration (with framework)
   ↓
3. Initialization
   ↓
4. Binding Setup (if DataProvider)
   ↓
5. Initial Render
   ↓
6. Active (responds to events/data changes)
   ↓
7. Destruction
```

### Registration Pattern

Components self-register with the framework:

```javascript
// View registration
const myView = new View(props);
app.ui.register(myView);

// Service registration
const myService = new MyService();
app.services.register(myService);

// DataProvider registration
const myDP = new MyDataProvider({ view: myView });
app.dataproviders.register(myDP);
myView.registerDataProvider(myDP);
```

### Parent-Child Relationships

Components form hierarchies:

```javascript
// Parent view creates child
export var ParentView = function(props) {
  var parent = new View(props);

  // Child view
  ChildView({
    id: parent.props.id + "-child",
    parentID: parent.props.id,
    selector: parent.props.selector + ' div[name="child"]'
  });

  // Access parent from child
  const parentView = child.getParent();
  const parentState = child.getParent().getState();
};
```

---

## Data Flow

### Read Flow (Loading Data)

```
1. User navigates to page
   ↓
2. View renders with initial state
   ↓
3. DataProvider triggers dependency
   ↓
4. Service fetch method called
   ↓
5. API request sent
   ↓
6. Response returned and cached
   ↓
7. Service fires cacheChanged event
   ↓
8. DataProvider updates view state
   ↓
9. View re-renders with data
```

### Write Flow (Updating Data)

```
1. User clicks button
   ↓
2. Event handler publishes event
   ↓
3. Event listener calls service method
   ↓
4. Service sends API request
   ↓
5. Service updates cache
   ↓
6. Service fires entityChanged event
   ↓
7. All bound DataProviders receive update
   ↓
8. All affected views re-render
```

### Example: Creating a Product

```javascript
// 1. User clicks "Create Product" button
view.eventHandlers.createProduct = function(event) {
  // 2. Publish event with data
  app.events.publish("product.create", {
    name: event.target.form.name.value,
    price: event.target.form.price.value
  });
};

// 3. Event handler receives event
eventHandlers["product.create"] = async function(data) {
  // 4. Call service
  const productService = app.services.getService("products");
  const product = await productService.create(data);

  // 5. Service automatically:
  // - Sends POST request
  // - Caches result
  // - Fires entityChanged event

  // 6. All views with ProductDP automatically update
};
```

---

## Separation of Concerns

### What Goes Where

#### Entities
```javascript
// ✅ DO: Define data structure
static schema = {
  email: { type: "string", required: true }
};

// ✅ DO: Add validation
validate() {
  if (!this.email.includes('@')) {
    throw new Error('Invalid email');
  }
}

// ❌ DON'T: Make API calls
async save() {
  await fetch('/api/users'); // NO!
}

// ❌ DON'T: Render HTML
toHTML() {
  return `<div>${this.name}</div>`; // NO!
}
```

#### Services
```javascript
// ✅ DO: Handle API communication
async create(data) {
  const response = await this.remote.invoke(this.remoteMethods.create, data);
  return response.json();
}

// ✅ DO: Implement business logic
async approveOrder(orderId) {
  const order = this.get(orderId);
  if (order.status !== 'pending') {
    throw new Error('Order not pending');
  }
  order.status = 'approved';
  return this.update(order);
}

// ❌ DON'T: Manipulate DOM
async update(item) {
  // ...
  document.querySelector('.status').textContent = 'Updated'; // NO!
}

// ❌ DON'T: Import views
import { MyView } from './view/myview.js'; // NO!
```

#### DataProviders
```javascript
// ✅ DO: Define bindings
props.binding = {
  products: {
    entityClass: Product,
    func: productService.refreshProducts
  }
};

// ✅ DO: Define schema
props.schema = {
  products: { type: "map" },
  filter: { type: "string" }
};

// ❌ DON'T: Make API calls directly
async loadProducts() {
  const response = await fetch('/api/products'); // NO!
}

// ❌ DON'T: Manipulate view DOM
updateView() {
  this.view.element.innerHTML = '<div>New content</div>'; // NO!
}
```

#### Views
```javascript
// ✅ DO: Define templates
view.template = function() {
  const state = view.getState();
  return `<div>${state.product.name}</div>`;
};

// ✅ DO: Handle UI events
view.eventHandlers.clickButton = function(event) {
  app.events.publish("action.perform", { id: event.target.dataset.id });
};

// ❌ DON'T: Make API calls
view.eventHandlers.save = async function() {
  await fetch('/api/save'); // NO! Use events + services
}

// ❌ DON'T: Implement business logic
view.eventHandlers.approve = function() {
  if (item.status === 'pending' && item.total > 100) { // NO!
    // Complex logic belongs in service
  }
}
```

#### Event Handlers
```javascript
// ✅ DO: Orchestrate operations
eventHandlers["order.create"] = async function(data) {
  const orderService = app.services.getService("orders");
  const order = await orderService.create(data);

  const userService = app.services.getService("users");
  const user = userService.get(data.userId);
  user.orderCount++;
  await userService.merge([user]);
};

// ✅ DO: Coordinate multiple services
eventHandlers["checkout.complete"] = async function(data) {
  await orderService.create(data.order);
  await paymentService.process(data.payment);
  await inventoryService.reduce(data.items);
};

// ❌ DON'T: Manipulate views directly
eventHandlers["product.update"] = async function(data) {
  // ...
  view.setState({ product: updated }); // NO! Use service.merge()
}
```

---

## Directory Structure

### Recommended Organization

```
app/
├── assets/
│   └── js/
│       ├── app.js                    # Application entry point
│       ├── app.main.js               # View initialization
│       ├── app.routes.js             # Route definitions
│       ├── app.auth.js               # Authentication logic
│       ├── app.constants.js          # Constants
│       ├── app.utils.js              # Utility functions
│       │
│       ├── entity/                   # Data models
│       │   ├── product.js
│       │   ├── order.js
│       │   ├── user.js
│       │   └── category.js
│       │
│       ├── service/                  # Business logic
│       │   ├── product.js
│       │   ├── order.js
│       │   ├── user.js
│       │   └── category.js
│       │
│       ├── dataprovider/            # State management
│       │   ├── productlist.js
│       │   ├── product.js
│       │   ├── orderlist.js
│       │   └── order.js
│       │
│       ├── view/                    # UI components
│       │   ├── header.js
│       │   ├── sidebar.js
│       │   ├── products.js          # List view
│       │   ├── product.js           # Item view
│       │   ├── orderform.js
│       │   └── dashboard.js
│       │
│       ├── event/                   # Event handlers
│       │   ├── product.js
│       │   ├── order.js
│       │   └── user.js
│       │
│       └── remote/                  # API modules
│           ├── product.js
│           ├── order.js
│           └── user.js
│
└── index.html                       # Entry HTML file
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Entity | `entityname.js` | `product.js` |
| Service | `entityname.js` | `product.js` |
| DataProvider (collection) | `entitynamelist.js` | `productlist.js` |
| DataProvider (single) | `entityname.js` | `product.js` |
| View (container) | `viewname.js` | `dashboard.js` |
| View (list) | `entitynames.js` | `products.js` |
| View (item) | `entityname.js` | `product.js` |
| Event handlers | `entityname.js` | `product.js` |

---

## Application Initialization

### Standard Bootstrap Process

```javascript
// app.js
import { Application } from "/lib/altseven/dist/a7.js";
import { routes } from "/assets/js/app.routes.js";
import { ProductService } from "/assets/js/service/product.js";
import { OrderService } from "/assets/js/service/order.js";

// Create application instance
const app = new Application({
  name: "MyApp",

  auth: {
    sessionTimeout: 15 * 60 * 1000,
    useTokens: true
  },

  logging: {
    logLevel: "ERROR,WARN,INFO",
    toBrowserConsole: true
  },

  remote: {
    loginURL: "/api/auth/login",
    logoutURL: "/api/auth/logout",
    refreshURL: "/api/auth/refresh",
    tokenType: "X-Token"
  },

  router: {
    useEvents: true,
    routes: routes
  },

  security: {
    enabled: true
  },

  ui: {
    renderer: "templateLiterals",
    debounceTime: 18
  },

  services: [
    new ProductService(),
    new OrderService()
  ]
});

// Initialize asynchronously
await app.init();

// Export for use in other modules
export { app as a7 };
```

### View Initialization

```javascript
// app.main.js
import { a7 } from "/assets/js/app.js";
import { Dashboard } from "/assets/js/view/dashboard.js";
import { Products } from "/assets/js/view/products.js";
import { Header } from "/assets/js/view/header.js";

// Initialize views
export function initViews() {
  // Header (always visible)
  Header({
    id: "header",
    selector: "#header"
  });

  // Dashboard (route: /)
  Dashboard({
    id: "dashboard",
    selector: "#main-content"
  });

  // Products (route: /products)
  Products({
    id: "products",
    selector: "#main-content"
  });
}

// Call after app initialization
initViews();
```

### Route Configuration

```javascript
// app.routes.js
export const routes = [
  {
    path: "/",
    action: function() {
      a7.ui.setLayout("dashboard");
    }
  },
  {
    path: "/products",
    action: function() {
      a7.events.publish("products.load", {});
      a7.ui.setLayout("products");
    }
  },
  {
    path: "/products/:id",
    action: function(params) {
      a7.events.publish("product.load", { id: params.id });
      a7.ui.setLayout("product-detail");
    }
  },
  {
    path: "/orders",
    action: function() {
      a7.events.publish("orders.load", {});
      a7.ui.setLayout("orders");
    }
  }
];
```

---

## Communication Patterns

### Event-Driven Architecture

AltsEven uses a pub/sub event system for loose coupling:

```javascript
// Publisher (View)
view.eventHandlers.deleteProduct = function(event) {
  const productId = event.target.dataset.id;
  app.events.publish("product.delete", { productId });
};

// Subscriber (Event Handler)
import { productEvents } from "/assets/js/event/product.js";

export const productEvents = {
  "product.delete": async function(data) {
    const productService = app.services.getService("products");
    await productService.delete({ productId: data.productId });

    // Service.delete() automatically:
    // - Removes from cache
    // - Fires entityDeleted event
    // - Triggers view updates
  }
};

// Registration
Object.entries(productEvents).forEach(([event, handler]) => {
  app.events.subscribe(event, handler);
});
```

### Built-in Events

The framework fires these events automatically:

| Event | When | Payload |
|-------|------|---------|
| `entityChanged` | Entity created/updated | `{ id, entity, action }` |
| `entityDeleted` | Entity deleted | `{ id, action }` |
| `cacheChanged` | Service cache updated | `{ action, item }` |
| `stateChanged` | View/DP state changed | `{ [key]: value }` |
| `relationLoaded` | Relation loaded | `{ propertyName, criteria, count }` |
| `relationRefreshed` | Relation refreshed | `{ propertyName, criteria, count }` |
| `login` | User logged in | `{ user }` |
| `logout` | User logged out | `{}` |
| `sessionTimeout` | Session expired | `{}` |

---

## State Management

### State Hierarchy

```
Application
  ├─ Global State (Model)
  │   └─ Shared data across all views
  │
  ├─ Service Cache
  │   └─ Cached entities (Products, Orders, etc.)
  │
  ├─ View State
  │   ├─ View 1 (local state)
  │   │   └─ DataProvider (bound state)
  │   └─ View 2 (local state)
  │       └─ DataProvider (bound state)
  │
  └─ Session Storage
      └─ User, tokens, persistent state
```

### When to Use Each

#### Model (Global State)
```javascript
// Use for: App-wide shared state
app.model.set("currentTheme", "dark");
app.model.set("sidebarExpanded", true);

// Access from anywhere
const theme = app.model.get("currentTheme");
```

#### Service Cache
```javascript
// Use for: Entity data, API responses
await productService.read({ productId: "123" });
const product = productService.get("123");

// Automatically shared across all views
```

#### View State
```javascript
// Use for: View-specific UI state
view.setState({
  selectedTab: "details",
  expandedSections: ["pricing", "inventory"]
});
```

#### DataProvider State
```javascript
// Use for: Bound data + local state
const dp = new DataProvider({
  view: myView,
  state: {
    products: new Map(),      // Bound data
    selectedId: null,         // Local state
    filterText: ""           // Local state
  }
});
```

---

## Best Practices

### 1. One Entity Per File
```javascript
// ✅ Good: product.js
export class Product extends Entity { }

// ❌ Bad: entities.js
export class Product extends Entity { }
export class Order extends Entity { }
export class User extends Entity { }
```

### 2. Co-locate Related Files
```
entity/product.js
service/product.js
dataprovider/productlist.js
dataprovider/product.js
view/products.js
view/product.js
event/product.js
```

### 3. Use Descriptive IDs
```javascript
// ✅ Good
Dashboard({ id: "dashboard" });
ProductList({ id: "product-list" });
Product({ id: "product-" + product.productId });

// ❌ Bad
Dashboard({ id: "d1" });
ProductList({ id: "list" });
Product({ id: product.productId });
```

### 4. Always Register Components
```javascript
// ✅ Good
const view = new View(props);
app.ui.register(view);

const dp = new DataProvider({ view });
app.dataproviders.register(dp);

// ❌ Bad
const view = new View(props);
// Not registered - won't work!
```

### 5. Use Binding System
```javascript
// ✅ Good: Automatic synchronization
const dp = new ProductDP({
  view: productView,
  productId: product.productId  // Binds to specific product
});

// ❌ Bad: Manual updates
productView.setState({ product: updatedProduct });
```

---

## Performance Considerations

### 1. Use renderOn for Collections
```javascript
// Only re-render list when items added/removed
binding: {
  products: {
    renderOn: ["create", "delete"]
  }
}
```

### 2. Use Entity-Specific Bindings
```javascript
// Bind to specific entity, not entire cache
const dp = new ProductDP({
  view: productView,
  productId: product.productId
});
```

### 3. Debounce User Input
```javascript
import { debounce } from "throttle-debounce";

view.eventHandlers.search = debounce(300, function(event) {
  app.events.publish("products.search", { query: event.target.value });
});
```

### 4. Lazy Load Child Views
```javascript
// Only create child views when needed
view.addChild = function(item) {
  const childId = "item-" + item.id;
  if (!app.ui.getView(childId)) {
    ChildView({ id: childId, item: item });
  }
};
```

### 5. Use Template Caching
```javascript
// Framework automatically caches templates
// Clear when needed:
view.templateCache = null;
```

---

## Security Considerations

### 1. Enable Authentication
```javascript
const app = new Application({
  security: { enabled: true },
  auth: {
    sessionTimeout: 15 * 60 * 1000,
    useTokens: true
  }
});
```

### 2. Validate Entity Data
```javascript
export class Product extends Entity {
  static schema = {
    price: { type: "number", required: true }
  };

  validate() {
    if (this.price < 0) {
      throw new Error("Price cannot be negative");
    }
  }
}
```

### 3. Sanitize User Input
```javascript
// Use framework's built-in escaping in templates
view.template = function() {
  // Text content auto-escaped
  return `<div>${state.userInput}</div>`;
};
```

### 4. Use Token-Based Auth
```javascript
remote: {
  loginURL: "/api/auth/login",
  tokenType: "X-Token"  // or "Bearer"
}
```

---

## Next Steps

- **[Building Blocks](./building-blocks.md)** - Deep dive into Entity, Service, DataProvider, View
- **[Quick Start Tutorial](./quick-start.md)** - Build your first application
- **[Data Flow Guide](./data-flow.md)** - Understanding data movement
- **[Best Practices](./best-practices.md)** - Patterns and anti-patterns
- **[API Reference](./api-reference.md)** - Complete API documentation

---

## Conclusion

AltsEven's architecture promotes:
- **Clear separation of concerns** through layered design
- **Reactive programming** through automatic data binding
- **Loose coupling** through event-driven communication
- **Maintainability** through consistent patterns and conventions

By following these architectural principles, you can build scalable, performant, and maintainable single-page applications.
