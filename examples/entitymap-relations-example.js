/**
 * Entity Map Relations Example
 *
 * This example demonstrates the new DataProvider entity map relation feature
 * which simplifies loading and paginating related entities from a remote server.
 */

import { Application, Entity, Service, View, DataProvider } from "../dist/a7.js";

// ============================================================================
// STEP 1: Define Entity Classes
// ============================================================================

/**
 * User Entity
 */
class User extends Entity {
	static schema = {
		id: { type: "integer", id: true, required: true },
		username: { type: "string", required: true },
		email: { type: "string" },
	};
}

/**
 * Post Entity
 */
class Post extends Entity {
	static schema = {
		id: { type: "integer", id: true, required: true },
		userId: { type: "integer", required: true },
		title: { type: "string", required: true },
		content: { type: "string" },
		createdAt: { type: "date" },
	};
}

/**
 * Comment Entity
 */
class Comment extends Entity {
	static schema = {
		id: { type: "integer", id: true, required: true },
		postId: { type: "integer", required: true },
		userId: { type: "integer", required: true },
		content: { type: "string", required: true },
		createdAt: { type: "date" },
	};
}

// ============================================================================
// STEP 2: Define Services with Custom Fetch Methods
// ============================================================================

/**
 * User Service
 */
class UserService extends Service {
	constructor() {
		super({
			id: "users",
			key: "id",
			entityClass: User,
			remoteMethods: {
				create: "POST /api/users",
				read: "GET /api/users/:id",
				update: "PATCH /api/users/:id",
				delete: "DELETE /api/users/:id",
				readAll: "GET /api/users",
				readMany: "POST /api/users/many",
			},
		});
	}
}

/**
 * Post Service with custom fetch methods for relations
 */
class PostService extends Service {
	constructor() {
		super({
			id: "posts",
			key: "id",
			entityClass: Post,
			remoteMethods: {
				create: "POST /api/posts",
				read: "GET /api/posts/:id",
				update: "PATCH /api/posts/:id",
				delete: "DELETE /api/posts/:id",
				readAll: "GET /api/posts",
				readMany: "POST /api/posts/many",

				// Custom method to fetch post IDs for a user (with pagination)
				// Expected response: { ids: [1, 2, 3, ...], total: 45 }
				getUserPostIds: "GET /api/users/:userId/posts/ids",
			},
		});
	}
}

/**
 * Comment Service with custom fetch methods
 */
class CommentService extends Service {
	constructor() {
		super({
			id: "comments",
			key: "id",
			entityClass: Comment,
			remoteMethods: {
				create: "POST /api/comments",
				read: "GET /api/comments/:id",
				update: "PATCH /api/comments/:id",
				delete: "DELETE /api/comments/:id",
				readAll: "GET /api/comments",
				readMany: "POST /api/comments/many",

				// Custom method to fetch comment IDs for a post (with pagination)
				// Expected response: { ids: [1, 2, 3, ...], total: 120 }
				getPostCommentIds: "GET /api/posts/:postId/comments/ids",
			},
		});
	}
}

// ============================================================================
// STEP 3: Create Application and Register Services
// ============================================================================

const app = new Application({
	name: "entityMapExample",
	auth: {
		sessionTimeout: 15 * 60 * 1000,
		useTokens: true,
	},
	logging: {
		logLevel: "DEBUG,INFO,WARN,ERROR",
		toBrowserConsole: true,
	},
	services: [new UserService(), new PostService(), new CommentService()],
});

await app.init();

// ============================================================================
// STEP 4: Create View with DataProvider using Entity Map Relations
// ============================================================================

/**
 * User Profile View - Shows user and their paginated posts
 */
const userProfileView = new View({
	id: "userProfile",
	selector: "#user-profile",
});

/**
 * DataProvider with entityMap relations
 */
const userProfileDP = new DataProvider({
	view: userProfileView,
	schema: {
		// Simple object property
		user: { type: "object" },

		// Entity Map relation - posts for the user
		posts: {
			type: "entityMap",                    // Special type for entity collections
			service: "posts",                     // Service ID to use
			fetchMethod: "getUserPostIds",        // Method to fetch entity IDs
			defaultCriteria: {                    // Default pagination/filter criteria
				limit: 10,
				offset: 0,
			},
		},

		// Pagination state
		currentPage: { type: "object" },
		totalPosts: { type: "integer" },
	},
	state: {
		user: null,
		posts: new Map(),
		currentPage: 1,
		totalPosts: 0,
	},
});

