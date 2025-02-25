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
