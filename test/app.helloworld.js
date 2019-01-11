import {a7} from '/dist/a7.min.js';

var app = {
  main: (function() {
    "use strict";

    return {
      init: function(state) {
        // cache initial selector
        a7.ui.setSelector('main', document.querySelector("div[name='main']"));
        a7.ui.setView('main', app.components.HelloWorld( [] ), a7.ui.selectors['main']);
      }
    };
  })(),

  components: (function() {

    function HelloWorld(props) {
      var helloworld = a7.components.Constructor(a7.components.View, [props], true);

      helloworld.state = {
        text: 'Hello World!',
        label: 'Spanish'
      };

			helloworld.eventHandlers = {
				changeLanguage: function(){
					helloworld.setState( {  text: ( helloworld.state.text === 'Hello World!' ? '¡Hola Mundo!' : 'Hello World!' ),
                                  label: ( helloworld.state.label === 'Spanish' ? 'Inglés' : 'Spanish' ) } );
				}
			};

      helloworld.render = function(){
				return `${helloworld.state.text}
        <a name="changeLanguage" data-onclick="changeLanguage">[ ${helloworld.state.label} ]</a>`;
			};

      return helloworld;
    }

    return {
      HelloWorld: HelloWorld
    };

  })()
};

export var application = function init() {

  var p = new Promise(function(resolve, reject) {
    a7.init( {}, resolve, reject);
  });
  p.then(function(state) {
    app.main.init(state);
    a7.log.info("App init.");
  });
  p['catch'](function(message) {
    console.log(message);
  });

  return app;
};
