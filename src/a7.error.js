a7.error = (function() {
  "use strict";

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

      a7.log.error(message);
    }
  };

  window.onerror = function(msg, url, lineNo, columnNo, error) {
    a7.error.captureError(msg, url, lineNo, columnNo, error);
    return false;
  };

  return {
    capture: function() {},
    captureError: _captureError
  };
})();
