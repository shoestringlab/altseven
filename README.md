# altseven

v 7.0.1

A JavaScript framework. Originally built as an exploration into reactive programming with JavaScript. Now a full-fledged Web framework.


Compile on CLI from root folder:

    `$ grunt clean`

To install dev dependencies from NPM:

    `$ npm install`


Current Release - 7.0.1
--------

This release adds data binding to views, and new capabilities to the model, including undo, redo, fast forward, and rewind functions for any value in the model.

Data binding is accomplished by using the attribute data-bind=<key> on any given HTML attribute that displays or inputs text, e.g. data-bind='user.firstname'. In this case, the firstname property of the user key in the model will be bound to the HTML element.

Gadget-ui has been marked as a dependency for versioning purposes. It is not strictly necessary to use it for anything.

## Installation

Note that the library is no longer published on Bower, so pull from npm.

`$ npm install altseven`


You only need to install dependencies from npm to work on the altseven framework, or for optional modules:

gadget-ui can be used for the FloatingPane as a container for the debugging console.

    $ npm install gadget-ui

Handlebars can be used as the templating engine.

    $ npm install handlebars

modlazy can be used as a module/dependency loader if you use Handlebars or Mustache for rendering

    $ npm install modlazy



***Running the Sample App***

As of 6.0.0-beta, a CFML engine is no longer required to run the sample apps. You can now run $ node index.js from the root of the project and access the sample apps at 127.0.0.1:8800/test/index.htm. As of the beta, only the Template Literals sample app has been tested with this release.

----

To run the example application included in the /test folder, you need a CFML engine. The easiest way to run it is to install CommandBox:

https://www.ortussolutions.com/products/commandbox

If you are running Linux, you can follow directions on my blog for installing CommandBox:

https://robertmunn.com/blog/installing-commandbox-on-ubuntu-1804-to-manage-cfml-based-web-app-development


If you prefer to see altseven in action with a NodeJS backend, you can clone the git repo for tasklist:

    $ git clone https://github.com/robertdmunn/tasklist

Check the homepage/README for tasklist for directions on running it.

This project is licensed under the Mozilla Public License 2.0, except where noted otherwise.
