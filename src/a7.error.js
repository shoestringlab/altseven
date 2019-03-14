a7.error = (function() {
  "use strict";

  // add event bindings so devs can listen for window script errors
  var _bindings = {};

  var events = { scriptError : [] };

  var _captureError = function(msg, url, lineNo, columnNo, error) {
    var string = msg.toLowerCase();
    var substring = "script error";
    if (string.indexOf(substring) > -1) {
      a7.log.error("Script Error: See Browser Console for Detail");
    } else {
      var message = [
        "Message: " + msg,
        "URL: " + url,
        "Line: " + lineNo,
        "Column: " + columnNo,
        "Error object: " + JSON.stringify(error)
      ].join(" - ");

      a7.error.fireEvent( "scriptError", [msg, url, lineNo, columnNo, error] );
      a7.log.error(message);
    }
  };

  window.onerror = function(msg, url, lineNo, columnNo, error) {
    a7.error.captureError(msg, url, lineNo, columnNo, error);
    return false;
  };

  return {
    events: events,
    capture: function() {},
    captureError: _captureError,
    init: function(){
      a7.components.EventBindings.getAll().forEach( function( binding ){
        if( _bindings[ binding ] === undefined ) {
          _bindings[ binding.name ] = binding.func;
        }
        a7.error.on = _bindings.on;
        a7.error.off = _bindings.off;
        a7.error.fireEvent = _bindings.fireEvent;
      });
    }
  };
})();