// Register DataProvider and View
app.dataproviders.register(userProfileDP);
app.ui.register(userProfileView);

// ============================================================================
// STEP 5: Load and Use Entity Map Relations
// ============================================================================

/**
 * Load user profile with initial posts (first page)
 */
async function loadUserProfile(userId) {
	try {
		// Load user data
		const user = await app.services.getService("users").read(userId);
		userProfileDP.setState({ user, currentPage: 1 });

		// Load posts using entity map relation
		// This will:
		// 1. Call getUserPostIds with { userId, limit: 10, offset: 0 }
		// 2. Get array of post IDs from response
		// 3. Call readMany(ids) to fetch and cache the posts
		// 4. Set the posts Map into DataProvider state
		await userProfileDP.loadRelation("posts", {
			userId: userId,
			limit: 10,
			offset: 0,
		});

		console.log("User profile loaded:", userProfileDP.getState());
	} catch (error) {
		console.error("Error loading user profile:", error);
	}
}

/**
 * Navigate to next page of posts
 */
async function nextPage() {
	const state = userProfileDP.getState();
	const currentPage = state.currentPage;
	const offset = currentPage * 10; // Assuming 10 posts per page

	try {
		// Refresh the posts relation with new offset
		// This automatically merges with stored criteria (userId, limit)
		await userProfileDP.refresh("posts", {
			offset: offset,
		});

		userProfileDP.setState({ currentPage: currentPage + 1 });
		console.log(`Loaded page ${currentPage + 1}`);
	} catch (error) {
		console.error("Error loading next page:", error);
	}
}

/**
 * Navigate to previous page of posts
 */
async function previousPage() {
	const state = userProfileDP.getState();
	const currentPage = state.currentPage;

	if (currentPage <= 1) {
		console.log("Already on first page");
		return;
	}

	const offset = (currentPage - 2) * 10;

	try {
		await userProfileDP.refresh("posts", {
			offset: offset,
		}, {
			merge: false, // Replace instead of merging
		});

		userProfileDP.setState({ currentPage: currentPage - 1 });
		console.log(`Loaded page ${currentPage - 1}`);
	} catch (error) {
		console.error("Error loading previous page:", error);
	}
}

/**
 * Reload current page (force refresh from server)
 */
async function reloadCurrentPage() {
	const state = userProfileDP.getState();
	const currentPage = state.currentPage;
	const offset = (currentPage - 1) * 10;

	try {
		// Use reload option to clear cache and fetch fresh data
		await userProfileDP.refresh("posts", {
			offset: offset,
		}, {
			reload: true,
			merge: false,
		});

		console.log(`Reloaded page ${currentPage}`);
	} catch (error) {
		console.error("Error reloading page:", error);
	}
}

/**
 * Clear all posts
 */
function clearPosts() {
	userProfileDP.clearRelation("posts");
	console.log("Posts cleared");
}

/**
 * Get current relation criteria (useful for debugging)
 */
function getCurrentCriteria() {
	const criteria = userProfileDP.getRelationCriteria("posts");
	console.log("Current posts criteria:", criteria);
	return criteria;
}

// ============================================================================
// STEP 6: Nested Relations Example (Posts with Comments)
// ============================================================================

/**
 * Post Detail View - Shows a post with paginated comments
 */
const postDetailView = new View({
	id: "postDetail",
	selector: "#post-detail",
});

const postDetailDP = new DataProvider({
	view: postDetailView,
	schema: {
		post: { type: "object" },

		// Comments for the post
		comments: {
			type: "entityMap",
			service: "comments",
			fetchMethod: "getPostCommentIds",
			defaultCriteria: {
				limit: 20,
				offset: 0,
			},
		},

		currentPage: { type: "integer" },
	},
	state: {
		post: null,
		comments: new Map(),
		currentPage: 1,
	},
});

app.dataproviders.register(postDetailDP);
app.ui.register(postDetailView);

/**
 * Load post with comments
 */
