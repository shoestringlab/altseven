7.3.0
============

This release adds an experimental feature, adding the optional remote.tokenType setting, defaulting to 'X-Token' (the previous standard), with an option to use 'access_token'. This option changes the way tokens are handled in the framework, passing requests to the back end using the Authorization: Bearer <token> header standard from OAuth 2.0. On the response, the framework will pull tokens set in the access_token header, which is not a standard part of the OAuth response, where the access_token is returned in the response body. This feature may or may not be maintained long time, so be warned.

7.2.0
============

This release changes the required response of the refresh mechanism and changes the response of a7.security.isAuthenticated. Previously, this method returned true or false. Now, this method returns an object { authenticated: true|false }. The refresh method on the server should now return an object with the authenticated key and a boolean value. The refresh method may also optionally return other information, such as an updated user object. This refresh method can be used to re-establish a user session if the rememberMeToken cookie is set in the user's browser.

7.1.0
============

This release adds a rememberMe value set in the body of the built in remote login function so users can stay authenticated beyond their current session. Only the flag is
provided. It defaults to false if not presnt. The developer is responsible for implementation of the functionality.

7.0.2
============

Minor changes to README.

7.0.1
============

This release adds data binding to views, and new capabilities to the model, including undo, redo, fast forward, and rewind functions for any value in the model.

Data binding is accomplished by using the attribute data-bind=<key> on any given HTML attribute that displays or inputs text, e.g. data-bind='user.firstname'. In this case, the firstname property of the user key in the model will be bound to the HTML element.


7.0.0-alpha
============

The 7.x release represents a potential departure from previous version compatibility. Current breaking changes:
- a7.ui.setSelector( selector ) now also caches the node in _nodes[] using document.querySelector( selector ).
- a7.ui.getNode( name ) now returns the cached node.


6.3.0
============
- The mustRender event handler for View objects is now a debounced function configurable in the application settings so developers can control the minimum delay for re-rendering views.
- The debounce function in a7.util is now available to developers for use in applications.


6.2.0
============

- The model now handles Map objects so that they are preserved as iterable Maps rather than being returned as generic Objects.
- The underlying model object of the framework now contains an experimental feature, binding an HTML element to a key in the model, so that changes to the value of the HTML element change the model, and vice versa. This feature is not directly exposed through the framework at this time. This code may change significantly before it is considered stable, so treat it as experimental.

6.1.0
============

- The security module now accepts an options argument for configuration at runtime. As of this release, you can pass userArgs, an array with an object that holds keys and default values you want to include when a new User object is instantiated, e.g. security: { options: { userArgs: [{userID: ""}]}}.

6.0.3
============

- Add args to User function to allow developer to set data into the User object when instantiated

6.0.2
============

- Documentation site added at https://altseven.shoestringlab.com
- Simply app example added.
- a7.route.find method added.

6.0.1
============

- Updated dependencies to fix potential vulnerabilities.
- Updated semver for release on npm.

6.0.0-beta-8
============

- Add view.components to register external components in the view so they can be addressed

6.0.0-beta-7
============

- Move this.skipRender = false to mustRender function

6.0.0-beta-6
============

- Add skipRender boolean and and shouldRender function to enable skipping rendering when appropriate

6.0.0-beta-3
============

- add a7.router.match(path) function

6.0.0-beta-2
============

- Add default for params in a7.router.open( path, params )


6.0.0-beta
===========

- Adds a new client-side URL router module, a7.router.
  - Module is based on url-router, a Trie-based router by Jiang Fengmeng, https://github.com/jiangfengming/url-router
  - Allows for bookmarking, back button functionality
- a7.remote login and logout built-in methods now accept success and failure parameters which may be functions, router paths, or event names.

- Addition of test package in NodeJS to obviate the need for a CFML engine to run example apps. This feature is very much a hack as of now and only the Template Literals example app has been tested.
- Router functionality is demonstrated in the Template Literals example app.

- Release is considered initial beta and may change in functionality.

5.2.0
======

- add return to a7.remote.invoke to enable promises to be returned to calling function
- add isTransient to view to limit view timeout to transient components

5.1.0
======

- add getState to view.js
- remove mustRender from addChild
- model.get- return undefined if model element does not exist


5.0.1
======

- Fix Handlebars and Mustaches test apps

5.0.0
======

