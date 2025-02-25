a7.console = (function () {
	'use strict'

	var title = 'Console Window',
		// the div we'll create to host the console content
		consoleDiv,
		// flag whether console is running
		active = false,
		_addMessage = function (message, dt, source, level) {
			var div = document.createElement('div')
			div.setAttribute('class', 'a7-console-row-' + source)
			if (level !== undefined) {
				div.innerHTML = level + ': '
				div.setAttribute(
					'class',
					div.getAttribute('class') + ' a7-console-row-' + level
				)
			}
			div.innerHTML +=
				+(dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) +
				':' +
				(dt.getMinutes() < 10
					? '0' + dt.getMinutes()
					: dt.getMinutes()) +
				': ' +
				message
			consoleDiv.appendChild(div)
		}

	var _handleMessage = function (message, json) {
		var ix = 0
		if (json.type === 'history') {
			// entire message
			// history
			// insert every single message to the chat window
			for (ix = 0; ix < json.data.length; ix++) {
				_addMessage(
					json.data[ix].text,
					new Date(json.data[ix].time),
					'websocket'
				)
			}
		} else if (json.type === 'message') {
			// it's a single
			// message
			_addMessage(json.data.text, new Date(json.data.time), 'websocket')
		} else {
			a7.log.error("This doesn't look like valid JSON: ", json)
		}
	}

	return {
		init: function (options, resolve, reject) {
			var console = options.console
			if (console.container === '')
				reject(
					'You must specify a container object for the console display.'
				)

			// check for console state
			if (console.enabled) {
				active = true
				consoleDiv = document.createElement('div')
				consoleDiv.setAttribute('id', 'a7consoleDiv')
				consoleDiv.setAttribute('class', 'a7-console')
				document.body.append(consoleDiv)

				var fp = a7.components.Constructor(
					console.container,
					[
						consoleDiv,
						{
							width: console.width,
							left: console.left,
							height: console.height,
							title: title,
							top: console.top,
							enableShrink: true,
							enableClose: true,
						},
					],
					false
				)
				if (fp.element) fp.element.setAttribute('right', 0)

				if (console.wsServer) {
					var connection = a7.remote.webSocket(
						console.wsServer,
						_handleMessage
					)
				}

				a7.console.addMessage = _addMessage
				a7.log.info('Console initializing...')
				resolve()
			} else {
				// console init should not run if console is set to false
				reject(
					'Console init should not be called when console option is set to false.'
				)
			}
		},
	}
})()
