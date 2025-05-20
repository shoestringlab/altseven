# altseven

v 7.5.3

A JavaScript framework. Originally built as an exploration into reactive programming with JavaScript. Now a full-fledged Web framework.


Compile on CLI from root folder:

    `$ grunt clean`

To install dev dependencies from NPM:

    `$ npm install`


Current Release - 7.5.0
--------

This release adds three new ES 6 class components- a base Component with the event bindings, a DataProvider to manage state in a View, an Entity class as a base class for data schemas, and a Service class for managing remote resources, data caching in the model, and (coming soon) data binding for automated update of View state when data changes.

The User component has been re-factored as an ES6 class as well. If you have used the Constructor component to instantiate a User, you will need to update your code to use the new ES6 class.

7.5.0 should be a drop-in replacement compatible with previous versions, except for the User component change. Where the User component is instantiated in the framework itself has been updated to use the new ES6 class.

DataProvider, Entity, and Service are in active development and may change, so please treat these as experimental features.


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

## Documentation

https://altseven.shoestringlab.com


## Running the Sample App

### NodeJS

$ node index.js

from the root of the project and access the sample apps at:

127.0.0.1:8800/test/index.html.

### CFML

The CFML engine test has been deprecated and may not be functional.

To run the example application included in the /test folder, you need a CFML engine. The easiest way to run it is to install CommandBox:

https://www.ortussolutions.com/products/commandbox

If you are running Linux, you can follow directions on my blog for installing CommandBox:

https://robertmunn.com/blog/installing-commandbox-on-ubuntu-1804-to-manage-cfml-based-web-app-development


If you prefer to see altseven in action with a NodeJS backend, you can clone the git repo for tasklist:

    $ git clone https://github.com/robertdmunn/tasklist

Check the homepage/README for tasklist for directions on running it.

This project is licensed under the Mozilla Public License 2.0, except where noted otherwise.
