# Entity Map Relations

## Overview

Entity Map Relations is a new feature in DataProvider (v8.0.0-beta.2.2+) that simplifies loading and managing collections of related entities from a remote server. This feature is particularly useful for scenarios like pagination, where you need to:

1. Fetch a list of entity IDs based on criteria (e.g., posts for a user)
2. Load those entities from the server into service cache
3. Update the DataProvider state with the entities
4. Refresh the data with new criteria (e.g., next page)

Previously, this required manual orchestration of multiple service calls. Now it's declarative and automatic.

## Key Features

- **Declarative Schema**: Define relations in DataProvider schema
- **Automatic Orchestration**: Handles fetch → readMany → setState automatically
- **Criteria Management**: Stores and merges criteria for easy pagination
- **Flexible Options**: Support for merging, reloading, and returning data
- **Event-Driven**: Fires events for relation lifecycle
- **Error Handling**: Comprehensive validation and error messages

## Basic Concept

```javascript
// 1. Define the relation in schema
schema: {
  posts: {
    type: "entityMap",              // Special type for entity collections
    service: "posts",               // Service ID
    fetchMethod: "getUserPostIds",  // Custom method to get IDs
    defaultCriteria: { limit: 10, offset: 0 }
  }
}

// 2. Load the relation
await dataProvider.loadRelation('posts', { userId: 123 });

// 3. Refresh with new criteria (pagination)
await dataProvider.refresh('posts', { offset: 10 });
```

## How It Works

### Step-by-Step Process

When you call `loadRelation()` or `refresh()`:

1. **Validation**: Validates that the property is defined in schema as `entityMap` type
2. **Service Lookup**: Gets the service by ID from ServiceManager
3. **Fetch IDs**: Calls the `fetchMethod` with criteria to get entity IDs
4. **Load Entities**: Calls `service.readMany(ids)` to fetch and cache entities
5. **Update State**: Sets the resulting Map into DataProvider state
6. **Store Criteria**: Saves criteria for future `refresh()` calls
7. **Fire Event**: Emits `relationLoaded` or `relationRefreshed` event

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     DataProvider                         │
│                                                          │
│  loadRelation('posts', { userId: 123, offset: 0 })     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├──> 1. Validate schema
                     │
                     ├──> 2. Get Service
                     │         │
                     │         v
                     │    ┌─────────────────────────┐
                     │    │    PostService          │
                     │    └─────────────────────────┘
                     │
                     ├──> 3. Invoke fetchMethod
                     │         │
                     │         v
                     │    POST /api/users/123/posts/ids
                     │         │
                     │         v
                     │    { ids: [1, 2, 3, 4, 5] }
                     │
                     ├──> 4. Call readMany([1,2,3,4,5])
                     │         │
                     │         v
                     │    Entities cached in Service
                     │         │
                     │         v
                     │    Map { 1 => Post, 2 => Post, ... }
                     │
                     └──> 5. setState({ posts: Map })
```

## Schema Configuration

### Entity Map Type

```javascript
propertyName: {
  type: "entityMap",                     // Required: Must be "entityMap"
  service: "serviceId",                  // Required: Service ID
  fetchMethod: "methodName",             // Required: Method in remoteMethods
  defaultCriteria: { /* ... */ }         // Optional: Default criteria
}
```

### Service Configuration

Your service must have the `fetchMethod` defined in `remoteMethods`:

```javascript
class PostService extends Service {
  constructor() {
    super({
      id: "posts",
      entityClass: Post,
      remoteMethods: {
        // Standard CRUD
        read: "GET /api/posts/:id",
        readMany: "POST /api/posts/many",

        // Custom fetch method for relation
        // Should return: array of IDs or { ids: [...] }
        getUserPostIds: "GET /api/users/:userId/posts/ids"
      }
    });
  }
}
```

### Expected Response Format

The `fetchMethod` should return one of these formats:

```javascript
// Option 1: Array of IDs
[1, 2, 3, 4, 5]

// Option 2: Object with ids property
{
  ids: [1, 2, 3, 4, 5],
  total: 45,
  page: 1
}

