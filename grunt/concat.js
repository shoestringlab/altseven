module.exports = {
  css: {
    options: {
      sourceMap: true
    },
    src: "src/css/*.css",
    dest: "dist/a7.css"
  },
  components: {
    options: {
      sourceMap: true,
      banner: 'a7.components = ( function() {"use strict";',
      footer: "}());"
    },
    src: [
      "src/components/util/constructor.js",
      "src/components/util/eventbindings.js",
      "src/components/user.js",
      "src/components/components.js"
    ],
    dest: "src/a7.components.js"
  },

  a7: {
    options: {
      sourceMap: true
    },
    src: [
      "src/a7.js",
      "src/a7.console.js",
      "src/a7.error.js",
      "src/a7.events.js",
      "src/a7.log.js",
      "src/a7.model.js",
      "src/a7.components.js",
      "src/a7.remote.js",
      "src/a7.security.js",
      "src/a7.ui.js",
      "src/a7.util.js"
    ],
    dest: "dist/a7.js"
  }
};
