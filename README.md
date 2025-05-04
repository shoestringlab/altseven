# altseven

v 7.4.1

A JavaScript framework. Originally built as an exploration into reactive programming with JavaScript. Now a full-fledged Web framework.


Compile on CLI from root folder:

    `$ grunt clean`

To install dev dependencies from NPM:

    `$ npm install`


Current Release - 7.4.0
--------

This release adds a config option to disable the security module. By default, the security module remains enabled, but if you add  options: { security: { enabled: false} }, you will prevent the security module from being initialized on startup. Note that disabling the security module will prevent you from using the remote module with tokens. This feature is in development so be aware if you disable security that the remote module may be affected beyond the loss of tokens.

In addition, the security module has seen some internal changes. The isAuthenticated method has been simplified to call the auth.refresh event, so it assumes tokens are active in use. Also, it has added setUser(user) and getUser() methods. setUser set the users into session storage and, if a model is in use, sets the user into the model. GetUser gets the current user, and if no use is active, returns an empty User object.

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