// Option 3: Object with data property
{
  data: [1, 2, 3, 4, 5],
  meta: { total: 45 }
}
```

## API Reference

### loadRelation(propertyName, criteria, options)

Load a relation for the first time or reload completely.

**Parameters:**
- `propertyName` (string): Property name in schema
- `criteria` (object): Criteria to pass to fetchMethod
- `options` (object): Optional configuration
  - `merge` (boolean): Merge with existing data (default: `true`)
  - `returnData` (boolean): Return the Map (default: `false`)

**Returns:** `Promise<Map|void>`

**Example:**
```javascript
// Basic load
await dataProvider.loadRelation('posts', {
  userId: 123,
  limit: 10,
  offset: 0
});

// Load and return data
const posts = await dataProvider.loadRelation('posts', {
  userId: 123
}, {
  returnData: true
});
```

### refresh(propertyName, criteria, options)

Refresh a previously loaded relation with new or merged criteria.

**Parameters:**
- `propertyName` (string): Property name in schema
- `criteria` (object): New criteria to merge or replace
- `options` (object): Optional configuration
  - `merge` (boolean): Merge entities with existing (default: `true`)
  - `reload` (boolean): Clear stored criteria and reload (default: `false`)
  - `returnData` (boolean): Return the Map (default: `false`)

**Returns:** `Promise<Map|void>`

**Example:**
```javascript
// Refresh with merged criteria (pagination)
await dataProvider.refresh('posts', { offset: 10 });

// Reload from scratch
await dataProvider.refresh('posts', {
  userId: 456,
  offset: 0
}, {
  reload: true
});

// Replace instead of merge
await dataProvider.refresh('posts', { offset: 20 }, {
  merge: false
});
```

### clearRelation(propertyName)

Clear relation data and stored criteria.

**Parameters:**
- `propertyName` (string): Property name in schema

**Example:**
```javascript
dataProvider.clearRelation('posts');
```

### getRelationCriteria(propertyName)

Get the currently stored criteria for a relation.

**Parameters:**
- `propertyName` (string): Property name in schema

**Returns:** `object|null`

**Example:**
```javascript
const criteria = dataProvider.getRelationCriteria('posts');
// { userId: 123, limit: 10, offset: 10 }
```

## Events

### relationLoaded

Fired when a relation is successfully loaded.

```javascript
dataProvider.on('relationLoaded', (dp, args) => {
  console.log(`Loaded ${args.count} items for ${args.propertyName}`);
  console.log('Criteria:', args.criteria);
});
```

**Event Args:**
- `propertyName` (string): The property that was loaded
- `criteria` (object): The final criteria used
- `count` (number): Number of entities loaded

### relationRefreshed

Fired when a relation is successfully refreshed.

```javascript
dataProvider.on('relationRefreshed', (dp, args) => {
  console.log(`Refreshed ${args.count} items for ${args.propertyName}`);
});
```

**Event Args:**
- `propertyName` (string): The property that was refreshed
- `criteria` (object): The final criteria used
- `count` (number): Number of entities loaded

### relationCleared

Fired when a relation is cleared.

```javascript
dataProvider.on('relationCleared', (dp, args) => {
  console.log(`Cleared ${args.propertyName}`);
});
```

**Event Args:**
- `propertyName` (string): The property that was cleared

## Common Use Cases

### 1. Pagination

```javascript
// Schema
schema: {
  posts: {
    type: "entityMap",
    service: "posts",
    fetchMethod: "getUserPostIds",
    defaultCriteria: { limit: 10, offset: 0 }
  },
  currentPage: { type: "integer" }
}

// Initial load
await dataProvider.loadRelation('posts', { userId: 123 });
dataProvider.setState({ currentPage: 1 });

// Next page
async function nextPage() {
  const page = dataProvider.getState().currentPage;
  await dataProvider.refresh('posts', {
    offset: page * 10
  });
  dataProvider.setState({ currentPage: page + 1 });
}
```

### 2. Filtering with Pagination

```javascript
// Load with filter
await dataProvider.loadRelation('posts', {
  userId: 123,
  status: 'published',
  category: 'technology',
  limit: 20,
  offset: 0
});

// Change filter (keeps userId, updates category)
await dataProvider.refresh('posts', {
  category: 'science'
});

