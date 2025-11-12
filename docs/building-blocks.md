# Building Blocks

## Overview

Altseven applications are built from four primary building blocks: **Entities**, **Services**, **DataProviders**, and **Views**. This document provides comprehensive guidance on using each component.

## Table of Contents

1. [Entities](#entities)
2. [Services](#services)
3. [DataProviders](#dataproviders)
4. [Views](#views)
5. [Event System](#event-system)

---

## Entities

### Purpose

Entities represent your application's data models. They provide:
- Data structure definition through schemas
- Type validation and coercion
- Property getters/setters
- Serialization/deserialization

### Basic Entity

```javascript
import { Entity } from "/lib/altseven/dist/a7.js";

export class Product extends Entity {
  static schema = {
    productId: { type: "string", id: true, required: true },
    name: { type: "string", required: true },
    description: { type: "string", required: false },
    price: { type: "number", required: true },
    inStock: { type: "boolean", required: false },
    createdAt: { type: "date", required: false }
  };
}
```

### Schema Definition

#### Field Types

| Type | JavaScript Type | Example |
|------|----------------|---------|
| `"string"` | String | `"Product Name"` |
| `"number"` | Number | `29.99` |
| `"integer"` | Number (integer) | `42` |
| `"boolean"` | Boolean | `true`, `false` |
| `"date"` | Date | `new Date()` |
| `"object"` | Object | `{ key: "value" }` |
| `"array"` | Array | `[1, 2, 3]` |
| `"map"` | Map | `new Map()` |

#### Field Options

```javascript
{
  fieldName: {
    type: "string",           // Required: field type
    id: true,                 // Optional: primary key field
    required: true,           // Optional: validation rule
    entityClass: RelatedEntity // Optional: nested entity type
  }
}
```

### Creating Entities

```javascript
// From plain object
const product = new Product({
  productId: "prod-123",
  name: "Widget",
  price: 29.99,
  inStock: true
});

// Validation happens automatically
console.log(product.productId); // "prod-123"
console.log(product.price);     // 29.99
```

### Type Coercion

Entities automatically coerce types:

```javascript
const product = new Product({
  productId: "prod-123",
  name: "Widget",
  price: "29.99",      // String coerced to Number
  inStock: 1,          // 1 coerced to true
  createdAt: "2025-01-15"  // String coerced to Date
});

console.log(typeof product.price);    // "number"
console.log(typeof product.inStock);  // "boolean"
console.log(product.createdAt instanceof Date); // true
```

### Validation

#### Required Fields

```javascript
static schema = {
  name: { type: "string", required: true },
  email: { type: "string", required: true }
};

// Throws error: "Missing required field: email"
const invalid = new User({ name: "John" });
```

#### Custom Validation

```javascript
export class Product extends Entity {
  static schema = {
    productId: { type: "string", id: true, required: true },
    price: { type: "number", required: true },
    discountPrice: { type: "number", required: false }
  };

  validate() {
    super.validate(); // Call parent validation

    if (this.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (this.discountPrice && this.discountPrice >= this.price) {
      throw new Error("Discount price must be less than regular price");
    }
  }
}
```

### Nested Entities

```javascript
export class Order extends Entity {
  static schema = {
    orderId: { type: "string", id: true, required: true },
    customer: {
      type: "object",
      required: true,
      entityClass: User  // Nested entity
    },
    items: { type: "array", required: true },
    total: { type: "number", required: true }
  };
}

// Automatically instantiates nested entity
const order = new Order({
  orderId: "ord-123",
  customer: { userId: "user-1", name: "John" },  // Plain object
  items: [],
  total: 100
});

console.log(order.customer instanceof User); // true
```

### Serialization

```javascript
// To plain object
const data = product.toFlatObject();
console.log(data); // { productId: "prod-123", name: "Widget", ... }

// From plain object
const product = new Product();
product.fromFlatObject(data);
```

### Composite Keys

```javascript
export class OrderItem extends Entity {
  static schema = {
    orderId: { type: "string", id: true, required: true },
    productId: { type: "string", id: true, required: true },
    quantity: { type: "number", required: true },
    price: { type: "number", required: true }
  };
}

// Composite key: "orderId|productId"
```

---

## Services

### Purpose

Services provide:
- CRUD operations for entities
- Business logic implementation
- API communication
- Data caching
- Custom operations

### Basic Service

```javascript
import { Service } from "/lib/altseven/dist/a7.js";
import { Product } from "/assets/js/entity/product.js";

export class ProductService extends Service {
  constructor() {
    super({
      id: "products",              // Service identifier
      key: "productId",            // Primary key field
      entityClass: Product,        // Entity class
      remoteMethods: {
        create: "POST /api/products",
        read: "GET /api/products/:productId",
        update: "PUT /api/products/:productId",
        delete: "DELETE /api/products/:productId",
        readAll: "GET /api/products",
        readMany: "POST /api/products/many"
      }
    });
  }
}
```

### Registration

```javascript
// In app.js
import { ProductService } from "/assets/js/service/product.js";

const app = new Application({
  services: [
    new ProductService()
  ]
});

// Access from anywhere
const productService = app.services.getService("products");
```

### CRUD Operations

#### Create

```javascript
const product = await productService.create({
  name: "New Widget",
  price: 29.99,
  inStock: true
});

// Automatically:
// - Sends POST request
// - Creates Entity instance
// - Caches result
// - Fires entityChanged event
```

#### Read (Single)

```javascript
const product = await productService.read({
  productId: "prod-123"
});

// Checks cache first, fetches if not present
```

#### Read Many

```javascript
const products = await productService.readMany([
  "prod-123",
  "prod-456",
  "prod-789"
]);

// Returns: Map<productId, Product>
// Skips IDs already in cache
// Only fetches missing items
```

#### Update

```javascript
const product = productService.get("prod-123");
product.price = 24.99;

await productService.update(product);

// Automatically:
// - Sends PUT request
// - Updates cache
// - Fires entityChanged event
```

#### Delete

```javascript
await productService.delete({ productId: "prod-123" });

// Automatically:
// - Sends DELETE request
// - Removes from cache
// - Fires entityDeleted event
```

### Cache Management

#### Get from Cache

```javascript
// Get single item
const product = productService.get("prod-123");

// Get all cached items
const allProducts = productService.get(); // Returns Map
```

#### Manual Cache Updates

```javascript
// Add/update in cache
productService.cacheSet(product);
// Fires: entityChanged event

// Remove from cache
productService.cacheDelete("prod-123");
// Fires: entityDeleted event

// Merge multiple items
await productService.merge([product1, product2, product3]);
// Fires: entityChanged for each
```

### Custom Methods

```javascript
export class ProductService extends Service {
  constructor() {
    super({
      id: "products",
      key: "productId",
      entityClass: Product,
      remoteMethods: {
        // Standard CRUD...
        create: "POST /api/products",
        read: "GET /api/products/:productId",

        // Custom methods
        search: "GET /api/products/search",
        getByCategory: "GET /api/products/category/:categoryId",
        getFeatured: "GET /api/products/featured"
      }
    });
  }

  // Custom method implementation
  async search(query) {
    const response = await this.remote.invoke(
      this.remoteMethods.search,
      { q: query }
    );
    const data = await response.json();
    return this.convertArrayToMap(data);
  }

  async getFeatured() {
    const response = await this.remote.invoke(
      this.remoteMethods.getFeatured,
      {}
    );
    const data = await response.json();
    await this.merge(data); // Cache results
    return this.convertArrayToMap(data);
  }
}

// Usage
const results = await productService.search("widget");
const featured = await productService.getFeatured();
```

### Filtering

```javascript
// Get all products from cache
const allProducts = productService.get();

// Filter by conditions
const inStockProducts = productService.filter(allProducts, {
  inStock: ["=", true]
});

const expensiveProducts = productService.filter(allProducts, {
  price: [">", 100]
});

// Multiple conditions (AND)
const results = productService.filter(allProducts, {
  inStock: ["=", true],
  price: ["<", 50]
});
```

### Sorting

```javascript
const allProducts = productService.get();

// Sort by price ascending
const sorted = productService.sort(allProducts, {
  price: "asc"
});

// Sort by date descending
const sorted = productService.sort(allProducts, {
  createdAt: "desc"
});
```

### DataProvider Integration

```javascript
// Custom refresh function for DataProvider
export class ProductService extends Service {
  // ...

  // Called by DataProvider when dependencies change
  refreshActiveProducts = async function(args, dp) {
    const categoryId = dp.view.getState().selectedCategory;

    const response = await this.invoke("getByCategory", {
      categoryId: categoryId
    });

    return response; // Returns Map of products
  };
}
```

---

## DataProviders

### Purpose

DataProviders manage:
- View state
- Data bindings
- Automatic synchronization
- Dependency tracking

### Basic DataProvider

```javascript
import { DataProvider } from "/lib/altseven/dist/a7.js";
import { Product } from "/assets/js/entity/product.js";

export class ProductListDP extends DataProvider {
  constructor(props) {
    props.binding = {
      products: {
        entityClass: Product,
        func: productService.refreshActiveProducts,
        dependencies: ["productList.selectedCategory"],
        renderOn: ["create", "delete"]
      }
    };

    props.schema = {
      products: { type: "map", entityClass: Product },
      selectedCategory: { type: "string" },
      filterText: { type: "string" }
    };

    super(props);
  }
}
```

### Registration

```javascript
// Create view first
const productListView = new View({ id: "product-list" });

// Create DataProvider for view
const dp = new ProductListDP({
  view: productListView,
  state: {
    products: new Map(),
    selectedCategory: "all",
    filterText: ""
  }
});

// Register with app
app.dataproviders.register(dp);

// Register with view
productListView.registerDataProvider(dp);
```

### Binding Configuration

#### Entity Collection Binding

```javascript
binding: {
  products: {
    entityClass: Product,            // Entity class
    func: productService.refresh,    // Refresh function
    dependencies: ["view.categoryId"], // When to refresh
    filter: { inStock: ["=", true] }, // Filter conditions
    sort: { price: "asc" },          // Sort order
    renderOn: ["create", "delete"]   // When to re-render
  }
}
```

#### Entity-Specific Binding

```javascript
// Bind to single entity by ID
binding: {
  product: {
    entityClass: Product,
    id: "prod-123"  // Specific product ID
  }
}

// Automatically updates when this product changes
```

#### Multiple Bindings

```javascript
binding: {
  products: {
    entityClass: Product,
    func: productService.refreshProducts
  },
  categories: {
    entityClass: Category,
    func: categoryService.getAll
  }
}
```

### Dependencies

Dependencies trigger automatic refreshes:

```javascript
dependencies: ["productList.selectedCategory"]

// When productList view's selectedCategory state changes
// → DataProvider automatically calls refresh function
// → Updates bound data
// → View re-renders
```

#### Dependency Formats

```javascript
// Same view
dependencies: ["selectedCategory"]

// Parent view
dependencies: ["parentView.categoryId"]

// Multiple dependencies
dependencies: ["categoryId", "sortOrder", "filterText"]
```

### State Management

```javascript
// Set state (triggers re-render)
dp.setState({
  selectedCategory: "electronics",
  filterText: "phone"
});

// Set state without re-render
dp.setStateOnly({
  selectedCategory: "electronics"
});

// Get state
const state = dp.getState();
console.log(state.selectedCategory);
```

### Entity Map Relations

```javascript
export class UserDP extends DataProvider {
  constructor(props) {
    props.schema = {
      user: { type: "object" },
      orders: {
        type: "entityMap",               // Special type
        service: "orders",               // Service ID
        fetchMethod: "getUserOrders",    // Method to fetch IDs
        defaultCriteria: {
          limit: 10,
          offset: 0
        }
      }
    };

    super(props);
  }
}

// Load relation
await userDP.loadRelation("orders", {
  userId: "user-123",
  limit: 10,
  offset: 0
});

// Refresh (pagination)
await userDP.refresh("orders", { offset: 10 });

// Clear
userDP.clearRelation("orders");
```

### RenderOn Control

```javascript
binding: {
  products: {
    entityClass: Product,
    renderOn: ["create", "delete"]  // Only re-render on these actions
  }
}

// "create" - Entity added
// "update" - Entity modified (usually skip for collections)
// "delete" - Entity removed
```

---

## Views

### Purpose

Views handle:
- UI rendering
- User interactions
- Child view management
- Template generation

### Basic View

```javascript
import { View } from "/lib/altseven/dist/a7.js";
import { ProductListDP } from "/assets/js/dataprovider/productlist.js";

export var ProductList = function(props) {
  var view = new View(props);
  app.ui.register(view);

  // Create DataProvider
  const dp = new ProductListDP({
    view: view,
    state: {
      products: new Map(),
      selectedId: null
    }
  });

  app.dataproviders.register(dp);
  view.registerDataProvider(dp);

  // Template
  view.template = function() {
    const state = view.getState();

    return `
      <div class="product-list">
        <h2>Products (${state.products.size})</h2>
        ${Array.from(state.products.values())
          .map(p => `
            <div name="product-${p.productId}"
                 data-id="${p.productId}"
                 data-onclick="selectProduct">
            </div>
          `)
          .join('')}
      </div>
    `;
  };

  // Event handlers
  view.eventHandlers = {
    selectProduct: function(event) {
      const productId = event.currentTarget.dataset.id;
      view.setState({ selectedId: productId });
    }
  };

  return view;
};
```

### Registration

```javascript
const view = new View({
  id: "product-list",
  selector: "#main-content"
});

app.ui.register(view);
```

### Template Rendering

#### Template Literals (Default)

```javascript
view.template = function() {
  const state = view.getState();

  return `
    <div class="product">
      <h3>${state.product.name}</h3>
      <p>${state.product.description}</p>
      <span class="price">$${state.product.price.toFixed(2)}</span>
    </div>
  `;
};
```

#### Mustache Templates

```javascript
// In app.js
const app = new Application({
  ui: {
    renderer: "mustache"
  }
});

// In view
view.template = function() {
  const state = view.getState();

  return {
    template: `
      <div class="product">
        <h3>{{product.name}}</h3>
        <p>{{product.description}}</p>
        <span class="price">\${{product.price}}</span>
      </div>
    `,
    data: state
  };
};
```

#### Handlebars Templates

```javascript
// In app.js
const app = new Application({
  ui: {
    renderer: "handlebars"
  }
});

// In view
view.template = function() {
  const state = view.getState();

  return {
    template: `
      <div class="product-list">
        {{#each products}}
        <div class="product">
          <h3>{{name}}</h3>
          <span>\${{price}}</span>
        </div>
        {{/each}}
      </div>
    `,
    data: { products: Array.from(state.products.values()) }
  };
};
```

### Event Handling

#### Declarative Events

```javascript
view.template = function() {
  return `
    <button data-onclick="handleClick">Click Me</button>
    <input data-oninput="handleInput" />
    <form data-onsubmit="handleSubmit">
      <button type="submit">Submit</button>
    </form>
  `;
};

view.eventHandlers = {
  handleClick: function(event) {
    console.log("Button clicked", event);
  },

  handleInput: function(event) {
    const value = event.target.value;
    view.setState({ inputValue: value });
  },

  handleSubmit: function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    app.events.publish("form.submit", Object.fromEntries(formData));
  }
};
```

#### Supported Events

```javascript
// Mouse events
data-onclick, data-ondblclick, data-onmousedown, data-onmouseup
data-onmouseover, data-onmouseout, data-onmousemove

// Form events
data-onsubmit, data-onchange, data-oninput, data-onfocus, data-onblur

// Keyboard events
data-onkeydown, data-onkeyup, data-onkeypress

// Drag events
data-ondragstart, data-ondragend, data-ondrop, data-ondragover
```

### Child Views

```javascript
export var ProductList = function(props) {
  var view = new View(props);
  app.ui.register(view);

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

  // Create child views
  view.addChildProduct = function(product) {
    ProductItem({
      id: "product-" + product.productId,
      parentID: view.props.id,
      selector: view.props.selector + ` div[name="product-${product.productId}"]`,
      product: product
    });
  };

  // After render, create children
  view.on("rendered", function() {
    const state = view.getState();
    state.products.forEach(product => {
      view.addChildProduct(product);
    });
  });

  return view;
};
```

### Parent-Child Communication

```javascript
// Child accesses parent
const child = new View({ id: "child", parentID: "parent" });
const parent = child.getParent();
const parentState = child.getParent().getState();

// Parent accesses children
const children = parent.children;
const child = app.ui.getView("child-id");
```

### State Management

```javascript
// Set state (triggers re-render)
view.setState({
  selectedId: "prod-123",
  filterText: "widget"
});

// Get state
const state = view.getState();
console.log(state.selectedId);

// Skip re-render
view.skipRender = true;
view.setState({ count: state.count + 1 });
```

### Lifecycle Events

```javascript
view.on("rendered", function() {
  console.log("View rendered");
  // Initialize plugins, attach listeners, etc.
});

view.on("destroyed", function() {
  console.log("View destroyed");
  // Cleanup
});
```

### Debounced Rendering

```javascript
// Configured globally
const app = new Application({
  ui: {
    debounceTime: 18  // milliseconds
  }
});

// View automatically debounces re-renders
// Multiple setState calls within 18ms → single render
```

---

## Event System

### Purpose

The event system provides:
- Loose coupling between components
- Centralized event handling
- Cross-component communication

### Publishing Events

```javascript
// From view
view.eventHandlers.deleteProduct = function(event) {
  const productId = event.currentTarget.dataset.id;

  app.events.publish("product.delete", {
    productId: productId
  });
};

// From anywhere
app.events.publish("notification.show", {
  message: "Product deleted",
  type: "success"
});
```

### Subscribing to Events

```javascript
// event/product.js
export const productEvents = {
  "product.create": async function(data) {
    const productService = app.services.getService("products");
    const product = await productService.create(data);
  },

  "product.update": async function(data) {
    const productService = app.services.getService("products");
    const product = productService.get(data.productId);
    Object.assign(product, data);
    await productService.update(product);
  },

  "product.delete": async function(data) {
    const productService = app.services.getService("products");
    await productService.delete({ productId: data.productId });
  }
};

// Register all events
Object.entries(productEvents).forEach(([event, handler]) => {
  app.events.subscribe(event, handler);
});
```

### Event Naming Convention

```
<entity>.<action>
<feature>.<action>
<component>.<action>

Examples:
- product.create
- product.update
- product.delete
- user.login
- user.logout
- notification.show
- cart.addItem
- search.query
```

### Built-in Events

```javascript
// Service events
service.on("entityChanged", (service, args) => {
  console.log("Entity changed:", args.id, args.action);
});

service.on("entityDeleted", (service, args) => {
  console.log("Entity deleted:", args.id);
});

service.on("cacheChanged", (service, args) => {
  console.log("Cache changed:", args.action);
});

// View/DataProvider events
view.on("stateChanged", (view, changes) => {
  console.log("State changed:", changes);
});

view.on("rendered", () => {
  console.log("View rendered");
});

// DataProvider events
dp.on("relationLoaded", (dp, args) => {
  console.log("Relation loaded:", args.propertyName, args.count);
});
```

### Component Events

```javascript
// Custom component events
export class MyComponent extends Component {
  doSomething() {
    // ... do work ...

    // Fire custom event
    this.fireEvent("workCompleted", {
      result: "success",
      data: processedData
    });
  }
}

// Subscribe
component.on("workCompleted", (comp, args) => {
  console.log("Work completed:", args.result);
});
```

---

## Integration Example

### Complete Feature Implementation

```javascript
// 1. Entity
export class Order extends Entity {
  static schema = {
    orderId: { type: "string", id: true, required: true },
    userId: { type: "string", required: true },
    total: { type: "number", required: true },
    status: { type: "string", required: true },
    items: { type: "array", required: true },
    createdAt: { type: "date", required: false }
  };
}

// 2. Service
export class OrderService extends Service {
  constructor() {
    super({
      id: "orders",
      key: "orderId",
      entityClass: Order,
      remoteMethods: {
        create: "POST /api/orders",
        read: "GET /api/orders/:orderId",
        update: "PUT /api/orders/:orderId",
        delete: "DELETE /api/orders/:orderId",
        readMany: "POST /api/orders/many",
        getUserOrders: "GET /api/users/:userId/orders"
      }
    });
  }

  refreshUserOrders = async function(args, dp) {
    const userId = dp.view.getState().userId;
    const response = await this.invoke("getUserOrders", { userId });
    return response;
  };
}

// 3. DataProvider
export class OrderListDP extends DataProvider {
  constructor(props) {
    props.binding = {
      orders: {
        entityClass: Order,
        func: orderService.refreshUserOrders,
        dependencies: ["orderList.userId"],
        renderOn: ["create", "delete"]
      }
    };

    props.schema = {
      orders: { type: "map", entityClass: Order },
      userId: { type: "string" }
    };

    super(props);
  }
}

// 4. View
export var OrderList = function(props) {
  var view = new View(props);
  app.ui.register(view);

  const dp = new OrderListDP({
    view: view,
    state: {
      orders: new Map(),
      userId: props.userId
    }
  });

  app.dataproviders.register(dp);
  view.registerDataProvider(dp);

  view.template = function() {
    const state = view.getState();

    return `
      <div class="order-list">
        <h2>Orders (${state.orders.size})</h2>
        ${Array.from(state.orders.values())
          .map(order => `
            <div class="order" data-id="${order.orderId}">
              <span>Order #${order.orderId}</span>
              <span>$${order.total.toFixed(2)}</span>
              <span>${order.status}</span>
              <button data-onclick="cancelOrder"
                      data-id="${order.orderId}">
                Cancel
              </button>
            </div>
          `)
          .join('')}
      </div>
    `;
  };

  view.eventHandlers = {
    cancelOrder: function(event) {
      const orderId = event.currentTarget.dataset.id;
      app.events.publish("order.cancel", { orderId });
    }
  };

  return view;
};

// 5. Event Handler
export const orderEvents = {
  "order.cancel": async function(data) {
    const orderService = app.services.getService("orders");
    const order = orderService.get(data.orderId);

    if (order.status === "pending") {
      order.status = "cancelled";
      await orderService.update(order);

      app.events.publish("notification.show", {
        message: "Order cancelled",
        type: "success"
      });
    } else {
      app.events.publish("notification.show", {
        message: "Cannot cancel this order",
        type: "error"
      });
    }
  }
};
```

---

## Next Steps

- **[Application Architecture](./application-architecture.md)** - High-level architecture
- **[Quick Start Tutorial](./quick-start.md)** - Build your first app
- **[Data Flow Guide](./data-flow.md)** - Understanding data movement
- **[Best Practices](./best-practices.md)** - Patterns and anti-patterns

---

## Summary

The four building blocks work together:

1. **Entities** define your data structure
2. **Services** handle business logic and API communication
3. **DataProviders** manage state and bindings
4. **Views** render UI and handle interactions

By understanding these components and how they interact, you can build powerful, maintainable applications with Altseven.
