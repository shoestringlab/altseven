## altseven

v 8.1.0

A JavaScript framework. Originally built as an exploration into reactive programming with JavaScript. Now a full-fledged Web framework.

Compile on CLI from root folder:

    `$ grunt clean`

To install dev dependencies from NPM:

    `$ npm install`

## Current Version - 8.1.0

This release includes a new option in the remote module to include credentials for SAML SSO authentication, and a patch to fix the security module option for default parameters for Users. There is also an  internal change to options.router.useEvents as an option. This change does not require modification of existing applications. 


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
