<!doctype html>
<html>
	<head>
	<title>A7</title>
	<script src="/bower_components/modlazy/dist/modlazy.min.js"></script>
	<script>
		modlazy.load( [ "/test/app.components.js  < /test/app.remote.js < /test/app.main.js < /test/app.events.js < /dist/a7.js < /bower_components/gadget-ui/dist/gadget-ui.js < /bower_components/velocity/velocity.js",
		"/bower_components/mustache.js/mustache.js", "/test/styles.css", "/dist/a7.css", "/bower_components/gadget-ui/gadget-ui.css", "/bower_components/open-iconic/font/css/open-iconic.css" ], function(){

			var options = {
				auth: {
					// sessionTimeout: ( 60 * 15 * 1000 ) // default time in milliseconds to refresh system auth
				},
				console: {
					enabled: true,
					wsServer: 'ws://www.altseven.home:8000',
					top: 10,
					right: 10
				},
				logging : {
					logLevel: "INFO,ERROR,FATAL,TRACE"
				},
				remote: {
					modules: app.remote,
					loginURL : "/test/auth.cfc?method=login",
					refreshURL : "/test/auth.cfc?method=refresh",
					useTokens: true // defaults to true for the auth system
				},
				ui : {
					// renderer: // renderer is implicitly set by existence of the templating library, currently Mustache or Handlebars
					templates: "/test/templates.html"
				}
			};

			var p = new Promise( function( resolve, reject ){
				a7.init( options, resolve, reject );
			});

			p.then( function( state ){
				app.main.init( state );
			});

			p['catch']( function( message ){
				console.log( "Something went wrong." );
			});
		});

	</script>
	</head>
	<body>
	<div>

	<h1>
	alt-7 Test Page
	</h1>
	</div>

	<div name="main">
		<div name="anon" style="display:none;">

		</div>
		<div name="secure" style="display:none;">
			<div name="header">

			</div>
			<div name="app">

			</div>
		</div>
	</div>


	</body>
</html>
