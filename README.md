altseven
=========

v 1.2.0

A JavaScript framework. Largely built as an academic exercise.

1.2.0 is a transitional release. UI implementation using Template Literals differs significantly from implementation using Mustache or Handlebars. The roadmap for v 2.0.0 calls for this new implementation to be ported to Mustache and Handlebars as well.

Compile on CLI from root folder:

    $ grunt clean

To install dependencies from NPM:

    $ npm install

As of v 1.2.0, you do not need to install dependencies from Bower unless you wish to use Mustache for templating.

    $ bower install

To run the example application included in the /test folder, you need a CFML engine. The easiest way to run it is to install CommandBox:

https://www.ortussolutions.com/products/commandbox

If you are running Linux, you can follow directions on my blog for installing CommandBox:

https://robertmunn.com/blog/installing-commandbox-on-ubuntu-1804-to-manage-cfml-based-web-app-development


If you prefer to see altseven in action with a NodeJS backend, you can clone the git repo for tasklist:

    $ git clone https://github.com/robertdmunn/tasklist

Check the homepage/README for tasklist for directions on running it.

*Updated* for version 1.20, altseven now supports ES6 Template Literals and a new, ReactJS-style implementation for UI rendering, but without JSX and without a compile step.

*Updated* for version 1.1.0, there is an ES6 build that exports the framework for import using standard ES6 import statements.

Check the test code in /test/es6/ for an example using the framework as an import in ES6. This code works in current Chrome and Firefox browsers without transpiling.
