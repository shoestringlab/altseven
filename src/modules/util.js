export class Util {
	// split by commas, used below
	split(val) {
		return val.split(/,\s*/);
	}

	// return the last item from a comma-separated list
	extractLast(term) {
		return this.split(term).pop();
	}

	// encode and decode base64
	base64 = {
		keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		encode64(input) {
			if (!String(input).length) {
				return false;
			}
			let output = "",
				chr1,
				chr2,
				chr3,
				enc1,
				enc2,
				enc3,
				enc4,
				i = 0;

			do {
				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output =
					output +
					this.keyStr.charAt(enc1) +
					this.keyStr.charAt(enc2) +
					this.keyStr.charAt(enc3) +
					this.keyStr.charAt(enc4);
			} while (i < input.length);

			return output;
		},

		decode64(input) {
			if (!input) {
				return false;
			}
			let output = "",
				chr1,
				chr2,
				chr3,
				enc1,
				enc2,
				enc3,
				enc4,
				i = 0;

			// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			do {
				enc1 = this.keyStr.indexOf(input.charAt(i++));
				enc2 = this.keyStr.indexOf(input.charAt(i++));
				enc3 = this.keyStr.indexOf(input.charAt(i++));
				enc4 = this.keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 !== 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 !== 64) {
					output = output + String.fromCharCode(chr3);
				}
			} while (i < input.length);

			return output;
		},
	};

	// add a leading zero to single numbers so the string is at least two characters
	leadingZero(n) {
		return n < 10 ? "0" + n : n;
	}

	dynamicSort(property) {
		let sortOrder = 1;
		if (property[0] === "-") {
			sortOrder = -1;
			property = property.substr(1);
		}
		return function (a, b) {
			let result =
				a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
			return result * sortOrder;
		};
	}

	// return yes|no for 1|0
	yesNo(val) {
		return parseInt(val, 10) < 1 ? "No" : "Yes";
	}

	// validate a javascript date object
	isValidDate(d) {
		if (Object.prototype.toString.call(d) !== "[object Date]") {
			return false;
		}
		return !isNaN(d.getTime());
	}

	// generate a pseudo-random ID
	id() {
		return (
			(Math.random() * 100).toString() + (Math.random() * 100).toString()
		).replace(/\./g, "");
	}

	// try/catch a function
	tryCatch(fn, ctx, args) {
		let errorObject = {
			value: null,
		};
		try {
			return fn.apply(ctx, args);
		} catch (e) {
			errorObject.value = e;
			return errorObject;
		}
	}

	// return a numeric representation of the value passed
	getNumberValue(pixelValue) {
		return isNaN(Number(pixelValue))
			? Number(pixelValue.substring(0, pixelValue.length - 2))
			: pixelValue;
	}

	// check whether a value is numeric
	isNumeric(num) {
		return !isNaN(parseFloat(num)) && isFinite(num);
	}

	// get top/left offset of a selector on screen
	getOffset(selector) {
		let rect = selector.getBoundingClientRect();

		return {
			top: rect.top + document.body.scrollTop,
			left: rect.left + document.body.scrollLeft,
		};
	}

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
	 * have elapsed since the last time the debounced function was invoked.
	 *
	 * @param {Function} func - The function to debounce.
	 * @param {number} wait - The number of milliseconds to delay.
	 * @param {boolean} [immediate=false] - Trigger the function on the leading edge, instead of the trailing.
	 * @return {Function} A new debounced function.
	 */
	debounce(func, wait, immediate = false) {
		let timeout;

		return function executedFunction() {
			// Save the context and arguments for later invocation
			const context = this;
			const args = arguments;

			// Define the function that will actually call `func`
			const later = function () {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};

			const callNow = immediate && !timeout;

			// Clear the previous timeout
			clearTimeout(timeout);

			// Set a new timeout
			timeout = setTimeout(later, wait);

			// If 'immediate' is true and this is the first time the function has been called,
			// execute it right away
			if (callNow) func.apply(context, args);
		};
	}
}
