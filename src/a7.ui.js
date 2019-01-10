a7.ui = (function() {
  "use strict";

  const resourceEvents = [
    'cached',
    'error',
    'abort',
    'load',
    'beforeunload'
  ];

  const networkEvents = [
    'online',
    'offline'
  ];

  const focusEvents = [
    'focus',
    'blur'
  ];

  const websocketEvents = [
    'open',
    'message',
    'error',
    'close'
  ];

  const sessionHistoryEvents = [
    'pagehide',
    'pageshow',
    'popstate'
  ];

  const cssAnimationEvents = [
    'animationstart',
    'animationend',
    'animationiteration'
  ];

  const cssTransitionEvents = [
    'transitionstart',
    'transitioncancel',
    'transitionend',
    'transitionrun'
  ];

  const formEvents = [
    'reset',
    'submit'
  ];

  const printingEvents = [
    'beforeprint',
    'afterprint'
  ];

  const textCompositionEvents = [
    'compositionstart',
    'compositionupdate',
    'compositionend'
  ];

  const viewEvents = [
    'fullscreenchange',
    'fullscreenerror',
    'resize',
    'scroll'
  ];

  const clipboardEvents = [
    'cut',
    'copy',
    'paste'
  ];

  const keyboardEvents = [
    'keydown',
    'keypress',
    'keyup'
  ];

  const mouseEvents = [
    'auxclick',
    'click',
    'contextmenu',
    'dblclick',
    'mousedown',
    'mousenter',
    'mouseleave',
    'mousemove',
    'mouseover',
    'mouseout',
    'mouseup',
    'pointerlockchange',
    'pointerlockerror',
    'wheel'
  ];

  const dragEvents = [
    'drag',
    'dragend',
    'dragstart',
    'dragleave',
    'dragover',
    'drop'
  ];

  const mediaEvents = [
    'audioprocess',
    'canplay',
    'canplaythrough',
    'complete',
    'durationchange',
    'emptied',
    'ended',
    'loadeddata',
    'loadedmetadata',
    'pause',
    'play',
    'playing',
    'ratechange',
    'seeked',
    'seeking',
    'stalled',
    'suspend',
    'timeupdate',
    'columechange',
    'waiting'
  ];

  const progressEvents = [
    // duplicates from resource events
    /* 'abort',
    'error',
    'load', */
    'loadend',
    'loadstart',
    'progress',
    'timeout'
  ];

  const storageEvents = [
    'change',
    'storage'
  ];

  const updateEvents = [
    'checking',
    'downloading',
    /* 'error', */
    'noupdate',
    'obsolete',
    'updateready'
  ];

  const valueChangeEvents = [
    'broadcast',
    'CheckBoxStateChange',
    'hashchange',
    'input',
    'RadioStateChange',
    'readystatechange',
    'ValueChange'
  ];

  const uncategorizedEvents = [
    'invalid',
    'localized',
    /* 'message',
    'open', */
    'show'
  ];

  const _standardEvents = resourceEvents.concat( networkEvents ).concat( focusEvents ).concat( websocketEvents ).concat( sessionHistoryEvents ).concat( cssAnimationEvents )
            .concat( cssTransitionEvents ).concat( formEvents ).concat( printingEvents ).concat( textCompositionEvents ).concat( viewEvents ).concat( clipboardEvents )
            .concat( keyboardEvents ).concat( mouseEvents ).concat( dragEvents ).concat( mediaEvents ).concat( progressEvents ).concat( storageEvents )
            .concat( updateEvents ).concat( valueChangeEvents ).concat( uncategorizedEvents );

  var
    _events = [],
    _options = {},
    _selectors = {},
    //_templateMap = {},
    _views = [],
    _setSelector = function(name, selector) {
      _selectors[name] = selector;
    },
    _getSelector = function(name){
      return _selectors[name];
    },
    _setView = function( id, view, selector ){
      switch( _options.renderer ){
        case "Handlebars":
        case "Mustache":
        case "templateLiterals":
          _views[ id ] = { view: view,
            selector: selector,
            render: function(){
              selector.innerHTML = view.render();

              var eventArr = [];
              _events.forEach( function( eve ){
                eventArr.push("[data-on" + eve + "]");
              });
              var eles = selector.querySelectorAll( eventArr.toString() );

              eles.forEach( function( sel ){
                for( var ix=0; ix < sel.attributes.length; ix++ ){
                  var attribute = sel.attributes[ix];
                  if( attribute.name.startsWith( "data-on" ) ){
                    var event = attribute.name.substring( 7, attribute.name.length );
                    sel.addEventListener( event, view.eventHandlers[ sel.attributes["data-on" + event].value ] );
                  }
                }
              });
            }
          };

          // call the ui render() function when called to render
          _views[ id ].view.on( "mustRender", function(){
            _views[ id ].render();
          });

          _views[ id ].view.fireEvent( "mustRender" );
          break;
      }
    },
    _getView = function( id ){
      return _views[ id ];
    },
    _removeView = function( id ){
      delete _views[ id ];
    };
    /* _addTemplate = function(key, html) {
      switch (_options.renderer) {
        case "Mustache":
          _templateMap[key] = html.trim();
          break;
         case "Handlebars":
          _templateMap[key] = Handlebars.compile(html.trim());
          break;
      }
    },
    _loadTemplates = function( resolve, reject ) {
      var ot = Math.ceil(Math.random() * 500);

      try{
        switch (_options.renderer) {
          case "Mustache":
           case "Handlebars":
            fetch(_options.templates + "?" + ot)
              .then(function(response) {
                return response.text();
              })
              .then(function(text) {
                a7.log.info("Loading " + _options.renderer + " templates... ");
                var parser = new DOMParser(),
                  doc = parser.parseFromString(text, "text/html"),
                  scripts = doc.querySelectorAll("script");
                scripts.forEach(function(script) {
                  _addTemplate(script.getAttribute("id"), script.innerHTML);
                });
                resolve();
              });
            break;
          case "templateLiterals":
          // nothing to do
          break;
        }
      }
      catch( error ){
        reject( error );
      }
    },
    _render = function(template, params, partials) {
      switch (_options.renderer) {
        case "Mustache":
          //return Mustache.to_html( _templateMap[ template ], params, _templateMap );
          return Mustache.render(_templateMap[template], params, partials);
         case "Handlebars":
          return _templateMap[template](params);
      }
    }; */

  return {
    //render: _render,
    selectors: _selectors,
    getSelector: _getSelector,
    setSelector: _setSelector,
    setView: _setView,
    getView: _getView,
    removeView: _removeView,
    views: _views,
/*     getTemplate: function(template) {
      return _templateMap[template];
    }, */

    init: function(resolve, reject) {
      //var renderers = "Mustache,Handlebars"; //templateLiterals not a choice here
      a7.log.info("Layout initializing...");
      _options = a7.model.get("a7.ui");

      // set event groups to create listeners for
      var eventGroups = ( _options.eventGroups ? _options.eventGroups : 'standard' );
      switch( eventGroups ){
        case "extended":
          //not implemented yet
        case "standard":
          _events = _standardEvents;
          break;
        default:
          _options.eventGroups.forEach( function( group ){
            _events = _events.concat( (group) );
          });
      }

      resolve();
/*
      if (renderers.indexOf(_options.renderer) >= 0) {
        a7.model.set("a7.ui.templatesLoaded", false );
        if (_options.templates !== undefined) {
          _loadTemplates(resolve, reject);
        }
      } else {
        resolve();
      } */
    }
  };
})();
