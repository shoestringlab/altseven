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
