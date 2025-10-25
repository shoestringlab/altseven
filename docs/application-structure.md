# Application Structure Guide

## Overview

This guide provides recommendations for organizing AltsEven applications. Following these conventions helps maintain consistency, improves code discoverability, and makes applications easier to maintain as they grow.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [File Naming Conventions](#file-naming-conventions)
3. [Module Organization](#module-organization)
4. [Application Entry Point](#application-entry-point)
5. [Configuration Files](#configuration-files)
6. [Assets Organization](#assets-organization)
7. [Build Configuration](#build-configuration)
8. [Scaling Your Application](#scaling-your-application)

## Directory Structure

### Recommended Structure

```
your-app/
├── client/                      # Client-side application root
│   ├── assets/                  # Application code and assets
│   │   ├── js/
│   │   │   ├── entity/          # Entity definitions
│   │   │   │   ├── user.js
│   │   │   │   ├── product.js
│   │   │   │   └── order.js
│   │   │   ├── service/         # Service classes
│   │   │   │   ├── user.js
│   │   │   │   ├── product.js
│   │   │   │   └── order.js
│   │   │   ├── dataprovider/    # DataProvider classes
│   │   │   │   ├── user.js
│   │   │   │   ├── product.js
│   │   │   │   ├── productlist.js
│   │   │   │   └── orderlist.js
│   │   │   ├── view/            # View components
│   │   │   │   ├── layout.js
│   │   │   │   ├── header.js
│   │   │   │   ├── products.js
│   │   │   │   ├── product.js
│   │   │   │   └── cart.js
│   │   │   ├── event/           # Event handlers
│   │   │   │   ├── user.js
│   │   │   │   ├── product.js
│   │   │   │   └── cart.js
│   │   │   ├── router/          # Route definitions
│   │   │   │   └── routes.js
│   │   │   ├── app.js           # Application initialization
│   │   │   ├── app.config.js    # Configuration
│   │   │   ├── app.services.js  # Service registration
│   │   │   ├── app.ui.js        # UI initialization
│   │   │   └── app.utils.js     # Utility functions
│   │   ├── css/                 # Stylesheets
│   │   │   ├── main.css
│   │   │   ├── components.css
│   │   │   └── layout.css
│   │   └── images/              # Image assets
│   │       ├── logo.png
│   │       └── icons/
│   ├── lib/                     # Third-party libraries
│   │   ├── altseven/
│   │   │   └── dist/
│   │   │       └── a7.js
│   │   ├── mustache/
│   │   └── other-libs/
│   └── index.html               # Application entry point
├── server/                      # Server-side code (if applicable)
├── docs/                        # Documentation
├── tests/                       # Test files
├── package.json                 # Dependencies
└── README.md                    # Project documentation
```

### Directory Purpose

**entity/** - Entity class definitions
- One file per entity type
- Defines schema, validation, business methods
- No external dependencies beyond Entity base class

**service/** - Service class definitions
- One file per service (typically matches entity)
- Handles API communication, caching, business logic
- Depends on Entity classes

**dataprovider/** - DataProvider class definitions
- Named after the view they support (e.g., `productlist.js` for Products view)
- Or named after entity for entity-specific providers (e.g., `product.js` for Product view)
- Defines state schema, bindings, dependencies
- Depends on Entity and Service classes

**view/** - View component definitions
- One file per view component
- Template rendering, event handling, child view creation
- Depends on DataProvider classes

**event/** - Event handler modules
- Organized by domain (user events, product events, etc.)
- Central subscription setup for app-wide events
- Coordinates between services and UI updates

**router/** - Routing configuration
- Route definitions and handlers
- Navigation logic
- URL pattern matching

## File Naming Conventions

### General Rules

1. **Use lowercase** with no spaces
2. **Use descriptive names** that indicate purpose
3. **Match entity names** across layers when possible
4. **Use singular names** for entities and their related services
5. **Use plural names** for collection views

### Entity Files

```javascript
// entity/user.js
export class User extends Entity { }

// entity/product.js
export class Product extends Entity { }

// entity/orderitem.js (compound names)
export class OrderItem extends Entity { }
```

**Naming pattern**: `entity/[entityname].js`
- Class name: PascalCase (User, Product, OrderItem)
- File name: lowercase (user.js, product.js, orderitem.js)

### Service Files

```javascript
// service/user.js
export class UserService extends Service { }

// service/product.js
export class ProductService extends Service { }
```

**Naming pattern**: `service/[entityname].js`
- Class name: PascalCase + "Service" suffix (UserService, ProductService)
- File name: lowercase, matches entity (user.js, product.js)
- One service per entity is typical

### DataProvider Files

Two patterns depending on usage:

**Pattern 1: Entity-specific DataProviders**
```javascript
// dataprovider/user.js
export class UserDP extends DataProvider { }

// dataprovider/product.js
export class ProductDP extends DataProvider { }
```
- Used for single-entity views
- File name matches entity
- Class name: EntityName + "DP"

**Pattern 2: Collection/List DataProviders**
```javascript
// dataprovider/userlist.js
export class UserListDP extends DataProvider { }

// dataprovider/productlist.js
export class ProductListDP extends DataProvider { }

// dataprovider/searchresults.js
export class SearchResultsDP extends DataProvider { }
```
- Used for views displaying multiple entities
- File name describes the view purpose
- Class name describes the list type

### View Files

```javascript
// view/products.js (plural - collection view)
export var Products = function(props) { }

// view/product.js (singular - individual entity view)
export var ProductView = function(props) { }

// view/checkout.js (process/page name)
export var Checkout = function(props) { }
```

**Naming pattern**:
- Collection views: plural (products.js, users.js, orders.js)
- Individual entity views: singular (product.js, user.js, order.js)
- Page/process views: descriptive (checkout.js, login.js, dashboard.js)

### Event Handler Files

```javascript
// event/user.js - All user-related events
// event/product.js - All product-related events
// event/cart.js - All shopping cart events
```

**Naming pattern**: `event/[domain].js`
- Organize by functional domain
- One file can handle multiple related events

## Module Organization

### Entity Module Structure

```javascript
// entity/product.js
import { Entity } from "/lib/altseven/dist/a7.js";

export class Product extends Entity {
  constructor(obj) {
    super();

    // Define schema
    this.schema = {
      productID: { type: "string", required: true },
      name: { type: "string", required: true },
      description: { type: "string" },
      price: { type: "number", required: true },
      category: { type: "string" },
      inStock: { type: "boolean", default: true },
      dateCreated: { type: "date" }
    };

    // Initialize with validation
    this.init(obj);
  }

  // Business methods
  getDisplayPrice() {
    return `$${this.price.toFixed(2)}`;
  }

  isAvailable() {
    return this.inStock && this.price > 0;
  }
}
```

**Best practices**:
- Import only Entity base class
- Define schema in constructor
- Call `this.init(obj)` to validate and populate
- Add business methods for entity-specific logic
- No external dependencies on other entities when possible

### Service Module Structure

```javascript
// service/product.js
import { Service } from "/lib/altseven/dist/a7.js";
import { Product } from "/assets/js/entity/product.js";
import { a7 } from "/assets/js/app.js";

export class ProductService extends Service {
  constructor() {
    super({
      entityClass: Product,
      entityName: "Product"
    });

    this.baseURL = a7.config.apiBaseURL + "/products";
  }

  // Standard CRUD inherited from Service
  // - create(obj)
  // - read(id)
  // - update(obj)
  // - delete(id)
  // - readMany(ids)

  // Custom methods
  async searchByCategory(category, options = {}) {
    const url = `${this.baseURL}/search?category=${category}`;
    const response = await this.remote.invoke({
      url: url,
      method: "GET"
    });

    return await this.merge(response.products);
  }

  async getInStock() {
    return this.filter({ inStock: true });
  }

  // Refresh method for DataProvider binding
  async refreshProducts(args, dp) {
    const productIDs = dp.getState().productIDs;
    if (productIDs && productIDs.length > 0) {
      return await this.readMany(productIDs);
    }
    return [];
  }
}
```

**Best practices**:
- Import Service base class and entity
- Set entityClass and entityName in constructor
- Configure baseURL for API endpoints
- Inherit standard CRUD operations
- Add custom business methods as needed
- Include refresh methods for DataProvider bindings
- Use `this.merge()` to update cache automatically

### DataProvider Module Structure

```javascript
// dataprovider/productlist.js
import { DataProvider } from "/lib/altseven/dist/a7.js";
import { Product } from "/assets/js/entity/product.js";

export class ProductListDP extends DataProvider {
  constructor(props) {
    // Configure binding
    props.binding = {
      products: {
        entityClass: Product,
        func: props.productService.refreshProducts,
        dependencies: ["productlist.productIDs"],
        renderOn: ["create", "delete"],  // Selective rendering
        sort: { name: "asc" }
      }
    };

    // Define state schema
    props.schema = {
      products: { type: "map", entityClass: Product },
      productIDs: { type: "array" },
      category: { type: "string" },
      searchTerm: { type: "string" }
    };

    super(props);
  }
}
```

**Best practices**:
- Configure binding in constructor before `super(props)`
- Define state schema
- Use `renderOn` for collection bindings with child views
- Specify dependencies to trigger automatic refreshes
- Add sorting/filtering as needed

### View Module Structure

```javascript
// view/products.js
import { View } from "/lib/altseven/dist/a7.js";
import { a7 } from "/assets/js/app.js";
import { Product } from "/assets/js/entity/product.js";
import { ProductListDP } from "/assets/js/dataprovider/productlist.js";
import { ProductView } from "/assets/js/view/product.js";

export var Products = function(props) {
  const productService = a7.services.getService("productService");
  var products = new View(props);

  // Register with UI manager
  a7.ui.register(products);

  // Create and register DataProvider
  const pldp = new ProductListDP({
    view: products,
    productService: productService,
    state: {
      products: new Map(),
      productIDs: [],
      category: "",
      searchTerm: ""
    }
  });

  a7.dataproviders.register(pldp);
  products.registerDataProvider(pldp);

  // Template
  products.template = function() {
    const state = products.getState();
    let html = `<div class="products-container">
                  <h2>Products</h2>
                  <div class="product-list" name="productList"></div>
                </div>`;
    return html;
  };

  // Lifecycle: Create child views after render
  products.on("rendered", function() {
    const state = products.getState();

    // Clear existing children
    products.removeChildren();

    // Create child view for each product
    state.products.forEach((product, productID) => {
      ProductView({
        id: "product-" + productID,
        parentID: products.props.id,
        selector: products.props.selector + ' div[name="productList"]',
        product: product
      });
    });
  });

  // Event handlers
  products.eventHandlers = {
    filterByCategory: function(event) {
      const category = event.target.dataset.category;
      a7.events.publish("products.filter", { category: category });
    }
  };
};
```

**Best practices**:
- Import all dependencies at top
- Get service references early
- Create View instance
- Register with UI manager
- Create and register DataProvider
- Define template function
- Use lifecycle events for child view management
- Define event handlers object
- Remove children before re-creating to avoid duplicates

### Event Handler Module Structure

```javascript
// event/product.js
import { a7 } from "/assets/js/app.js";

export function registerProductEvents() {
  const productService = a7.services.getService("productService");

  // Event: Load products
  a7.events.subscribe("products.load", async function(obj) {
    const products = await productService.readMany(obj.productIDs);
    const view = a7.ui.getView("products");
    view.setState({
      products: new Map(products.map(p => [p.productID, p])),
      productIDs: obj.productIDs
    });
  });

  // Event: Filter products
  a7.events.subscribe("products.filter", async function(obj) {
    const products = await productService.searchByCategory(obj.category);
    const view = a7.ui.getView("products");
    view.setState({
      products: new Map(products.map(p => [p.productID, p])),
      category: obj.category
    });
  });

  // Event: Add to cart
  a7.events.subscribe("product.addToCart", async function(obj) {
    const cartService = a7.services.getService("cartService");
    await cartService.addItem(obj.productID, obj.quantity);
    a7.events.publish("cart.updated", {});
  });
}
```

**Best practices**:
- Export registration function
- Get service references at top of function
- One subscribe per event
- Use async/await for service calls
- Update view state through setState()
- Chain events for complex workflows
- Keep handlers focused and simple

## Application Entry Point

### app.js - Main Application File

```javascript
// assets/js/app.js
import { Application } from "/lib/altseven/dist/a7.js";
import { config } from "/assets/js/app.config.js";
import { registerServices } from "/assets/js/app.services.js";
import { initializeUI } from "/assets/js/app.ui.js";
import { registerRoutes } from "/assets/js/router/routes.js";

// Import event registrations
import { registerUserEvents } from "/assets/js/event/user.js";
import { registerProductEvents } from "/assets/js/event/product.js";
import { registerCartEvents } from "/assets/js/event/cart.js";

// Create application instance
export const a7 = new Application({
  config: config
});

// Initialize application
export async function initializeApp() {
  // 1. Register services
  registerServices(a7);

  // 2. Initialize UI
  initializeUI(a7);

  // 3. Register event handlers
  registerUserEvents();
  registerProductEvents();
  registerCartEvents();

  // 4. Set up routing
  registerRoutes(a7);

  // 5. Set initial layout
  a7.ui.setLayout("main");

  // 6. Start router
  a7.router.run();

  // 7. Load initial data
  await loadInitialData();
}

async function loadInitialData() {
  // Load user session
  a7.events.publish("user.checkSession", {});

  // Load app configuration
  a7.events.publish("config.load", {});
}

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
```

### app.config.js - Configuration

```javascript
// assets/js/app.config.js
export const config = {
  // API configuration
  apiBaseURL: "https://api.example.com/v1",
  apiTimeout: 30000,

  // Authentication
  authTokenKey: "app_auth_token",

  // UI configuration
  defaultLayout: "main",
  pageSize: 20,

  // Feature flags
  features: {
    userProfiles: true,
    reviews: true,
    wishlist: false
  },

  // Environment
  environment: "production", // or "development", "staging"
  debugMode: false,

  // Localization
  defaultLocale: "en-US",

  // Templates
  templateEngine: "mustache" // or "handlebars", "literals"
};
```

### app.services.js - Service Registration

```javascript
// assets/js/app.services.js
import { UserService } from "/assets/js/service/user.js";
import { ProductService } from "/assets/js/service/product.js";
import { OrderService } from "/assets/js/service/order.js";
import { CartService } from "/assets/js/service/cart.js";

export function registerServices(a7) {
  // Register all services
  a7.services.register("userService", new UserService());
  a7.services.register("productService", new ProductService());
  a7.services.register("orderService", new OrderService());
  a7.services.register("cartService", new CartService());

  // Set up service dependencies if needed
  const cartService = a7.services.getService("cartService");
  const productService = a7.services.getService("productService");
  cartService.productService = productService;
}
```

### app.ui.js - UI Initialization

```javascript
// assets/js/app.ui.js
import { Layout } from "/assets/js/view/layout.js";
import { Header } from "/assets/js/view/header.js";
import { Products } from "/assets/js/view/products.js";
import { Cart } from "/assets/js/view/cart.js";

export function initializeUI(a7) {
  // Create main layout
  Layout({
    id: "layout",
    selector: "#app"
  });

  // Create header
  Header({
    id: "header",
    parentID: "layout",
    selector: "#app > div[name='header']"
  });

  // Create main views
  Products({
    id: "products",
    parentID: "layout",
    selector: "#app > div[name='main']"
  });

  Cart({
    id: "cart",
    parentID: "layout",
    selector: "#app > div[name='main']"
  });

  // Export ui helper
  a7.ui = {
    setLayout: function(layoutName) {
      // Layout switching logic
      const layout = a7.ui.getView("layout");
      layout.setState({ currentLayout: layoutName });
    }
  };
}
```

### index.html - HTML Entry Point

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My AltsEven App</title>

  <!-- Stylesheets -->
  <link rel="stylesheet" href="/assets/css/main.css">

  <!-- Import Maps for ES Modules -->
  <script type="importmap">
  {
    "imports": {
      "/lib/altseven/": "/lib/altseven/",
      "/assets/": "/assets/"
    }
  }
  </script>
</head>
<body>
  <!-- Application root -->
  <div id="app"></div>

  <!-- Load application -->
  <script type="module" src="/assets/js/app.js"></script>
</body>
</html>
```

## Configuration Files

### package.json

```json
{
  "name": "my-altseven-app",
  "version": "1.0.0",
  "description": "My AltsEven application",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "altseven": "^8.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### .gitignore

```
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

## Assets Organization

### CSS Organization

```
assets/css/
├── main.css           # Global styles, imports
├── variables.css      # CSS variables, theme
├── layout.css         # Layout styles
├── components.css     # Component styles
└── utilities.css      # Utility classes
```

**main.css structure**:
```css
/* Import order */
@import url('./variables.css');
@import url('./layout.css');
@import url('./components.css');
@import url('./utilities.css');

/* Global resets and base styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  line-height: var(--line-height);
  color: var(--text-color);
}
```

### Image Organization

```
assets/images/
├── logo.png
├── favicon.ico
├── icons/              # UI icons
│   ├── cart.svg
│   ├── user.svg
│   └── search.svg
├── products/           # Product images
│   ├── product-1.jpg
│   └── product-2.jpg
└── backgrounds/        # Background images
    └── hero.jpg
```

## Build Configuration

### Development vs Production

**Development**:
- Use unminified AltsEven distribution (`/lib/altseven/dist/a7.js`)
- Enable detailed logging
- Use source maps
- Hot module replacement if using build tool

**Production**:
- Use minified AltsEven distribution (`/lib/altseven/dist/a7.min.js`)
- Disable debug logging
- Minimize bundle size
- Enable compression

### Environment-Specific Config

```javascript
// app.config.js
const environment = import.meta.env.MODE || "development";

export const config = {
  apiBaseURL: environment === "production"
    ? "https://api.example.com/v1"
    : "http://localhost:3000/api",

  debugMode: environment === "development",

  // ... other config
};
```

## Scaling Your Application

### Feature-Based Organization (Large Apps)

For larger applications, consider organizing by feature instead of by type:

```
assets/js/
├── features/
│   ├── products/
│   │   ├── entity/
│   │   │   └── product.js
│   │   ├── service/
│   │   │   └── product.js
│   │   ├── dataprovider/
│   │   │   ├── product.js
│   │   │   └── productlist.js
│   │   ├── view/
│   │   │   ├── products.js
│   │   │   └── product.js
│   │   ├── event/
│   │   │   └── product.js
│   │   └── index.js          # Feature export
│   ├── cart/
│   │   ├── entity/
│   │   ├── service/
│   │   ├── dataprovider/
│   │   ├── view/
│   │   ├── event/
│   │   └── index.js
│   └── user/
│       ├── entity/
│       ├── service/
│       ├── dataprovider/
│       ├── view/
│       ├── event/
│       └── index.js
├── shared/                    # Shared utilities
│   ├── components/
│   └── utils/
├── app.js
└── app.config.js
```

**Benefits**:
- Each feature is self-contained
- Easier to find related code
- Better for team collaboration
- Can lazy-load features

### Code Splitting

For large applications, split code by route/feature:

```javascript
// router/routes.js
a7.router.add("/products", async function() {
  // Lazy load products feature
  const { initProductsFeature } = await import("/assets/js/features/products/index.js");
  await initProductsFeature();
  a7.ui.setLayout("products");
});

a7.router.add("/cart", async function() {
  // Lazy load cart feature
  const { initCartFeature } = await import("/assets/js/features/cart/index.js");
  await initCartFeature();
  a7.ui.setLayout("cart");
});
```

### Shared Components

Create reusable components for common UI elements:

```
assets/js/shared/
├── components/
│   ├── modal.js
│   ├── dropdown.js
│   ├── pagination.js
│   └── loader.js
└── utils/
    ├── date.js
    ├── validation.js
    └── formatting.js
```

```javascript
// shared/components/modal.js
import { View } from "/lib/altseven/dist/a7.js";

export var Modal = function(props) {
  const modal = new View(props);

  modal.template = function() {
    const state = modal.getState();
    return `
      <div class="modal ${state.visible ? 'visible' : 'hidden'}">
        <div class="modal-backdrop" data-onclick="close"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>${state.title}</h3>
            <button data-onclick="close">×</button>
          </div>
          <div class="modal-body">
            ${state.content}
          </div>
        </div>
      </div>
    `;
  };

  modal.eventHandlers = {
    close: function() {
      modal.setState({ visible: false });
    }
  };

  return modal;
};
```

## Best Practices

### Import Organization

```javascript
// 1. Framework imports
import { Entity, Service, DataProvider, View } from "/lib/altseven/dist/a7.js";

// 2. Application core imports
import { a7 } from "/assets/js/app.js";

// 3. Entity imports
import { Product } from "/assets/js/entity/product.js";
import { Order } from "/assets/js/entity/order.js";

// 4. Service imports
import { ProductService } from "/assets/js/service/product.js";

// 5. Component imports (DataProvider, View)
import { ProductListDP } from "/assets/js/dataprovider/productlist.js";
import { ProductView } from "/assets/js/view/product.js";

// 6. Utility imports
import * as utils from "/assets/js/app.utils.js";
```

### Consistent Naming

- **Files**: lowercase, descriptive (product.js, userprofile.js)
- **Classes**: PascalCase (Product, UserProfile, ProductService)
- **Functions**: camelCase (getProduct, updateUserProfile)
- **View constructors**: PascalCase (Products, ProductView)
- **Constants**: UPPER_SNAKE_CASE (API_BASE_URL, MAX_RETRIES)

### Documentation

Add JSDoc comments for public APIs:

```javascript
/**
 * Searches products by category
 * @param {string} category - The category to search
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum results to return
 * @param {string} options.sortBy - Field to sort by
 * @returns {Promise<Array<Product>>} Array of matching products
 */
async searchByCategory(category, options = {}) {
  // Implementation
}
```

### Version Control

Commit logical units:
- One feature per commit
- Clear commit messages
- Don't commit built files (dist/) unless distributing

### Testing Structure

```
tests/
├── unit/
│   ├── entity/
│   │   └── product.test.js
│   ├── service/
│   │   └── product.test.js
│   └── dataprovider/
│       └── productlist.test.js
├── integration/
│   └── product-flow.test.js
└── e2e/
    └── checkout.test.js
```

## Summary

Following these structural conventions:
- Makes code predictable and discoverable
- Improves maintainability
- Facilitates team collaboration
- Enables scaling as application grows
- Maintains consistency across projects

Start with the recommended structure for small/medium apps, and adopt feature-based organization as your application grows larger.
