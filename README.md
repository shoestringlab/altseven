## altseven

v 8.0.0-alpha.8

A JavaScript framework. Originally built as an exploration into reactive programming with JavaScript. Now a full-fledged Web framework.

Compile on CLI from root folder:

    `$ grunt clean`

To install dev dependencies from NPM:

    `$ npm install`

## Current Version - 8.0.0-alpha.8

A planned feature has been implemented with the remote manager. You can now specify CRUD plus readAll methods for a given remote module using an object that specifies the url for each method. You can still use the old syntax if you prefer, and you can use the old syntax for additional methods in the module.

When you call remote.invoke(module.method, obj), the obj object should be either a plain object that can be cast as an Entity of the type for the module, or an Entity already cast. You can use this syntax with Services, so you can call bookmarkService.create(obj) with this syntax.

Note that this is still an alpha release, though the next release should be a beta or ga and the API is not expected to change now, barring some unforeseen changes.

See the release notes for more details.

## Installation

`$ npm install altseven`


You only need to install dependencies from npm to work on the altseven framework, or for optional modules:

gadget-ui can be used for the FloatingPane as a container for the debugging console.

    $ npm install altseven

Handlebars can be used as the templating engine.

    $ npm install handlebars

modlazy can be used as a module/dependency loader if you use Handlebars or Mustache for rendering

    $ npm install modlazy

## Documentation

Documentation for 7.3.0 is available at:

https://altseven.shoestringlab.com

8.0.x documentation is under development.

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
