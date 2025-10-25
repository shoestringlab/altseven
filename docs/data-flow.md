# Data Flow in AltsEven Applications

## Overview

Understanding data flow is crucial for building efficient, maintainable AltsEven applications. This guide explains how data moves through the system, from user interactions to API calls and back to the UI.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Read Flow (Loading Data)](#read-flow-loading-data)
3. [Write Flow (Updating Data)](#write-flow-updating-data)
4. [Event-Driven Updates](#event-driven-updates)
5. [Cache Synchronization](#cache-synchronization)
6. [Real-World Scenarios](#real-world-scenarios)
7. [Performance Considerations](#performance-considerations)
8. [Common Patterns](#common-patterns)
9. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

## Core Principles

### Unidirectional Data Flow

AltsEven follows a unidirectional data flow pattern:

```
User Action → Event → Service → Cache → DataProvider → View → DOM
     ↑                                                              ↓
     └──────────────────────────────────────────────────────────────┘
                        User sees updated UI
```

**Key characteristics**:
- Data flows in one direction (no circular dependencies)
- Single source of truth (Service cache)
- Predictable state updates
- Easier debugging and testing

### Reactive Updates

Views automatically update when their bound data changes:

```
Service.merge([entity])
    ↓
Cache updated
    ↓
"cacheChanged" event fired
    ↓
DataProviderManager notified
    ↓
Bound DataProviders updated
    ↓
Views re-render automatically
```

No manual DOM manipulation required!

### Separation of Concerns

Each layer has a specific responsibility:

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **View** | Render UI, handle user input | Button clicks, form submissions |
| **Event System** | Coordinate between layers | Pub/sub messaging |
| **DataProvider** | Manage view state, bindings | State schema, dependencies |
| **Service** | Business logic, API calls | CRUD operations, validation |
| **Cache** | Store entities | In-memory Map storage |

## Read Flow (Loading Data)

### Simple Read: Single Entity

**Scenario**: Display a product detail page

```
1. User navigates to /product/123
        ↓
2. Router matches route
        ↓
3. Route handler publishes event
   a7.events.publish("product.load", { productID: "123" })
        ↓
4. Event handler calls service
   const product = await productService.read("123")
        ↓
5. Service makes API call
   GET /api/products/123
        ↓
6. API returns product data
   { productID: "123", name: "Laptop", price: 999.99 }
        ↓
7. Service creates Entity instance
   const product = new Product(data)
        ↓
8. Service stores in cache
   this.cache.set("123", product)
        ↓
9. Service fires "cacheChanged" event
   this.fireEvent("cacheChanged", { action: "create", item: product })
        ↓
10. DataProvider bound to productID="123" receives update
        ↓
11. DataProvider updates view state
   view.setState({ product: product })
        ↓
12. View re-renders
   view.render()
        ↓
13. User sees product details
```

**Code example**:

```javascript
// router/routes.js
a7.router.add("/product/:productID", function(params) {
  a7.events.publish("product.load", { productID: params.productID });
  a7.ui.setLayout("product");
});

// event/product.js
a7.events.subscribe("product.load", async function(obj) {
  const productService = a7.services.getService("productService");
  const product = await productService.read(obj.productID);
  // View automatically updates via binding
});

// view/product.js - Automatically receives update
const pdp = new ProductDP({
  view: productView,
  postID: props.productID,  // Binds to specific product
  state: { product: null }
});
```

### Collection Read: Multiple Entities

**Scenario**: Display a list of products

```
1. User navigates to /products
        ↓
2. Router publishes event
   a7.events.publish("products.load", { category: "electronics" })
        ↓
3. Event handler calls service
   const productIDs = await categoryService.getProductIDs("electronics")
        ↓
4. Service returns IDs
   ["123", "456", "789"]
        ↓
5. DataProvider setState with IDs
   view.setState({ productIDs: ["123", "456", "789"] })
        ↓
6. DataProvider dependency triggers
   dependencies: ["products.productIDs"]
        ↓
7. Binding func executes
   func: productService.refreshProducts
        ↓
8. Service calls readMany
   await productService.readMany(["123", "456", "789"])
        ↓
9. Service makes API call (if not cached)
   POST /api/products/batch
   { ids: ["123", "456", "789"] }
        ↓
10. Service merges entities into cache
   await this.merge(products)
        ↓
11. Service fires "cacheChanged" for each entity
   action: "create" or "update"
        ↓
12. DataProvider filters/sorts cached entities
   const products = productService.filter({ productID: productIDs })
        ↓
13. DataProvider updates view state
   view.setState({ products: productsMap })
        ↓
14. View renders list
        ↓
15. View creates child ProductView for each item
        ↓
16. User sees product list
```

**Code example**:

```javascript
// event/product.js
a7.events.subscribe("products.load", async function(obj) {
  const categoryService = a7.services.getService("categoryService");
  const productIDs = await categoryService.getProductIDs(obj.category);

  const view = a7.ui.getView("products");
  view.setState({ productIDs: productIDs }); // Triggers binding
});

// dataprovider/productlist.js
export class ProductListDP extends DataProvider {
  constructor(props) {
    props.binding = {
      products: {
        entityClass: Product,
        func: productService.refreshProducts,  // Called when productIDs changes
        dependencies: ["products.productIDs"], // Watches this state property
        renderOn: ["create", "delete"],        // Only re-render on add/remove
        sort: { name: "asc" }
      }
    };
    super(props);
  }
}

// service/product.js
async refreshProducts(args, dp) {
  const productIDs = dp.getState().productIDs;
  if (productIDs && productIDs.length > 0) {
    return await this.readMany(productIDs);
  }
  return [];
}
```

## Write Flow (Updating Data)

### Create: Adding New Entity

**Scenario**: User adds a product to cart

```
1. User clicks "Add to Cart" button
        ↓
2. View event handler fires
   eventHandlers.addToCart(event)
        ↓
3. Event handler publishes event
   a7.events.publish("cart.addItem", { productID: "123", quantity: 1 })
        ↓
4. Event subscriber calls service
   await cartService.addItem(obj.productID, obj.quantity)
        ↓
5. Service creates new entity
   const cartItem = new CartItem({ productID, quantity })
        ↓
6. Service calls API
   POST /api/cart/items
   { productID: "123", quantity: 1 }
        ↓
7. API returns created item with server-generated ID
   { cartItemID: "abc", productID: "123", quantity: 1 }
        ↓
8. Service updates entity with server data
   cartItem.cartItemID = "abc"
        ↓
9. Service stores in cache with action "create"
   this.cacheSet(cartItem, "create")
        ↓
10. Service fires events
    - cacheChanged: { action: "create", item: cartItem }
    - entityChanged: { id: "abc", entity: cartItem, action: "create" }
        ↓
11. DataProviders bound to cart receive update
        ↓
12. DataProvider with renderOn: ["create", "delete"] re-renders
        ↓
13. Cart view shows new item
        ↓
14. Notification displayed to user
```

**Code example**:

```javascript
// view/product.js - Event handler
eventHandlers: {
  addToCart: function(event) {
    const productID = event.target.dataset.productId;
    a7.events.publish("cart.addItem", {
      productID: productID,
      quantity: 1
    });
  }
}

// event/cart.js
a7.events.subscribe("cart.addItem", async function(obj) {
  const cartService = a7.services.getService("cartService");
  const cartItem = await cartService.addItem(obj.productID, obj.quantity);

  // Show notification
  a7.events.publish("notification.show", {
    message: "Item added to cart",
    type: "success"
  });
});

// service/cart.js
async addItem(productID, quantity) {
  const cartItem = new CartItem({ productID, quantity });

  const response = await this.remote.invoke({
    url: this.baseURL + "/items",
    method: "POST",
    data: cartItem.toJSON()
  });

  cartItem.cartItemID = response.cartItemID;
  this.cacheSet(cartItem, "create"); // Fires events automatically

  return cartItem;
}
```

### Update: Modifying Existing Entity

**Scenario**: User changes product quantity in cart

```
1. User changes quantity input
        ↓
2. View event handler fires
   eventHandlers.updateQuantity(event)
        ↓
3. Event handler publishes event
   a7.events.publish("cart.updateQuantity", { cartItemID: "abc", quantity: 3 })
        ↓
4. Event subscriber calls service
   await cartService.updateQuantity(obj.cartItemID, obj.quantity)
        ↓
5. Service gets entity from cache
   const cartItem = this.get(obj.cartItemID)
        ↓
6. Service modifies entity
   cartItem.quantity = obj.quantity
        ↓
7. Service calls API
   PUT /api/cart/items/abc
   { quantity: 3 }
        ↓
8. API returns updated data
   { cartItemID: "abc", quantity: 3, subtotal: 299.97 }
        ↓
9. Service updates entity
   cartItem.subtotal = response.subtotal
        ↓
10. Service merges into cache
    await this.merge([cartItem])
        ↓
11. Service fires events with action: "update"
    - cacheChanged: { action: "update", item: cartItem }
    - entityChanged: { id: "abc", entity: cartItem, action: "update" }
        ↓
12. DataProvider bound to cartItemID="abc" receives update
        ↓
13. ONLY that cart item view re-renders (not entire cart)
        ↓
14. User sees updated quantity and subtotal
```

**Code example**:

```javascript
// view/cartitem.js - Event handler
eventHandlers: {
  updateQuantity: function(event) {
    const quantity = parseInt(event.target.value, 10);
    a7.events.publish("cart.updateQuantity", {
      cartItemID: this.getState().cartItem.cartItemID,
      quantity: quantity
    });
  }
}

// event/cart.js
a7.events.subscribe("cart.updateQuantity", async function(obj) {
  const cartService = a7.services.getService("cartService");
  await cartService.updateQuantity(obj.cartItemID, obj.quantity);
});

// service/cart.js
async updateQuantity(cartItemID, quantity) {
  const cartItem = this.get(cartItemID);
  if (!cartItem) return;

  cartItem.quantity = quantity;

  const response = await this.remote.invoke({
    url: `${this.baseURL}/items/${cartItemID}`,
    method: "PUT",
    data: { quantity: quantity }
  });

  cartItem.subtotal = response.subtotal;

  // merge() auto-detects "update" action (entity exists in cache)
  await this.merge([cartItem]);

  return cartItem;
}
```

### Delete: Removing Entity

**Scenario**: User removes item from cart

```
1. User clicks "Remove" button
        ↓
2. View event handler fires
   eventHandlers.removeItem(event)
        ↓
3. Event handler publishes event
   a7.events.publish("cart.removeItem", { cartItemID: "abc" })
        ↓
4. Event subscriber calls service
   await cartService.removeItem(obj.cartItemID)
        ↓
5. Service calls API
   DELETE /api/cart/items/abc
        ↓
6. API confirms deletion
   { success: true }
        ↓
7. Service removes from cache with action "delete"
   this.cacheDelete(cartItemID)
        ↓
8. Service fires events
    - cacheChanged: { action: "delete", item: cartItem }
    - entityDeleted: { id: "abc" }
        ↓
9. DataProvider with renderOn: ["create", "delete"] re-renders
        ↓
10. Cart view removes item from list
        ↓
11. Cart totals recalculated
        ↓
12. User sees item removed
```

**Code example**:

```javascript
// view/cartitem.js - Event handler
eventHandlers: {
  removeItem: function(event) {
    a7.events.publish("cart.removeItem", {
      cartItemID: this.getState().cartItem.cartItemID
    });
  }
}

// event/cart.js
a7.events.subscribe("cart.removeItem", async function(obj) {
  const cartService = a7.services.getService("cartService");
  await cartService.removeItem(obj.cartItemID);

  // Update cart totals
  a7.events.publish("cart.recalculateTotals", {});
});

// service/cart.js
async removeItem(cartItemID) {
  await this.remote.invoke({
    url: `${this.baseURL}/items/${cartItemID}`,
    method: "DELETE"
  });

  // Fires "delete" action events automatically
  this.cacheDelete(cartItemID);
}
```

## Event-Driven Updates

### Pub/Sub Pattern

AltsEven uses a publish/subscribe event system for loose coupling:

```
Component A                Event System               Component B
    |                           |                          |
    |-- publish("event") ------>|                          |
    |                           |---- notify ------------->|
    |                           |                          |
    |                           |<--- handle event --------|
```

**Benefits**:
- Components don't need direct references to each other
- Easy to add new listeners
- Simplifies testing
- Enables complex workflows

### Cross-Component Communication

**Scenario**: Updating product count when added to cart

```javascript
// Component 1: Cart Service (publishes)
async addItem(productID, quantity) {
  const cartItem = await this.create({ productID, quantity });

  // Notify other components
  a7.events.publish("cart.itemAdded", {
    productID: productID,
    quantity: quantity
  });

  return cartItem;
}

// Component 2: Header (subscribes)
a7.events.subscribe("cart.itemAdded", function(obj) {
  const headerView = a7.ui.getView("header");
  const currentCount = headerView.getState().cartCount;
  headerView.setState({
    cartCount: currentCount + obj.quantity
  });
});

// Component 3: Analytics (subscribes)
a7.events.subscribe("cart.itemAdded", function(obj) {
  analytics.track("Product Added to Cart", {
    productID: obj.productID,
    quantity: obj.quantity
  });
});
```

### Event Naming Conventions

Follow these conventions for consistency:

```javascript
// Pattern: [domain].[action]
"product.load"
"product.create"
"product.update"
"product.delete"

"cart.addItem"
"cart.removeItem"
"cart.updateQuantity"

"user.login"
"user.logout"
"user.profileUpdated"

// Built-in framework events
"cacheChanged"    // Service cache updated
"entityChanged"   // Specific entity updated
"entityDeleted"   // Specific entity deleted
```

## Cache Synchronization

### Single Source of Truth

Service cache is the single source of truth for entity data:

```
                    Service Cache
                    (Map of Entities)
                          |
        ┌─────────────────┼─────────────────┐
        |                 |                 |
   View A State      View B State      View C State
   (Reference)       (Reference)       (Reference)
```

When cache updates, ALL views bound to that data automatically update.

### Entity-Specific Binding

**Pattern**: Bind individual views to specific entities

```javascript
// Products list view (parent)
const productsDP = new ProductListDP({
  binding: {
    products: {
      entityClass: Product,
      func: productService.refreshProducts,
      dependencies: ["products.productIDs"],
      renderOn: ["create", "delete"]  // Only re-render on add/remove
    }
  }
});

// Individual product view (child)
const productDP = new ProductDP({
  postID: "123",  // Binds to specific product
  binding: {
    product: {
      entityClass: Product,
      id: "123"  // Entity-specific binding
    }
  }
});
```

**Result**:
- Updating product 123 → Only that product view re-renders
- Adding/removing products → List re-renders to add/remove child views

### Cache Coherency

AltsEven automatically maintains cache coherency:

```javascript
// Scenario: Same product in multiple views

// View 1: Product detail page
// View 2: Cart (product summary)
// View 3: Recent items list

// User updates product quantity in cart:
await cartService.updateQuantity(cartItemID, 3);

// Cart service updates product in its own operation:
const product = productService.get(productID);
product.cartQuantity = 3;
await productService.merge([product]);

// Result: ALL three views automatically update!
// - Product detail shows updated quantity
// - Cart shows updated quantity
// - Recent items list shows updated quantity
```

No manual synchronization required!

## Real-World Scenarios

### Scenario 1: User Login

**Complete data flow**:

```
1. User submits login form
   ↓
2. View captures form data
   eventHandlers.login(event)
   ↓
3. View publishes event
   a7.events.publish("user.login", { email, password })
   ↓
4. Event handler calls service
   const user = await userService.login(email, password)
   ↓
5. Service makes API call
   POST /api/auth/login
   ↓
6. API returns user data + auth token
   { user: {...}, token: "xyz..." }
   ↓
7. Service stores token
   localStorage.setItem("authToken", response.token)
   ↓
8. Service creates User entity
   const user = new User(response.user)
   ↓
9. Service caches user
   this.cacheSet(user, "create")
   ↓
10. Service sets current user
    a7.user = user
    ↓
11. Service fires events
    - cacheChanged: { action: "create", item: user }
    - Custom event: "user.loggedIn"
    ↓
12. Multiple components respond:
    - Header: Shows user avatar
    - Navigation: Shows authenticated menu
    - Analytics: Tracks login event
    ↓
13. Router navigates to dashboard
    a7.router.open("/dashboard")
    ↓
14. User sees personalized dashboard
```

### Scenario 2: Real-Time Notifications

**Using WebSocket for live updates**:

```javascript
// service/notification.js
export class NotificationService extends Service {
  constructor() {
    super({
      entityClass: Notification,
      entityName: "Notification"
    });

    this.socket = null;
  }

  connect() {
    this.socket = new WebSocket("wss://api.example.com/notifications");

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "new_notification") {
        // Create notification entity
        const notification = new Notification(data.notification);

        // Add to cache (triggers automatic UI update)
        this.cacheSet(notification, "create");

        // Publish event for other components
        a7.events.publish("notification.received", {
          notification: notification
        });
      }
    };
  }
}

// view/notifications.js - Automatically updates when notification added to cache
const notificationsDP = new NotificationsDP({
  binding: {
    notifications: {
      entityClass: Notification,
      func: notificationService.refreshNotifications,
      dependencies: ["notifications.notificationIDs"],
      renderOn: ["create", "delete"],
      sort: { dateCreated: "desc" }
    }
  }
});
```

**Data flow**:
```
WebSocket message arrives
    ↓
Service creates Notification entity
    ↓
Service adds to cache with "create" action
    ↓
DataProvider receives "cacheChanged" event
    ↓
View automatically re-renders with new notification
    ↓
User sees notification instantly
```

### Scenario 3: Optimistic Updates

**Pattern**: Update UI immediately, sync with server in background

```javascript
// event/product.js
a7.events.subscribe("product.toggleFavorite", async function(obj) {
  const productService = a7.services.getService("productService");
  const product = productService.get(obj.productID);

  // 1. Optimistic update (immediate)
  product.isFavorite = !product.isFavorite;
  product.favoriteCount += product.isFavorite ? 1 : -1;
  await productService.merge([product]); // UI updates immediately

  try {
    // 2. Sync with server
    const response = await productService.remote.invoke({
      url: `/api/products/${obj.productID}/favorite`,
      method: "POST",
      data: { isFavorite: product.isFavorite }
    });

    // 3. Update with server response
    product.favoriteCount = response.favoriteCount;
    await productService.merge([product]);

  } catch (error) {
    // 4. Rollback on error
    product.isFavorite = !product.isFavorite;
    product.favoriteCount += product.isFavorite ? 1 : -1;
    await productService.merge([product]);

    a7.events.publish("notification.show", {
      message: "Failed to update favorite",
      type: "error"
    });
  }
});
```

**User experience**:
- Click → Immediate visual feedback (optimistic)
- Server confirms → Exact count updated
- Server fails → UI rolls back to previous state

## Performance Considerations

### Request Deduplication

Service automatically prevents duplicate concurrent requests:

```javascript
// Multiple components request same product simultaneously
await productService.read("123");  // Request 1 → API call
await productService.read("123");  // Request 2 → Waits for Request 1
await productService.read("123");  // Request 3 → Waits for Request 1

// Only ONE API call made, all three get the same result
```

### Batch Loading

Use `readMany()` for efficient batch loading:

```javascript
// ❌ Bad: Multiple individual requests
for (const productID of productIDs) {
  await productService.read(productID);  // N API calls
}

// ✅ Good: Single batch request
await productService.readMany(productIDs);  // 1 API call
```

### Selective Re-rendering

Use `renderOn` to minimize re-renders:

```javascript
// Without renderOn: Updating one product → entire list re-renders (slow)
binding: {
  products: {
    entityClass: Product
    // All actions trigger re-render
  }
}

// With renderOn: Updating one product → only that product re-renders (fast)
binding: {
  products: {
    entityClass: Product,
    renderOn: ["create", "delete"]  // List only re-renders on add/remove
  }
}
```

**Performance improvement**: 56x faster for large lists

### Caching Strategy

Service cache prevents unnecessary API calls:

```javascript
// First access: API call
const product = await productService.read("123");  // GET /api/products/123

// Subsequent access: From cache (no API call)
const product2 = await productService.read("123");  // From cache

// Force refresh:
const product3 = await productService.read("123", { bypassCache: true });  // GET /api/products/123
```

## Common Patterns

### Pattern 1: Load on Navigation

```javascript
// Router triggers data load
a7.router.add("/products/:category", function(params) {
  a7.events.publish("products.loadCategory", {
    category: params.category
  });
  a7.ui.setLayout("products");
});

// Event handler loads data
a7.events.subscribe("products.loadCategory", async function(obj) {
  const categoryService = a7.services.getService("categoryService");
  const productIDs = await categoryService.getProductIDs(obj.category);

  const view = a7.ui.getView("products");
  view.setState({ productIDs: productIDs });  // Triggers binding
});
```

### Pattern 2: Dependency Chain

```javascript
// State update cascades through dependencies
view.setState({ userID: "123" });  // User changes
    ↓
// Dependencies: ["profile.userID"] triggers
await userService.read("123");
    ↓
view.setState({ user: user });  // User loaded
    ↓
// Dependencies: ["profile.user.cartID"] triggers
await cartService.read(user.cartID);
    ↓
view.setState({ cart: cart });  // Cart loaded
```

### Pattern 3: Form Submission

```javascript
// View captures form data
eventHandlers: {
  submitProduct: async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const product = {
      name: formData.get("name"),
      price: parseFloat(formData.get("price")),
      category: formData.get("category")
    };

    a7.events.publish("product.create", product);
  }
}

// Event handler processes
a7.events.subscribe("product.create", async function(obj) {
  try {
    const productService = a7.services.getService("productService");
    const newProduct = await productService.create(obj);

    // Success notification
    a7.events.publish("notification.show", {
      message: "Product created successfully",
      type: "success"
    });

    // Navigate to product page
    a7.router.open(`/product/${newProduct.productID}`);

  } catch (error) {
    // Error notification
    a7.events.publish("notification.show", {
      message: error.message,
      type: "error"
    });
  }
});
```

### Pattern 4: Pagination

```javascript
// View triggers page load
eventHandlers: {
  nextPage: function() {
    const state = this.getState();
    a7.events.publish("products.loadPage", {
      page: state.currentPage + 1,
      pageSize: state.pageSize
    });
  }
}

// Event handler loads page
a7.events.subscribe("products.loadPage", async function(obj) {
  const productService = a7.services.getService("productService");

  const response = await productService.remote.invoke({
    url: `/api/products?page=${obj.page}&pageSize=${obj.pageSize}`,
    method: "GET"
  });

  // Merge new products into cache
  await productService.merge(response.products);

  // Update view state
  const view = a7.ui.getView("products");
  const currentIDs = view.getState().productIDs || [];
  const newIDs = response.products.map(p => p.productID);

  view.setState({
    productIDs: [...currentIDs, ...newIDs],  // Append new IDs
    currentPage: obj.page,
    hasMore: response.hasMore
  });
});
```

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Direct DOM Manipulation

```javascript
// ❌ Bad: Manually updating DOM
eventHandlers: {
  updatePrice: function(event) {
    const newPrice = event.target.value;
    document.querySelector(".price").textContent = "$" + newPrice;
  }
}

// ✅ Good: Update state, let view re-render
eventHandlers: {
  updatePrice: function(event) {
    const newPrice = parseFloat(event.target.value);
    this.setState({ price: newPrice });
  }
}
```

### ❌ Anti-Pattern 2: Bypassing Service Cache

```javascript
// ❌ Bad: Fetching directly without cache
async loadProduct(productID) {
  const response = await fetch(`/api/products/${productID}`);
  const data = await response.json();
  this.setState({ product: data });
}

// ✅ Good: Use service (automatic caching)
async loadProduct(productID) {
  const productService = a7.services.getService("productService");
  const product = await productService.read(productID);
  // View automatically updates via binding
}
```

### ❌ Anti-Pattern 3: Manual View Updates

```javascript
// ❌ Bad: Manually updating multiple views
async likeProduct(productID) {
  await productService.likeProduct(productID);

  // Manually updating views
  const listView = a7.ui.getView("products");
  listView.templateCache = null;
  listView.render();

  const detailView = a7.ui.getView("product-detail");
  detailView.templateCache = null;
  detailView.render();
}

// ✅ Good: Use merge() for automatic updates
async likeProduct(productID) {
  const product = productService.get(productID);
  product.isLiked = true;
  product.likeCount++;

  await productService.merge([product]);
  // ALL views bound to this product automatically update
}
```

### ❌ Anti-Pattern 4: Circular Dependencies

```javascript
// ❌ Bad: Circular event chain
a7.events.subscribe("product.update", function(obj) {
  a7.events.publish("cart.refresh", {});
});

a7.events.subscribe("cart.refresh", function(obj) {
  a7.events.publish("product.update", {});  // Infinite loop!
});

// ✅ Good: Linear event flow
a7.events.subscribe("product.update", function(obj) {
  // Update product
  // Views automatically refresh via binding
});
```

### ❌ Anti-Pattern 5: Not Using renderOn

```javascript
// ❌ Bad: Entire list re-renders on every entity update (slow)
binding: {
  products: {
    entityClass: Product,
    func: productService.refreshProducts
    // No renderOn → always re-renders
  }
}

// ✅ Good: Selective re-rendering (fast)
binding: {
  products: {
    entityClass: Product,
    func: productService.refreshProducts,
    renderOn: ["create", "delete"]  // Only re-render on add/remove
  }
}
```

## Summary

Understanding AltsEven's data flow:

1. **Unidirectional**: Data flows one way (predictable, debuggable)
2. **Reactive**: Views automatically update when data changes
3. **Event-Driven**: Components communicate via pub/sub (loosely coupled)
4. **Cache-First**: Service cache is single source of truth
5. **Automatic Synchronization**: No manual view updates needed

Follow these principles and patterns for efficient, maintainable applications!
