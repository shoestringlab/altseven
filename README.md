# 8.0.0-alpha.2

v 7.5.3

A JavaScript framework. Originally built as an exploration into reactive programming with JavaScript. Now a full-fledged Web framework.


Compile on CLI from root folder:

    `$ grunt clean`

To install dev dependencies from NPM:

    `$ npm install`

## Current Version - 8.0.0-alpha.2

8.0.x represents the formalization of the ES6 class components and the new features of the DataProvider, Entity, and Service, as well as the modules that support them. Notable in this release are significant updates to the View component as well. In particular, the setState method now only updates the keys of the object passed to it and does not replace the previous state in its entirety. This release should be relatively stable, but there may be changes as these features are still under active development, hence the -alpha.1 release.

In general, existing applications should be compatible with this release. However, there may be some changes to the API that may require updates to your code. If you experience issues with this release running an existing application, look through the release notes. In particular, check the changes around the security module and token use if you are using the built-in securicty mechanism.

One significant change required to existing apps is to convert the calls to the Constructor component in Views to use the new ES6 View class.

``` javascript
const message = new a7.components.View(props);
```

## Installation

Note that the library is no longer published on Bower, so pull from npm.

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
