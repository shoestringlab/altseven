# Best Practices Guide

## Overview

This guide provides recommendations, patterns, and best practices for building high-quality Altseven applications. Following these guidelines will help you create maintainable, performant, and scalable applications.

## Table of Contents

1. [Code Organization](#code-organization)
2. [Entity Best Practices](#entity-best-practices)
3. [Service Best Practices](#service-best-practices)
4. [DataProvider Best Practices](#dataprovider-best-practices)
5. [View Best Practices](#view-best-practices)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Security](#security)
9. [Testing](#testing)
10. [Debugging](#debugging)
11. [Deployment](#deployment)
12. [Common Patterns](#common-patterns)
13. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

## Code Organization

### Keep Files Focused and Small

Each file should have a single, well-defined purpose.

```javascript
// ✅ Good: One entity per file
// entity/product.js
export class Product extends Entity { }

// ✅ Good: One service per file
// service/product.js
export class ProductService extends Service { }

// ❌ Bad: Multiple unrelated classes in one file
// entities.js
export class Product extends Entity { }
export class User extends Entity { }
export class Order extends Entity { }
```

### Use Consistent Naming

Follow established naming conventions:

```javascript
// Entities: PascalCase
class Product extends Entity { }
class OrderItem extends Entity { }

// Services: PascalCase + "Service"
class ProductService extends Service { }
class OrderService extends Service { }

// DataProviders: PascalCase + "DP"
class ProductDP extends DataProvider { }
class ProductListDP extends DataProvider { }

// Views: PascalCase
var ProductView = function(props) { }
var Products = function(props) { }

// Files: lowercase
entity/product.js
service/order.js
view/checkout.js
```

### Organize Imports Logically

```javascript
// 1. Framework imports
import { Entity, Service, View } from "/lib/altseven/dist/a7.js";

// 2. Application core
import { a7 } from "/assets/js/app.js";

// 3. Entities
import { Product } from "/assets/js/entity/product.js";

// 4. Services
import { ProductService } from "/assets/js/service/product.js";

// 5. Components (DataProvider, View)
import { ProductListDP } from "/assets/js/dataprovider/productlist.js";

// 6. Utilities
import * as utils from "/assets/js/app.utils.js";
```

### Group Related Functionality

```
assets/js/
├── features/
│   ├── products/
│   │   ├── entity/product.js
│   │   ├── service/product.js
│   │   ├── dataprovider/
│   │   │   ├── product.js
│   │   │   └── productlist.js
│   │   ├── view/
│   │   │   ├── products.js
│   │   │   └── product.js
│   │   └── event/product.js
│   └── cart/
│       └── ... (similar structure)
```

## Entity Best Practices

### Always Define Schema

Schema provides validation, type coercion, and documentation.

```javascript
// ✅ Good: Complete schema
export class Product extends Entity {
  constructor(obj) {
    super();

    this.schema = {
      productID: { type: "string", required: true },
      name: { type: "string", required: true },
      description: { type: "string" },
      price: { type: "number", required: true },
      inStock: { type: "boolean", default: true },
      dateCreated: { type: "date" },
      category: { type: "string" }
    };

    this.init(obj);
  }
}

// ❌ Bad: No schema
export class Product extends Entity {
  constructor(obj) {
    super();
    Object.assign(this, obj); // No validation!
  }
}
```

### Use Appropriate Default Values

```javascript
// ✅ Good: Sensible defaults
this.schema = {
  quantity: { type: "number", default: 1 },
  active: { type: "boolean", default: true },
  tags: { type: "array", default: () => [] },  // Function for reference types
  metadata: { type: "object", default: () => ({}) }
};

// ❌ Bad: No defaults for required fields
this.schema = {
  quantity: { type: "number" },  // Could be undefined
  tags: { type: "array" }  // Could be undefined, causes errors
};
```

### Add Business Methods

Keep business logic in entities, not views.

```javascript
// ✅ Good: Business logic in entity
export class Product extends Entity {
  isAvailable() {
    return this.inStock && this.price > 0;
  }

  getDisplayPrice() {
    return `$${this.price.toFixed(2)}`;
  }

  applyDiscount(percentage) {
    this.price = this.price * (1 - percentage / 100);
    this.discounted = true;
  }
}

// View uses entity methods
if (product.isAvailable()) {
  // ...
}

// ❌ Bad: Business logic in view
var ProductView = function(props) {
  // ...
  const isAvailable = product.inStock && product.price > 0; // Duplicated logic
  const displayPrice = "$" + product.price.toFixed(2); // Duplicated logic
};
```

### Validate Required Fields

```javascript
// ✅ Good: Mark required fields
this.schema = {
  email: { type: "string", required: true },
  password: { type: "string", required: true },
  username: { type: "string", required: true }
};

// Entity.init() will throw error if required fields missing
```

### Use Type Coercion

Let the framework handle type conversion.

```javascript
// Schema with types
this.schema = {
  price: { type: "number" },
  active: { type: "boolean" },
  dateCreated: { type: "date" }
};

// Handles automatic conversion
const product = new Product({
  price: "19.99",           // Converted to number
  active: "true",           // Converted to boolean
  dateCreated: "2025-01-15" // Converted to Date
});
```

## Service Best Practices

### Use Service Cache Appropriately

Let the service manage caching automatically.

```javascript
// ✅ Good: Use service methods for caching
const product = await productService.read(productID);  // Caches automatically
const products = await productService.readMany(productIDs);  // Batch caching

// ✅ Good: Check cache first
const cachedProduct = productService.get(productID);
if (cachedProduct) {
  // Use cached version
} else {
  // Fetch from server
  await productService.read(productID);
}

// ❌ Bad: Bypass cache
const response = await fetch(`/api/products/${productID}`);
const data = await response.json();
// No caching, no automatic view updates!
```

### Use merge() for Updates

Always use `merge()` to trigger automatic view updates.

```javascript
// ✅ Good: Use merge() for automatic updates
const product = productService.get(productID);
product.price = 24.99;
await productService.merge([product]);
// All views bound to this product automatically update!

// ❌ Bad: Manual cache update
product.price = 24.99;
productService.cacheSet(product);
const view = a7.ui.getView("product-" + productID);
view.templateCache = null;
view.render();
// Manual, error-prone, misses other views
```

### Implement Request Deduplication

Service base class provides this automatically.

```javascript
// ✅ Good: Use built-in deduplication
async loadProduct(productID) {
  return await this.read(productID);
  // Multiple simultaneous calls → single API request
}

// ❌ Bad: Custom fetch without deduplication
async loadProduct(productID) {
  const response = await fetch(`/api/products/${productID}`);
  // Multiple calls → multiple API requests
}
```

### Use Batch Operations

```javascript
// ✅ Good: Batch loading
const products = await productService.readMany([id1, id2, id3]);
// Single API call

// ❌ Bad: Individual requests
const product1 = await productService.read(id1);
const product2 = await productService.read(id2);
const product3 = await productService.read(id3);
// Three API calls
```

### Fire Specific Action Types

Use correct action types for proper event handling.

```javascript
// ✅ Good: Specific action types
async create(obj) {
  const entity = new Entity(obj);
  // API call...
  this.cacheSet(entity, "create");  // Fires action: "create"
  return entity;
}

async update(obj) {
  const entity = new Entity(obj);
  // API call...
  this.cacheSet(entity, "update");  // Fires action: "update"
  return entity;
}

async delete(id) {
  // API call...
  this.cacheDelete(id);  // Fires action: "delete"
}

// ❌ Bad: No action type differentiation
this.cacheSet(entity);  // Generic action, can't use renderOn filtering
```

### Add Error Handling

```javascript
// ✅ Good: Handle errors gracefully
async create(obj) {
  try {
    const response = await this.remote.invoke({
      url: this.baseURL,
      method: "POST",
      data: obj
    });

    const entity = new Entity(response);
    this.cacheSet(entity, "create");
    return entity;

  } catch (error) {
    // Log error
    this.log.error("Failed to create entity:", error);

    // Fire error event
    a7.events.publish("error.apiCall", {
      service: this.entityName,
      method: "create",
      error: error
    });

    // Re-throw or return null
    throw error;
  }
}
```

## DataProvider Best Practices

### Use renderOn for Collection Bindings

Always use `renderOn` for collections with child views.

```javascript
// ✅ Good: Selective rendering
props.binding = {
  products: {
    entityClass: Product,
    func: productService.refreshProducts,
    dependencies: ["products.productIDs"],
    renderOn: ["create", "delete"],  // Only re-render on add/remove
    sort: { name: "asc" }
  }
};

// ❌ Bad: Always re-render (slow for large lists)
props.binding = {
  products: {
    entityClass: Product,
    func: productService.refreshProducts,
    dependencies: ["products.productIDs"]
    // No renderOn → re-renders entire list on every entity update
  }
};
```

### Define Clear State Schema

```javascript
// ✅ Good: Complete schema with types
props.schema = {
  products: { type: "map", entityClass: Product },
  productIDs: { type: "array" },
  category: { type: "string" },
  searchTerm: { type: "string" },
  currentPage: { type: "number", default: 1 },
  pageSize: { type: "number", default: 20 }
};

// ❌ Bad: No schema
props.schema = {};
// No type validation, no documentation
```

### Use Dependencies Wisely

```javascript
// ✅ Good: Specific dependencies
props.binding = {
  products: {
    entityClass: Product,
    func: productService.refreshProducts,
    dependencies: ["products.productIDs"],  // Only refresh when productIDs changes
    renderOn: ["create", "delete"]
  }
};

// ❌ Bad: No dependencies
props.binding = {
  products: {
    entityClass: Product,
    func: productService.refreshProducts
    // Will never auto-refresh!
  }
};

// ❌ Bad: Too broad dependencies
dependencies: ["products"]  // Refreshes on ANY state change
```

### Use Entity-Specific Binding for Individual Items

```javascript
// ✅ Good: Bind to specific entity
const productDP = new ProductDP({
  view: productView,
  productID: props.product.productID,  // Entity-specific binding
  state: {
    product: props.product
  }
});

// Result: Only this view updates when product changes

// ❌ Bad: No binding
const productDP = new ProductDP({
  view: productView,
  state: {
    product: props.product
  }
  // No binding → manual updates required
});
```

## View Best Practices

### Keep Templates Simple

Views should focus on presentation, not logic.

```javascript
// ✅ Good: Simple template with helper methods
todos.template = function() {
  const state = todos.getState();
  return `
    <div class="todos">
      <h2>Todos (${todos.getTodoCount()})</h2>
      <div name="todoList"></div>
    </div>
  `;
};

todos.getTodoCount = function() {
  return this.getState().todos.size;
};

// ❌ Bad: Complex logic in template
todos.template = function() {
  const state = todos.getState();
  const activeTodos = Array.from(state.todos.values())
    .filter(t => !t.completed);
  const percentage = activeTodos.length / state.todos.size * 100;
  // Too much logic in template!

  return `<div>...</div>`;
};
```

### Use Helper Methods

```javascript
// ✅ Good: Helper methods for complex logic
view.getFilteredProducts = function() {
  const state = this.getState();
  return Array.from(state.products.values())
    .filter(p => p.category === state.currentCategory)
    .sort((a, b) => a.name.localeCompare(b.name));
};

view.template = function() {
  const products = view.getFilteredProducts();
  // Use filtered products in template
};

// ❌ Bad: Logic duplicated in template
view.template = function() {
  const state = view.getState();
  const filtered = Array.from(state.products.values())
    .filter(p => p.category === state.currentCategory)
    .sort((a, b) => a.name.localeCompare(b.name));
  // Same logic might be needed elsewhere
};
```

### Manage Child Views Properly

```javascript
// ✅ Good: Remove children before re-creating
view.on("rendered", function() {
  const state = view.getState();

  // Remove existing children
  view.removeChildren();

  // Create new children
  state.products.forEach(product => {
    ProductView({
      id: "product-" + product.productID,
      parentID: view.props.id,
      selector: view.props.selector + ' div[name="productList"]',
      product: product
    });
  });
});

// ❌ Bad: Don't remove children
view.on("rendered", function() {
  // Creates duplicate children on each render!
  state.products.forEach(product => {
    ProductView({ /* ... */ });
  });
});
```

### Use Event Handlers Object

```javascript
// ✅ Good: Organized event handlers
view.eventHandlers = {
  addProduct: function(event) {
    event.preventDefault();
    // Handle add
  },

  deleteProduct: function(event) {
    const productID = event.target.dataset.productId;
    // Handle delete
  },

  filterByCategory: function(event) {
    const category = event.target.dataset.category;
    // Handle filter
  }
};

// ❌ Bad: Inline event handlers
view.template = function() {
  return `
    <button onclick="handleClick()">Click</button>
  `;
};
// Global function pollution, hard to test
```

### Prevent Default for Forms

```javascript
// ✅ Good: Prevent default form submission
view.eventHandlers = {
  submitForm: function(event) {
    event.preventDefault();  // Prevent page reload
    const formData = new FormData(event.target);
    // Handle form data
  }
};

// Template
return `<form data-onsubmit="submitForm">...</form>`;

// ❌ Bad: No preventDefault
view.eventHandlers = {
  submitForm: function(event) {
    const formData = new FormData(event.target);
    // Page reloads!
  }
};
```

## Performance Optimization

### Use renderOn for Large Lists

```javascript
// For lists with 10+ items, always use renderOn
binding: {
  products: {
    entityClass: Product,
    renderOn: ["create", "delete"],
    // ...
  }
}

// Performance improvement: 56x faster for 100-item lists
```

### Batch State Updates

```javascript
// ✅ Good: Single setState call
view.setState({
  products: productsMap,
  category: "electronics",
  pageSize: 20
});
// Single re-render

// ❌ Bad: Multiple setState calls
view.setState({ products: productsMap });    // Re-render 1
view.setState({ category: "electronics" }); // Re-render 2
view.setState({ pageSize: 20 });            // Re-render 3
// Three re-renders!
```

### Use Template Cache

Views automatically cache templates. Don't clear unnecessarily.

```javascript
// ✅ Good: Let framework manage template cache
view.setState({ newData: data });
// Template cache cleared automatically when state changes

// ❌ Bad: Manual cache clearing
view.templateCache = null;
view.render();
// Unnecessary manual intervention
```

### Debounce Expensive Operations

```javascript
// ✅ Good: Debounce search
view.eventHandlers = {
  search: debounce(function(event) {
    const searchTerm = event.target.value;
    a7.events.publish("products.search", { term: searchTerm });
  }, 300)  // Wait 300ms after typing stops
};

// Utility function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ❌ Bad: No debouncing
view.eventHandlers = {
  search: function(event) {
    a7.events.publish("products.search", { term: event.target.value });
    // Fires on every keystroke!
  }
};
```

### Lazy Load Large Datasets

```javascript
// ✅ Good: Load data on demand
a7.router.add("/products/:category", function(params) {
  a7.events.publish("products.loadCategory", {
    category: params.category
  });
});

// ❌ Bad: Load everything upfront
async function initializeApp() {
  await productService.readAll();  // Loads thousands of products!
}
```

### Use Pagination

```javascript
// ✅ Good: Paginate large lists
async loadProducts(page = 1, pageSize = 20) {
  const response = await this.remote.invoke({
    url: `${this.baseURL}?page=${page}&pageSize=${pageSize}`,
    method: "GET"
  });

  return await this.merge(response.products);
}

// ❌ Bad: Load all records
async loadProducts() {
  const response = await this.remote.invoke({
    url: `${this.baseURL}/all`,  // Returns 10,000 products
    method: "GET"
  });
}
```

## Error Handling

### Handle Service Errors

```javascript
// ✅ Good: Comprehensive error handling
a7.events.subscribe("product.create", async function(obj) {
  try {
    const product = await productService.create(obj);

    a7.events.publish("notification.show", {
      message: "Product created successfully",
      type: "success"
    });

  } catch (error) {
    a7.log.error("Failed to create product:", error);

    let message = "Failed to create product";
    if (error.status === 400) {
      message = "Invalid product data";
    } else if (error.status === 401) {
      message = "Please log in to create products";
    } else if (error.status === 500) {
      message = "Server error. Please try again later.";
    }

    a7.events.publish("notification.show", {
      message: message,
      type: "error"
    });
  }
});

// ❌ Bad: No error handling
a7.events.subscribe("product.create", async function(obj) {
  const product = await productService.create(obj);
  // What if it fails?
});
```

### Validate User Input

```javascript
// ✅ Good: Validate before submission
view.eventHandlers = {
  submitProduct: function(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const name = formData.get("name").trim();
    const price = parseFloat(formData.get("price"));

    // Validate
    if (!name) {
      alert("Product name is required");
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert("Price must be a positive number");
      return;
    }

    a7.events.publish("product.create", { name, price });
  }
};

// ❌ Bad: No validation
view.eventHandlers = {
  submitProduct: function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    a7.events.publish("product.create", Object.fromEntries(formData));
    // Might submit invalid data
  }
};
```

### Provide User Feedback

```javascript
// ✅ Good: Loading states and feedback
a7.events.subscribe("products.load", async function(obj) {
  // Show loading
  const view = a7.ui.getView("products");
  view.setState({ loading: true });

  try {
    const products = await productService.readMany(obj.productIDs);
    view.setState({
      products: new Map(products.map(p => [p.productID, p])),
      loading: false
    });

  } catch (error) {
    view.setState({
      loading: false,
      error: "Failed to load products"
    });
  }
});

// ❌ Bad: No feedback
a7.events.subscribe("products.load", async function(obj) {
  const products = await productService.readMany(obj.productIDs);
  // User sees nothing during loading
});
```

## Security

### Sanitize User Input

```javascript
// ✅ Good: Sanitize before rendering
view.template = function() {
  const state = view.getState();
  const sanitizedComment = escapeHtml(state.userComment);

  return `<div class="comment">${sanitizedComment}</div>`;
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ❌ Bad: Direct interpolation (XSS risk)
view.template = function() {
  const state = view.getState();
  return `<div class="comment">${state.userComment}</div>`;
  // If userComment contains <script>alert('XSS')</script>, it will execute!
};
```

### Validate on Server

```javascript
// ✅ Good: Client validation + server validation
// Client (UX):
if (!email.includes("@")) {
  alert("Invalid email");
  return;
}

// Server (Security):
// ALWAYS validate on server - client validation can be bypassed!

// ❌ Bad: Only client validation
// Client validates, but attacker can bypass and send malicious data
```

### Store Tokens Securely

```javascript
// ✅ Good: Use httpOnly cookies (preferred)
// Server sets: Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict

// ✅ Acceptable: localStorage with precautions
localStorage.setItem("authToken", token);
// BUT: Vulnerable to XSS, so sanitize all user input!

// ❌ Bad: Global variable
window.authToken = token;
// Easily accessible to XSS attacks
```

### Use HTTPS in Production

```javascript
// ✅ Good: Always use HTTPS for production
export const config = {
  apiBaseURL: "https://api.example.com/v1",  // HTTPS
  // ...
};

// ❌ Bad: HTTP in production
export const config = {
  apiBaseURL: "http://api.example.com/v1",  // Insecure!
};
```

## Testing

### Test Entities

```javascript
// entity.test.js
import { Product } from "/assets/js/entity/product.js";

describe("Product Entity", () => {
  test("creates valid product", () => {
    const product = new Product({
      productID: "123",
      name: "Laptop",
      price: 999.99
    });

    expect(product.productID).toBe("123");
    expect(product.name).toBe("Laptop");
    expect(product.price).toBe(999.99);
  });

  test("applies default values", () => {
    const product = new Product({
      productID: "123",
      name: "Laptop",
      price: 999.99
    });

    expect(product.inStock).toBe(true);  // Default value
  });

  test("validates required fields", () => {
    expect(() => {
      new Product({ productID: "123" });  // Missing required fields
    }).toThrow();
  });

  test("business methods work correctly", () => {
    const product = new Product({
      productID: "123",
      name: "Laptop",
      price: 999.99,
      inStock: true
    });

    expect(product.isAvailable()).toBe(true);
    expect(product.getDisplayPrice()).toBe("$999.99");
  });
});
```

### Test Services

```javascript
// service.test.js
import { ProductService } from "/assets/js/service/product.js";

describe("ProductService", () => {
  let service;

  beforeEach(() => {
    service = new ProductService();
  });

  test("caches entities after read", async () => {
    const product = await service.read("123");

    expect(service.get("123")).toBe(product);  // Cached
  });

  test("merge triggers events", async () => {
    const eventSpy = jest.fn();
    service.on("cacheChanged", eventSpy);

    const product = new Product({
      productID: "123",
      name: "Laptop",
      price: 999.99
    });

    await service.merge([product]);

    expect(eventSpy).toHaveBeenCalled();
    expect(eventSpy.mock.calls[0][1].action).toBe("create");
  });
});
```

### Test DataProviders

```javascript
// dataprovider.test.js
import { ProductListDP } from "/assets/js/dataprovider/productlist.js";
import { ProductService } from "/assets/js/service/product.js";

describe("ProductListDP", () => {
  test("configures binding correctly", () => {
    const service = new ProductService();
    const view = { /* mock view */ };

    const dp = new ProductListDP({
      view: view,
      productService: service,
      state: {}
    });

    expect(dp.binding.products).toBeDefined();
    expect(dp.binding.products.entityClass).toBe(Product);
    expect(dp.binding.products.renderOn).toEqual(["create", "delete"]);
  });
});
```

### Test Event Handlers

```javascript
// event.test.js
import { a7 } from "/assets/js/app.js";
import { registerProductEvents } from "/assets/js/event/product.js";

describe("Product Events", () => {
  beforeEach(() => {
    registerProductEvents();
  });

  test("product.create creates product", async () => {
    const productService = a7.services.getService("productService");
    const createSpy = jest.spyOn(productService, "create");

    await a7.events.publish("product.create", {
      name: "Laptop",
      price: 999.99
    });

    expect(createSpy).toHaveBeenCalledWith({
      name: "Laptop",
      price: 999.99
    });
  });
});
```

## Debugging

### Use Console Logging

```javascript
// Add logging for debugging
a7.events.subscribe("product.update", async function(obj) {
  console.log("Updating product:", obj);

  const product = await productService.update(obj);

  console.log("Product updated:", product);
});
```

### Use Browser DevTools

1. **Console**: View logs, errors, warnings
2. **Network**: Inspect API calls, responses, timing
3. **Application**: Check localStorage, session storage
4. **Sources**: Set breakpoints, step through code
5. **Performance**: Profile rendering, identify bottlenecks

### Inspect View State

```javascript
// In console:
const view = a7.ui.getView("products");
console.log(view.getState());

// Or add to template for debugging:
view.template = function() {
  console.log("Rendering with state:", view.getState());
  return `...`;
};
```

### Inspect Service Cache

```javascript
// In console:
const productService = a7.services.getService("productService");
console.log("Cache size:", productService.cache.size);
console.log("Cached products:", Array.from(productService.cache.values()));
```

### Track Event Flow

```javascript
// Log all published events
const originalPublish = a7.events.publish;
a7.events.publish = function(eventName, data) {
  console.log(`Event published: ${eventName}`, data);
  return originalPublish.call(this, eventName, data);
};
```

## Deployment

### Build for Production

```javascript
// 1. Use minified Altseven
<script type="module" src="/lib/altseven/dist/a7.min.js"></script>

// 2. Minify your code
// Use build tools like Vite, Rollup, or Webpack

// 3. Enable compression (gzip/brotli)
// Configure web server to compress text files

// 4. Disable debug logging
export const config = {
  debugMode: false,
  // ...
};
```

### Environment Configuration

```javascript
// app.config.js
const environment = import.meta.env.MODE || "production";

export const config = {
  apiBaseURL: environment === "production"
    ? "https://api.example.com/v1"
    : "http://localhost:3000/api",

  debugMode: environment === "development",

  logLevel: environment === "production" ? "error" : "trace"
};
```

### Cache Busting

```html
<!-- Use version or hash in filenames -->
<script type="module" src="/assets/js/app.js?v=1.2.3"></script>
<link rel="stylesheet" href="/assets/css/main.css?v=1.2.3">

<!-- Or use build tools to add hash -->
<script type="module" src="/assets/js/app.a1b2c3d4.js"></script>
```

### Monitor Performance

```javascript
// Add performance tracking
if (window.performance) {
  window.addEventListener("load", function() {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

    console.log("Page load time:", pageLoadTime + "ms");

    // Send to analytics
    analytics.track("PageLoad", {
      loadTime: pageLoadTime
    });
  });
}
```

## Common Patterns

### Loading Pattern

```javascript
a7.events.subscribe("data.load", async function(obj) {
  const view = a7.ui.getView("main");

  view.setState({ loading: true, error: null });

  try {
    const data = await service.load(obj);
    view.setState({ data: data, loading: false });

  } catch (error) {
    view.setState({
      loading: false,
      error: "Failed to load data"
    });
  }
});
```

### Optimistic Update Pattern

```javascript
a7.events.subscribe("item.toggle", async function(obj) {
  const item = service.get(obj.itemID);

  // 1. Optimistic update
  item.completed = !item.completed;
  await service.merge([item]);  // UI updates immediately

  try {
    // 2. Sync with server
    const updated = await service.update(item);
    await service.merge([updated]);  // Update with server response

  } catch (error) {
    // 3. Rollback on error
    item.completed = !item.completed;
    await service.merge([item]);

    alert("Failed to update item");
  }
});
```

### Confirmation Pattern

```javascript
view.eventHandlers = {
  deleteItem: async function(event) {
    const confirmed = confirm("Are you sure you want to delete this item?");

    if (confirmed) {
      const itemID = event.target.dataset.itemId;
      a7.events.publish("item.delete", { itemID: itemID });
    }
  }
};
```

## Anti-Patterns to Avoid

See [Data Flow documentation](./data-flow.md#anti-patterns-to-avoid) for comprehensive list.

**Key anti-patterns**:
1. ❌ Direct DOM manipulation
2. ❌ Bypassing service cache
3. ❌ Manual view updates
4. ❌ Not using renderOn for collections
5. ❌ Circular event dependencies
6. ❌ Business logic in views
7. ❌ Global variables
8. ❌ Duplicate code

## Summary

Following these best practices will help you build:

✅ **Maintainable** - Clean, organized, documented code
✅ **Performant** - Fast rendering, optimized data loading
✅ **Secure** - Protected against common vulnerabilities
✅ **Testable** - Easy to write and maintain tests
✅ **Scalable** - Architecture that grows with your application

Remember: Good practices compound over time. Invest in quality early!