// Pagination (keeps all criteria)
await dataProvider.refresh('posts', { offset: 20 });
```

### 3. Infinite Scroll

```javascript
// Initial load
await dataProvider.loadRelation('posts', {
  userId: 123,
  limit: 20,
  offset: 0
});

// Load more (merge with existing)
async function loadMore() {
  const posts = dataProvider.getState().posts;
  const offset = posts.size;

  await dataProvider.refresh('posts', {
    offset
  }, {
    merge: true  // Add to existing posts
  });
}
```

### 4. Search with Debounce

```javascript
let searchTimer;

function searchPosts(query) {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(async () => {
    await dataProvider.refresh('posts', {
      query,
      offset: 0  // Reset to first page
    }, {
      merge: false  // Replace existing results
    });
  }, 300);
}
```

### 5. Nested Relations

```javascript
// User has posts, posts have comments

// User Profile DataProvider
const userProfileDP = new DataProvider({
  view: userView,
  schema: {
    user: { type: "object" },
    posts: {
      type: "entityMap",
      service: "posts",
      fetchMethod: "getUserPostIds",
      defaultCriteria: { limit: 10, offset: 0 }
    }
  }
});

// Post Detail DataProvider
const postDetailDP = new DataProvider({
  view: postView,
  schema: {
    post: { type: "object" },
    comments: {
      type: "entityMap",
      service: "comments",
      fetchMethod: "getPostCommentIds",
      defaultCriteria: { limit: 20, offset: 0 }
    }
  }
});

// Load user → posts
await userProfileDP.loadRelation('posts', { userId: 123 });

