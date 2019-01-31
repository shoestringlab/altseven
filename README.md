altseven
=========

v 3.2.1

A JavaScript framework. Built as an academic exercise.


Compile on CLI from root folder:

    $ grunt clean

To install dev dependencies from NPM:

    $ npm install


***Changes***
--------

As of v 3.2.0, the altseven model has been modified to suit the needs of the framework. Binding code has been stripped from it, get and set have been modified to deep copy objects so no variables are shared outside the model, a history stack and functions to operate on it have been added to enable framework undo and redo functionality to be added later.

As of 3.1.0, altseven contains a rendering queue that manages the rendering pipeline for views. It also contains a deferred pipeline that fills once the existing queue starts rendering and becomes the new queue once the existing queue renders.

As of v 3.0.0, the framework is complete enough to build applications that can set state and update views dynamically, work with remote services, and use the built in security framework.

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
