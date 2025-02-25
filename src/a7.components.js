a7.components = ( function() {"use strict";function Constructor( constructor, args, addBindings ) {
	var returnedObj,
		obj;

	// add bindings for custom events
	// this section pulls the bindings ( on, off, fireEvent ) from the
	// EventBindings object and add them to the object being instantiated
	if( addBindings === true ){
		//bindings = EventBindings.getAll();
 		EventBindings.getAll().forEach( function( binding ){
			if( constructor.prototype[ binding ] === undefined ) {
				constructor.prototype[ binding.name ] = binding.func;
			}
		});
	}

	// construct the object
	obj = Object.create( constructor.prototype );

	// this section adds any events specified in the prototype as events of
	// the object being instantiated
	// you can then trigger an event from the object by calling:
	// <object>.fireEvent( eventName, args );
	// args can be anything you want to send with the event
	// you can then listen for these events using .on( eventName, function(){});
	// <object>.on( eventName, function(){ })
	if( addBindings === true ){
		// create specified event list from prototype
		obj.events = {};
		if( constructor.prototype.events !== undefined ){
			constructor.prototype.events.forEach( function( event ){
				obj.events[ event ] = [ ];
			});
		}
	}

	returnedObj = constructor.apply( obj, args );
	if( returnedObj === undefined ){
		returnedObj = obj;
	}
	//returnedObj.prototype = constructor.prototype;
	return returnedObj;

}

/*
 * EventBindings
 * author: Robert Munn <robert.d.munn@gmail.com>
 *
 */

var EventBindings = {
	on: function (event, func) {
		if (this.events[event] === undefined) {
			this.events[event] = []
		}
		this.events[event].push(func)
		return this
	},

	off: function (event) {
		// clear listeners
		this.events[event] = []
		return this
	},

	fireEvent: function (key, args) {
		var _this = this
		if (this.events[key] !== undefined) {
			this.events[key].forEach(function (func) {
				func(_this, args)
			})
		}
	},

	getAll: function () {
		return [
			{ name: 'on', func: this.on },
			{ name: 'off', func: this.off },
			{ name: 'fireEvent', func: this.fireEvent },
		]
	},
}

const Model = (() => {
	'use strict'

	const modelStore = new Map()
	const mementoStore = new Map()
	let maxMementos = 20 // Default value

	class BindableObject {
		constructor(data, element) {
			this.data = this.processValue(data)
			this.elements = []
			this.mementos = []
			this.currentMementoIndex = -1
			if (element) {
				this.bind(element)
			}
			this.saveMemento() // Save initial state
		}

		handleEvent(event) {
			if (event.type !== 'change') return

			event.originalSource ??= 'BindableObject.handleEvent[change]'

			for (const { elem, prop } of this.elements) {
				if (
					event.target.name === prop &&
					event.originalSource !== 'BindableObject.updateDomElement'
				) {
					const value = event.target.type.includes('select')
						? {
								id: event.target.value,
								text: event.target.options[
									event.target.selectedIndex
								].textContent,
							}
						: event.target.value

					this.change(value, event, prop)
				}
			}
		}

		change(value, event, property) {
			event.originalSource ??= 'BindableObject.change'
			console.log(`change : Source: ${event.originalSource}`)

			const processedValue = this.processValue(value)

			if (!property) {
				this.data = processedValue
			} else if (typeof this.data === 'object' && this.data !== null) {
				if (!(property in this.data)) {
					throw new Error(
						`Property '${property}' of object is undefined.`
					)
				}
				this.data[property] = processedValue
			} else {
				throw new Error(
					'Attempt to treat a simple value as an object with properties.'
				)
			}

			this.saveMemento()

			this.elements
				.filter(
					({ prop, elem }) =>
						(!property || property === prop) &&
						elem !== event.target
				)
				.forEach(({ elem }) =>
					this.updateDomElement(event, elem, processedValue)
				)
		}

		updateDom(event, value, property) {
			event.originalSource ??= 'BindableObject.updateDom'

			this.elements.forEach(({ elem, prop }) => {
				if (!property) {
					if (typeof value === 'object' && value !== null) {
						if (prop in value) {
							this.updateDomElement(event, elem, value[prop])
						}
					} else {
						this.updateDomElement(event, elem, value)
					}
				} else if (prop === property) {
					this.updateDomElement(event, elem, value)
				}
			})
		}

		updateDomElement(event, element, value) {
			event.originalSource ??= 'BindableObject.updateDomElement'

			const updateOptions = () => {
				element.innerHTML = ''
				const items = Array.isArray(value)
					? value
					: value instanceof Map
						? Array.from(value.entries())
						: [value]

				if (element.tagName === 'SELECT') {
					items.forEach((item, idx) => {
						const opt = document.createElement('option')
						opt.value =
							typeof item === 'object'
								? (item.id ?? item[0])
								: item
						opt.textContent =
							typeof item === 'object'
								? (item.text ?? item[1])
								: item
						element.appendChild(opt)
					})
				} else if (['UL', 'OL'].includes(element.tagName)) {
					items.forEach((item) => {
						const li = document.createElement('li')
						li.textContent =
							typeof item === 'object'
								? (item.text ?? item[1])
								: item
						element.appendChild(li)
					})
				}
			}

			const isInput = ['INPUT', 'TEXTAREA'].includes(element.tagName)
			const isArrayElement = ['OL', 'UL', 'SELECT'].includes(
				element.tagName
			)
			const textElements = [
				'DIV', // Generic container, often contains text
				'SPAN', // Inline container, typically for text styling
				'H1', // Heading level 1
				'H2', // Heading level 2
				'H3', // Heading level 3
				'H4', // Heading level 4
				'H5', // Heading level 5
				'H6', // Heading level 6
				'P', // Paragraph
				'LABEL', // Caption for form elements, displays text
				'BUTTON', // Clickable button, often with text content
				'A', // Anchor (hyperlink), typically contains text
				'STRONG', // Bold text for emphasis
				'EM', // Italic text for emphasis
				'B', // Bold text (presentational)
				'I', // Italic text (presentational)
				'U', // Underlined text
				'SMALL', // Smaller text, often for fine print
				'SUB', // Subscript text
				'SUP', // Superscript text
				'Q', // Short inline quotation
				'BLOCKQUOTE', // Long quotation
				'CITE', // Citation or reference
				'CODE', // Code snippet
				'PRE', // Preformatted text
				'ABBR', // Abbreviation with optional title attribute
				'DFN', // Defining instance of a term
				'SAMP', // Sample output from a program
				'KBD', // Keyboard input
				'VAR', // Variable in programming/math context
				'LI', // List item (in UL or OL)
				'DT', // Term in a description list
				'DD', // Description in a description list
				'TH', // Table header cell
				'TD', // Table data cell
				'CAPTION', // Table caption
				'FIGCAPTION', // Caption for a figure
				'SUMMARY', // Summary for a details element
				'LEGEND', // Caption for a fieldset in a form
				'TITLE', // Document title (displayed in browser tab)
			]
			const isTextElement = textElements.includes(element.tagName)

			if (typeof value === 'object' && value !== null) {
				if (isInput)
					element.value =
						value.id ?? (value instanceof Map ? '' : value[0]) ?? ''
				else if (isArrayElement) updateOptions()
				else if (isTextElement)
					element.textContent =
						value.text ??
						(value instanceof Map ? '' : value[1]) ??
						''
			} else {
				if (isInput) element.value = value ?? ''
				else if (isArrayElement) updateOptions()
				else if (isTextElement) element.textContent = value ?? ''
			}

			if (
				event.originalSource !== 'model.set' &&
				event.originalSource !== 'memento.restore'
			) {
				element.dispatchEvent(
					new Event('change', {
						originalSource: 'model.updateDomElement',
					})
				)
			}
		}

		bind(element, property) {
			const binding = { elem: element, prop: property || '' }
			element.value = property ? this.data[property] : this.data

			element.addEventListener('change', this)
			this.elements.push(binding)
		}

		processValue(value) {
			switch (typeof value) {
				case 'undefined':
				case 'number':
				case 'boolean':
				case 'function':
				case 'symbol':
				case 'string':
					return value
				case 'object':
					if (value === null) return null
					if (value instanceof Map) return new Map(value)
					return JSON.parse(JSON.stringify(value))
				default:
					return value
			}
		}

		saveMemento() {
			// Remove future mementos if we're adding after an undo
			if (this.currentMementoIndex < this.mementos.length - 1) {
				this.mementos.splice(this.currentMementoIndex + 1)
			}

			const memento = this.processValue(this.data)
			this.mementos.push(memento)

			if (this.mementos.length > maxMementos) {
				this.mementos.shift() // Remove oldest memento
			} else {
				this.currentMementoIndex++
			}
		}

		undo() {
			if (this.currentMementoIndex > 0) {
				this.currentMementoIndex--
				this.restoreMemento()
				return true
			}
			return false
		}

		redo() {
			if (this.currentMementoIndex < this.mementos.length - 1) {
				this.currentMementoIndex++
				this.restoreMemento()
				return true
			}
			return false
		}

		rewind() {
			if (this.currentMementoIndex > 0) {
				this.currentMementoIndex = 0
				this.restoreMemento()
				return true
			}
			return false
		}

		fastForward() {
			if (this.currentMementoIndex < this.mementos.length - 1) {
				this.currentMementoIndex = this.mementos.length - 1
				this.restoreMemento()
				return true
			}
			return false
		}

		restoreMemento() {
			this.data = this.processValue(
				this.mementos[this.currentMementoIndex]
			)
			const event = { originalSource: 'memento.restore' }
			this.elements.forEach(({ elem, prop }) => {
				this.updateDomElement(
					event,
					elem,
					prop ? this.data[prop] : this.data
				)
			})
		}
	}

	return {
		BindableObject,

		init(options = {}) {
			maxMementos = options.maxMementos ?? 20
		},

		create(name, value, element) {
			const processedValue = new BindableObject(value).processValue(value)
			const bindable = new BindableObject(processedValue, element)
			modelStore.set(name, bindable)
			mementoStore.set(name, bindable)
		},

		destroy(name) {
			modelStore.delete(name)
			mementoStore.delete(name)
		},

		bind(name, element) {
			const [base, prop] = name.split('.')
			const model = modelStore.get(base)
			if (model) {
				model.bind(element, prop)
			}
		},

		exists(name) {
			return modelStore.has(name)
		},

		get(name) {
			if (!name) {
				console.log('Expected parameter [name] is not defined.')
				return undefined
			}

			const [base, prop] = name.split('.')
			const model = modelStore.get(base)

			if (!model) {
				console.log(`Key '${base}' does not exist in the model.`)
				return undefined
			}

			const value = prop ? model.data[prop] : model.data
			return value instanceof Map ? new Map(value) : value
		},

		set(name, value) {
			if (!name) {
				console.log('Expected parameter [name] is not defined.')
				return
			}

			const [base, prop] = name.split('.')
			const event = { originalSource: 'model.set' }

			if (!modelStore.has(base)) {
				if (!prop) {
					this.create(base, value)
				} else {
					throw new Error(`Object ${base} is not yet initialized.`)
				}
			} else {
				const model = modelStore.get(base)
				const processedValue = model.processValue(value)
				model.change(processedValue, event, prop)
				model.updateDom(event, processedValue, prop)
			}
		},

		undo(name) {
			const model = mementoStore.get(name)
			return model ? model.undo() : false
		},

		redo(name) {
			const model = mementoStore.get(name)
			return model ? model.redo() : false
		},

		rewind(name) {
			const model = mementoStore.get(name)
			return model ? model.rewind() : false
		},

		fastForward(name) {
			const model = mementoStore.get(name)
			return model ? model.fastForward() : false
		},
	}
})()

/*
// Initialize with custom memento limit
model.init({ maxMementos: 50 });

// Create a model
model.create("user", { name: "John" });

// Make changes
model.set("user.name", "Jane");
model.set("user.name", "Bob");

// Undo/redo
model.undo("user"); // Returns to "Jane"
model.undo("user"); // Returns to "John"
model.redo("user"); // Returns to "Jane"

// Rewind/fast forward
model.rewind("user"); // Back to "John"
model.fastForward("user"); // To "Bob"

*/

function User(args){
	// init User
	// if you pass an args structure into the function, the elements of args will be added to the User object
	
	Object.assign( this, args );
	return this;
}

User.prototype.getMemento = function(){
	var user = {}, self = this;
	Object.keys( this ).forEach( function( key ){
		user[ key ] = self[ key ];
	});
	return user;
};

function View(props) {
	this.renderer = a7.model.get('a7').ui.renderer
	this.type = 'View'
	this.timeout
	this.timer
	this.element // html element the view renders into
	this.props = props
	this.isTransient = props.isTransient || false
	this.state = {}
	this.skipRender = false
	this.children = {} // child views
	this.components = {} // register objects external to the framework so we can address them later
	this.config()
	this.fireEvent('mustRegister')
}

View.prototype = {
	config: function () {
		this.on(
			'mustRegister',
			function () {
				a7.log.trace('mustRegister: ' + this.props.id)
				a7.ui.register(this)
				if (a7.ui.getView(this.props.parentID)) {
					a7.ui.getView(this.props.parentID).addChild(this)
				}
			}.bind(this)
		)

		// mustRender is a debounced function so we can control how often views should re-render.
		// debounce leading, so the render will be queued and subsequent requests to render will be ignored until the delay time is reached
		// delay defaults to 18 ms, can be set in app options as ui.debounceTime
		this.on(
			'mustRender',
			a7.util.debounce(
				function () {
					a7.log.trace('mustRender: ' + this.props.id)
					if (this.shouldRender()) {
						a7.ui.enqueueForRender(this.props.id)
					} else {
						a7.log.trace('Render cancelled: ' + this.props.id)
						// undo skip, it must be explicitly set each time
						this.skipRender = false
					}
				}.bind(this)
			),
			a7.model.get('a7').ui.debounceTime,
			true
		)

		this.on(
			'rendered',
			function () {
				if (this.isTransient) {
					// set the timeout
					if (this.timer !== undefined) {
						clearTimeout(this.timer)
					}
					this.timer = setTimeout(
						this.checkRenderStatus.bind(this),
						a7.model.get('a7').ui.timeout
					)
				}
				this.onRendered()
			}.bind(this)
		)

		this.on(
			'registered',
			function () {
				if (this.props.parentID === undefined || this.mustRender) {
					// only fire render event for root views, children will render in the chain
					this.fireEvent('mustRender')
				}
			}.bind(this)
		)

		this.on(
			'mustUnregister',
			function () {
				a7.ui.unregister(this.props.id)
			}.bind(this)
		)
	},
	events: [
		'mustRender',
		'rendered',
		'mustRegister',
		'registered',
		'mustUnregister',
	],
	setState: function (args) {
		this.state = Object.assign(args)
		// setting state requires a re-render
		this.fireEvent('mustRender')
	},
	getState: function () {
		return Object.assign(this.state)
	},
	addChild: function (view) {
		this.children[view.props.id] = view
		// force a render for children added
		//this.children[ view.props.id ].mustRender = true;
	},
	removeChild: function (view) {
		delete this.children[view.props.id]
	},
	clearChildren: function () {
		this.children = {}
	},
	getParent: function () {
		return this.props.parentID
			? a7.ui.getView(this.props.parentID)
			: undefined
	},
	render: function () {
		a7.log.info('render: ' + this.props.id)
		if (this.element === undefined || this.element === null) {
			this.element = document.querySelector(this.props.selector)
		}
		if (!this.element) {
			a7.log.error(
				'The DOM element for view ' +
					this.props.id +
					' was not found. The view will be removed and unregistered.'
			)
			// if the component has a parent, remove the component from the parent's children
			if (this.props.parentID !== undefined) {
				a7.ui.getView(this.props.parentID).removeChild(this)
			}
			// if the selector isn't in the DOM, skip rendering and unregister the view
			this.fireEvent('mustUnregister')
			return
		}
		//throw( "You must define a selector for the view." );
		this.element.innerHTML =
			typeof this.template == 'function' ? this.template() : this.template

		// create events marked with data-on* in the template
		var eventArr = []
		a7.ui.getEvents().forEach(function (eve) {
			eventArr.push('[data-on' + eve + ']')
		})
		var eles = this.element.querySelectorAll(eventArr.toString())

		eles.forEach(
			function (sel) {
				for (var ix = 0; ix < sel.attributes.length; ix++) {
					var attribute = sel.attributes[ix]
					if (attribute.name.startsWith('data-on')) {
						var event = attribute.name.substring(
							7,
							attribute.name.length
						)
						sel.addEventListener(
							event,
							this.eventHandlers[
								sel.attributes['data-on' + event].value
							]
						)
					}
				}
			}.bind(this)
		)
		// bind any elements marked with data-bind to the model
		let boundEles = this.element.querySelectorAll('[data-bind]')
		boundEles.forEach(function (ele) {
			console.log('binding: ', ele)
			a7.model.bind(ele.attributes['data-bind'].value, ele)
		})
		this.fireEvent('rendered')
	},
	shouldRender: function () {
		if (this.skipRender) {
			return false
		} else {
			return true
		}
	},
	// after rendering, render all the children of the view
	onRendered: function () {
		for (var child in this.children) {
			this.children[child].element = document.querySelector(
				this.children[child].props.selector
			)
			this.children[child].render()
		}
	},
	// need to add props.isTransient (default false) to make views permanent by default
	checkRenderStatus: function () {
		if (document.querySelector(this.props.selector) === null) {
			a7.ui.unregister(this.id)
		} else {
			if (this.isTransient) {
				this.timer = setTimeout(
					this.checkRenderStatus.bind(this),
					a7.model.get('a7').ui.timeout
				)
			}
		}
	},
}

return {
  Constructor: Constructor,
  EventBindings: EventBindings,
  Model: Model,
  User: User,
  View: View
};
}());
//# sourceMappingURL=a7.components.js.map