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
