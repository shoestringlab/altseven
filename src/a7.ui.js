a7.ui = (function () {
    'use strict'

    // browser events that can be used in templating, e.g. data-click will be added to the resulting HTML as a click event handler
    const resourceEvents = ['cached', 'error', 'abort', 'load', 'beforeunload']

    const networkEvents = ['online', 'offline']

    const focusEvents = ['focus', 'blur']

    const websocketEvents = ['open', 'message', 'error', 'close']

    const sessionHistoryEvents = ['pagehide', 'pageshow', 'popstate']

    const cssAnimationEvents = [
        'animationstart',
        'animationend',
        'animationiteration',
    ]

    const cssTransitionEvents = [
        'transitionstart',
        'transitioncancel',
        'transitionend',
        'transitionrun',
    ]

    const formEvents = ['reset', 'submit']

    const printingEvents = ['beforeprint', 'afterprint']

    const textCompositionEvents = [
        'compositionstart',
        'compositionupdate',
        'compositionend',
    ]

    const viewEvents = [
        'fullscreenchange',
        'fullscreenerror',
        'resize',
        'scroll',
    ]

    const clipboardEvents = ['cut', 'copy', 'paste']

    const keyboardEvents = ['keydown', 'keypress', 'keyup']

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
        'wheel',
    ]

    const dragEvents = [
        'drag',
        'dragend',
        'dragstart',
        'dragleave',
        'dragover',
        'drop',
    ]

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
        'waiting',
    ]

    const progressEvents = [
        // duplicates from resource events
        /* 'abort',
	'error',
	'load', */
        'loadend',
        'loadstart',
        'progress',
        'timeout',
    ]

    const storageEvents = ['change', 'storage']

    const updateEvents = [
        'checking',
        'downloading',
        /* 'error', */
        'noupdate',
        'obsolete',
        'updateready',
    ]

    const valueChangeEvents = [
        'broadcast',
        'CheckBoxStateChange',
        'hashchange',
        'input',
        'RadioStateChange',
        'readystatechange',
        'ValueChange',
    ]

    const uncategorizedEvents = [
        'invalid',
        'localized',
        /* 'message',
	'open', */
        'show',
    ]

    const _standardEvents = resourceEvents
        .concat(networkEvents)
        .concat(focusEvents)
        .concat(websocketEvents)
        .concat(sessionHistoryEvents)
        .concat(cssAnimationEvents)
        .concat(cssTransitionEvents)
        .concat(formEvents)
        .concat(printingEvents)
        .concat(textCompositionEvents)
        .concat(viewEvents)
        .concat(clipboardEvents)
        .concat(keyboardEvents)
        .concat(mouseEvents)
        .concat(dragEvents)
        .concat(mediaEvents)
        .concat(progressEvents)
        .concat(storageEvents)
        .concat(updateEvents)
        .concat(valueChangeEvents)
        .concat(uncategorizedEvents)

    var _events = [],
        _options = {},
        _selectors = {},
        _nodes = {},
        _queue = [],
        _deferred = [],
        _stateTransition = false,
        //_templateMap = {},
        _views = [],
        // selectors are cached for easy reference later

        _setSelector = function (name, selector) {
            _selectors[name] = selector
            _nodes[name] = document.querySelector(selector)
        },
        _getSelector = function (name) {
            return _selectors[name]
        },
        // get an active view from the view struct
        _getView = function (id) {
            return _views[id]
        },
        _getNode = function (name) {
            return _nodes[name]
        },
        // return the registered events for the application
        _getEvents = function () {
            return _events
        },
        // register a view
        // this happens automatically when a view is instantiated
        _register = function (view) {
            switch (_options.renderer) {
                case 'Handlebars':
                case 'Mustache':
                case 'templateLiterals':
                    _views[view.props.id] = view
                    view.fireEvent('registered')
                    break
            }
        },
        // unregister the view
        _unregister = function (id) {
            delete _views[id]
        },
        // get the IDs for the tree of parent views to the root view of this tree
        _getParentViewIds = function (id) {
            a7.log.trace('Find parents of ' + id)
            let parentIds = []
            let view = _views[id]
            while (view.props.parentID !== undefined) {
                parentIds.unshift(view.props.parentID)
                view = _views[view.props.parentID]
            }
            return parentIds
            // parentids returned in highest to lowest order
        },
        // get the tree of child IDs of a view
        _getChildViewIds = function (id) {
            a7.log.trace('Find children of ' + id)
            let childIds = []
            let view = _views[id]

            for (var child in view.children) {
                let childId = view.children[child].props.id
                if (_getView(childId) !== undefined) {
                    childIds.push(childId)
                    childIds.concat(_getChildViewIds(childId))
                }
            }
            // returned in highest to lowest order
            return childIds
        },
        // add a view to the render queue
        _enqueueForRender = function (id) {
            // if _stateTransition is true, the queue is being processed
            if (!_stateTransition) {
                a7.log.info('enqueue: ' + id)
                if (!_queue.length) {
                    a7.log.trace('add first view to queue: ' + id)
                    _queue.push(id)
                    _processRenderQueue()
                } else {
                    let childIds = _getChildViewIds(id)
                    if (_views[id].props.parentID === undefined) {
                        // if the view is a root view, it should be pushed to the front of the stack
                        a7.log.trace('add to front of queue: ' + id)
                        _queue.unshift(id)
                    } else {
                        let parentIds = _getParentViewIds(id)

                        let highParent = undefined
                        if (parentIds.length) {
                            highParent = parentIds.find(function (parentId) {
                                return _queue.indexOf(parentId) >= 0
                            })
                        }

                        // only add if there is no parent in the queue, since parents will render children
                        if (highParent === undefined) {
                            a7.log.trace('add to end of queue: ' + id)
                            _queue.push(id)
                        }
                    }

                    // remove child views from the queue, they will be rendered by the parents
                    childIds.forEach(function (childId) {
                        if (_queue.indexOf(childId) >= 0) {
                            a7.log.trace('remove child from queue: ' + childId)
                            _queue.splice(_queue.indexOf(childId), 1)
                        }
                    })
                }
            } else {
                _deferred.push(id)
            }
        },
        // render the queue
        _processRenderQueue = function () {
            a7.log.trace('processing the queue')
            _stateTransition = true

            _queue.forEach(function (id) {
                _views[id].render()
            })
            _queue = []
            _stateTransition = false
            _deferred.forEach(function (id) {
                _enqueueForRender(id)
            })
            _deferred = []
        },
        _removeView = function (id) {
            delete _views[id]
        }

    return {
        //render: _render,
        getEvents: _getEvents,
        selectors: _selectors,
        getSelector: _getSelector,
        setSelector: _setSelector,
        getNode: _getNode,
        register: _register,
        unregister: _unregister,
        getView: _getView,
        enqueueForRender: _enqueueForRender,
        removeView: _removeView,
        views: _views,

        init: function (resolve, reject) {
            a7.log.info('Layout initializing...')
            _options = a7.model.get('a7').ui

            // set event groups to create listeners for
            var eventGroups = _options.eventGroups
                ? _options.eventGroups
                : 'standard'
            switch (eventGroups) {
                case 'extended':
                    // extended events not implemented yet
                    reject('Extended events are not implemented yet.')
                case 'standard':
                    _events = _standardEvents
                    break
                default:
                    _options.eventGroups.forEach(function (group) {
                        _events = _events.concat(group)
                    })
            }

            resolve()
        },
    }
})()
