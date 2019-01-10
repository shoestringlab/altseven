altseven
=========

v 2.0.0

A JavaScript framework. Built as an academic exercise. May one day be suitable for use in production systems, but that day is not today. You have been warned.


Compile on CLI from root folder:

    $ grunt clean

To install dev dependencies from NPM:

    $ npm install


***Changes***
--------

As of v 2.0.0, there are no required external dependencies for deployment. The gadget-ui model has been pulled into altseven as a component as the default model.

You only need to install dependencies from npm to work on the altseven framework, or for optional modules:

gadget-ui can be used for the FloatingPane as a container for the debugging console.

    $ npm install gadget-ui

Handlebars can be used as the templating engine.

    $ npm install handlebars

modlazy can be used as a module/dependency loader if you use Handlebars or Mustache for rendering

    $ npm install modlazy


As of v 1.2.0, you do not need to install dependencies from Bower unless you wish to use Mustache for templating.

    $ bower install mustache.js


***Running the Sample App***

To run the example application included in the /test folder, you need a CFML engine. The easiest way to run it is to install CommandBox:

https://www.ortussolutions.com/products/commandbox

If you are running Linux, you can follow directions on my blog for installing CommandBox:

https://robertmunn.com/blog/installing-commandbox-on-ubuntu-1804-to-manage-cfml-based-web-app-development


If you prefer to see altseven in action with a NodeJS backend, you can clone the git repo for tasklist:

    $ git clone https://github.com/robertdmunn/tasklist

Check the homepage/README for tasklist for directions on running it.