// Load post → comments
await postDetailDP.loadRelation('comments', { postId: 456 });
```

### 6. Real-time Updates

```javascript
// Listen for new posts via WebSocket
websocket.on('new-post', async (postData) => {
  // Reload current page to include new post
  const criteria = dataProvider.getRelationCriteria('posts');
  await dataProvider.refresh('posts', criteria, {
    reload: true,
    merge: false
  });
});
```

## Best Practices

### 1. Define Default Criteria

Always set sensible defaults in your schema:

```javascript
schema: {
  posts: {
    type: "entityMap",
    service: "posts",
    fetchMethod: "getUserPostIds",
    defaultCriteria: {
      limit: 10,        // Page size
      offset: 0,        // Start at beginning
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  }
}
```

### 2. Use Meaningful Fetch Method Names

```javascript
// Good
fetchMethod: "getUserPostIds"
fetchMethod: "getPublishedPostIds"
fetchMethod: "getPostCommentIds"

// Bad
fetchMethod: "getPosts"  // Unclear that it returns IDs
fetchMethod: "fetch"     // Too generic
```

### 3. Handle Empty Results

```javascript
await dataProvider.loadRelation('posts', { userId: 123 });

const posts = dataProvider.getState().posts;
if (posts.size === 0) {
  // Show "no posts" message
}
```

### 4. Track Pagination State

```javascript
schema: {
  posts: { type: "entityMap", /* ... */ },
  currentPage: { type: "integer" },
  totalPages: { type: "integer" },
  hasMore: { type: "boolean" }
}

// After loading
const response = await service.invoke('getUserPostIds', criteria);
dataProvider.setState({
  totalPages: Math.ceil(response.total / criteria.limit),
  hasMore: response.total > (criteria.offset + criteria.limit)
});
```

### 5. Debounce Refresh Calls

```javascript
import { debounce } from '../src/modules/util.js';

const debouncedRefresh = debounce(async (criteria) => {
  await dataProvider.refresh('posts', criteria);
}, 300);

// Use in search
searchInput.addEventListener('input', (e) => {
  debouncedRefresh({ query: e.target.value, offset: 0 });
});
```

### 6. Error Handling

```javascript
try {
  await dataProvider.loadRelation('posts', { userId: 123 });
} catch (error) {
  if (error.message.includes('not defined in schema')) {
    // Schema configuration error
  } else if (error.message.includes('Service') && error.message.includes('not found')) {
    // Service not registered
  } else if (error.message.includes('unexpected format')) {
    // API response format error
  } else {
    // Network or other error
  }

  console.error('Failed to load posts:', error);
  // Show error message to user
}
```

## Migration Guide

### Before (Manual Orchestration)

```javascript
// Old way - manual orchestration
async function loadUserPosts(userId, offset = 0) {
  try {
    // 1. Fetch IDs
    const response = await postsService.invoke('getUserPostIds', {
      userId,
      limit: 10,
      offset
    });

    // 2. Extract IDs
    const ids = response.ids || response;

    // 3. Fetch entities
    const postsMap = await postsService.readMany(ids);

    // 4. Update state
    dataProvider.setState({ posts: postsMap });

  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

// Pagination requires tracking all criteria manually
async function nextPage() {
  currentOffset += 10;
  await loadUserPosts(currentUserId, currentOffset);
}
```

### After (Entity Map Relations)

```javascript
// New way - declarative and automatic
schema: {
  posts: {
    type: "entityMap",
    service: "posts",
    fetchMethod: "getUserPostIds",
    defaultCriteria: { limit: 10, offset: 0 }
  }
}

// Initial load
await dataProvider.loadRelation('posts', { userId: 123 });

// Pagination - automatically merges with stored criteria
async function nextPage() {
  const criteria = dataProvider.getRelationCriteria('posts');
  await dataProvider.refresh('posts', {
    offset: criteria.offset + 10
  });
}
```

## Troubleshooting

### Error: "Property X is not defined in DataProvider schema"

**Cause:** The property is not in your schema or has a typo.

**Solution:**
```javascript
// Make sure property exists in schema
schema: {
  posts: {  // Property name must match
    type: "entityMap",
    // ...
  }
}

// Call with correct property name
await dataProvider.loadRelation('posts', { /* ... */ });
```

### Error: "Property X is not of type entityMap"

**Cause:** The property exists but is not configured as an entity map.

**Solution:**
```javascript
// Change type to "entityMap"
schema: {
  posts: {
    type: "entityMap",  // Must be "entityMap", not "map" or "object"
    service: "posts",
    fetchMethod: "getUserPostIds"
  }
}
```

### Error: "Service X not found"

**Cause:** The service ID doesn't match a registered service.

**Solution:**
```javascript
// Ensure service is registered
const app = new Application({
  services: [new PostService()]  // Register service
});

// Service ID must match
class PostService extends Service {
  constructor() {
    super({
      id: "posts",  // This ID must match schema.service
      // ...
    });
  }
}

schema: {
  posts: {
    type: "entityMap",
    service: "posts",  // Must match service.id
    // ...
  }
}
```

### Error: "fetchMethod X returned unexpected format"

**Cause:** The API response format is not recognized.

**Solution:** Ensure your API returns one of these formats:
```javascript
// Option 1: Array
[1, 2, 3, 4, 5]

// Option 2: Object with ids
{ ids: [1, 2, 3, 4, 5] }

// Option 3: Object with data
{ data: [1, 2, 3, 4, 5] }
```

### Error: "Relation X has not been loaded yet"

**Cause:** Trying to `refresh()` before `loadRelation()`.

**Solution:**
```javascript
// Option 1: Load first
await dataProvider.loadRelation('posts', { userId: 123 });
await dataProvider.refresh('posts', { offset: 10 });

// Option 2: Use reload option
await dataProvider.refresh('posts', {
  userId: 123,
  offset: 10
}, {
  reload: true
});
```

## Performance Considerations

1. **Request Deduplication**: Service layer automatically deduplicates concurrent requests
2. **Caching**: Entities are cached in Service, reducing redundant network calls
3. **Pagination**: Only fetch IDs first, then use `readMany()` with cache checking
4. **Merge vs Replace**: Use `merge: true` for infinite scroll, `merge: false` for page replacement

## Version History

- **v8.0.0-beta.2.2**: Initial release of Entity Map Relations feature
  - Added `loadRelation()`, `refresh()`, `clearRelation()`, `getRelationCriteria()`
  - Added `entityMap` schema type
  - Added relation events
  - Updated DataProviderManager to inject ServiceManager reference

## See Also

- [DataProvider API Documentation](./dataprovider.md)
- [Service API Documentation](./service.md)
- [Entity Schema Documentation](./entity.md)
- [Complete Example](../examples/entitymap-relations-example.js)