async function loadPostDetail(postId) {
	try {
		const post = await app.services.getService("posts").read(postId);
		postDetailDP.setState({ post, currentPage: 1 });

		await postDetailDP.loadRelation("comments", {
			postId: postId,
			limit: 20,
			offset: 0,
		});

		console.log("Post detail loaded:", postDetailDP.getState());
	} catch (error) {
		console.error("Error loading post detail:", error);
	}
}

// ============================================================================
// STEP 7: View Templates (Example rendering)
// ============================================================================

userProfileView.template = function () {
	const state = this.getState();

	if (!state.user) {
		return `<div>Loading...</div>`;
	}

	const posts = Array.from(state.posts.values());

	return `
		<div class="user-profile">
			<h1>${state.user.username}</h1>
			<p>${state.user.email}</p>

			<h2>Posts (Page ${state.currentPage})</h2>
			<div class="posts">
				${posts.map(post => `
					<article>
						<h3>${post.title}</h3>
						<p>${post.content}</p>
						<small>${post.createdAt}</small>
					</article>
				`).join("")}
			</div>

			<div class="pagination">
				<button data-onclick="previousPage">Previous</button>
				<span>Page ${state.currentPage}</span>
				<button data-onclick="nextPage">Next</button>
			</div>
		</div>
	`;
};

postDetailView.template = function () {
	const state = this.getState();

	if (!state.post) {
		return `<div>Loading...</div>`;
	}

	const comments = Array.from(state.comments.values());

	return `
		<div class="post-detail">
			<article>
				<h1>${state.post.title}</h1>
				<p>${state.post.content}</p>
			</article>

			<h2>Comments (Page ${state.currentPage})</h2>
			<div class="comments">
				${comments.map(comment => `
					<div class="comment">
						<p>${comment.content}</p>
						<small>User ${comment.userId} - ${comment.createdAt}</small>
					</div>
				`).join("")}
			</div>
		</div>
	`;
};

// ============================================================================
// STEP 8: Event Listeners (Optional)
// ============================================================================

// Listen for relation loaded event
userProfileDP.on("relationLoaded", (dp, args) => {
	console.log(`Relation "${args.propertyName}" loaded with ${args.count} items`);
});

// Listen for relation refreshed event
userProfileDP.on("relationRefreshed", (dp, args) => {
	console.log(`Relation "${args.propertyName}" refreshed with ${args.count} items`);
});

// Listen for relation cleared event
userProfileDP.on("relationCleared", (dp, args) => {
	console.log(`Relation "${args.propertyName}" cleared`);
});

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Load user profile with posts
await loadUserProfile(123);

// Example 2: Navigate through pages
await nextPage();
await nextPage();
await previousPage();

// Example 3: Reload current page
await reloadCurrentPage();

// Example 4: Check current criteria
getCurrentCriteria(); // { userId: 123, limit: 10, offset: 10 }

// Example 5: Clear relation data
clearPosts();

// Example 6: Load post with comments
await loadPostDetail(456);

// ============================================================================
// ADVANCED USAGE
// ============================================================================

/**
 * Example: Filter and sort with pagination
 */
const filteredPostsDP = new DataProvider({
	view: userProfileView,
	schema: {
		posts: {
			type: "entityMap",
			service: "posts",
			fetchMethod: "getUserPostIds",
			defaultCriteria: {
				limit: 10,
				offset: 0,
				sortBy: "createdAt",
				sortOrder: "desc",
				status: "published",
			},
		},
	},
	state: {
		posts: new Map(),
	},
});

// Load with additional filters
await filteredPostsDP.loadRelation("posts", {
	userId: 123,
	category: "technology",
});

// The final criteria will be:
// { limit: 10, offset: 0, sortBy: "createdAt", sortOrder: "desc",
//   status: "published", userId: 123, category: "technology" }

/**
 * Example: Return data without setting state
 */
const posts = await userProfileDP.loadRelation("posts", {
	userId: 123,
}, {
	returnData: true, // Get the Map returned
});

console.log(`Loaded ${posts.size} posts`);

/**
 * Example: Replace instead of merge
 */
await userProfileDP.refresh("posts", {
	offset: 20,
}, {
	merge: false, // Replace existing posts instead of merging
});

export {
	loadUserProfile,
	nextPage,
	previousPage,
	reloadCurrentPage,
	clearPosts,
	getCurrentCriteria,
	loadPostDetail,
};