Major update for the framework.
- Registration of components is now automatic.
- view.js -
  - Addition of methods - addChild, removeChild, clearChildren, getParent
  - make props immutable
  - move parentID to props and specify in instantiation
  - move children to this scope from props
  - add mustUnregister event
  - automatically remove child when its element does not exist
  - automatically un-register component when its DOM element does not exist
- update a7.ui - getChildViewIds

4.2.0
======

- added unregister method to a7.ui to delete stale views
- added timer to view to check for stale views and remove them
- moved View.props.element to View.element
- fixed error checker in a7.remote code
- fixed login not authorized handling in a7.remote
- added ui.timeout for stale view checking to global options

4.1.0
======

- Added View.mustRender boolean to force rendering of a child component that otherwise may not render
- Added to and enhanced code for refreshing session with remote refresh call
- Added a7.security.invalidateSession and associated code to enable invalidating a session

4.0.0
======

- Add props.children to views to hold child views of a given view
- update test code

3.4.0
======

Added option to push a7.log messages to the browser console.

3.3.0
======

Updates for this version:
- Added websocket method to the remote module that handles creating websockets
- Moved the console websocket creation to the remote module
- Added event bindings to the error module
- Added scriptError event to the error module

3.2.0
======

The model has been updated to work specifically with altseven.
- strip binding code from model
- update model to make it free of side effects - all data passed in and out is deep copied
- model no longer supports holding functions inside objects since all objects are copied using JSON.parse(JSON.stringify( data ))
- nested references are no longer supported in the model, so if you want to access a7.console in the model, you have to model.get("a7").console
- the model now also has a history stack and  rewind, fast forward, undo and redo functions for use in undo/redo/replay functionality to be added later

3.1.0
======

Added a rendering queue to improve performance of view rendering. The queue is very rough at this point with minimal performance optimization.
- In the View component, mustRender no longer bubbles up to a given root component, since the queue now handles this functionality.
- The queue has a deferred queue that fills once the queue starts to process. The deferred queue becomes the new queue once the existing queue is processed.

3.0.0
======

Significant update to the framework:
- The View component has been expanded to handle functionalty that was in a7.ui.setView
- SetView has been replaced with a7.ui.register()
- The Constructor component has been re-worked to guarantee that events will be available to be bound when objects are created using the Constructor.
- EventBindings has been updated to not try to register event handlers for a given event if there are no handlers defined for it
- The View component has been updated to use events for:
    - registering nested components
    - singaling a required render
    - signaling when rendering is complete
    - registering nested components via the data-id attribute
    - bubbling up events to the root of the component chain

- Selectors in a7.ui have been changed to refer specifically to selector strings per convention.
- Nodes selected using selectors are now referred to in the View component as view.props.element
- Views are now passed selector strings and elements are selected at render time using the selector string
- a7.ui.getNode( selector ) returns an element based on the selector
- tests have been updated to use the new framework
- 2.x tests have been moved to /test/2.x
- Views no longer create their own render() functions. Instead, views user view.template as either a string or a function that returns a computed string.
- View.render() now handles rendering into a selector rather than returning the rendered HTML string.

2.0.1
======

Minor code cleanup and a few changes to options.
- The internal model is now the default model if none is specified.
- Extended events config will be rejected until implemented.
- No remote modules need be specified when providing URLs for remote auth
- web socket server will not be configured unless a websocket url is provided in the console config options.

2.0.0
======

2.0.0 completes the transition to a ReactJS-style of development for UI components. Instead of JSX, altseven supports ES6 Template Literals, MustacheJS, and Handlebars for templating. There is no compile step required to deploy a live application.

The a7.es6.js file set has been removed since ES6-style importing of the library is what will be supported moving forward. Use a7.js or a7.min.js for applications based on v 2.0.0 and forward.

1.2.0
======

1.2.0 is a transitional release. UI implementation using Template Literals differs significantly from implementation using Mustache or Handlebars. The roadmap for v 2.0.0 calls for this new implementation to be ported to Mustache and Handlebars as well.

*Updated* for version 1.20, altseven now supports ES6 Template Literals and a new, ReactJS-style implementation for UI rendering, but without JSX and without a compile step.



1.1.0
======

*Updated* for version 1.1.0, there is an ES6 build that exports the framework for import using standard ES6 import statements.
