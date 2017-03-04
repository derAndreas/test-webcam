(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');

var CamDiff = function (_EventEmitter) {
  _inherits(CamDiff, _EventEmitter);

  function CamDiff() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, CamDiff);

    // parse the options
    var _this = _possibleConstructorReturn(this, (CamDiff.__proto__ || Object.getPrototypeOf(CamDiff)).call(this));

    if (!options.srcVideo) {
      throw new Error('Need a video src element as srcVideo');
    }
    if (!options.motion) {
      throw new Error('Need a motion canvas element as motion');
    }
    _this.srcVideo = options.srcVideo;
    _this.motionCanvas = options.motion;
    _this.capInterval = options.interval || 200;
    _this.capWidth = options.width || 640;
    _this.capHeight = options.height || 480;
    _this.diffWidth = options.diffWidth || _this.capWidth / 10;
    _this.diffHeight = options.diffHeight || _this.capHeight / 10;

    _this.pxDiffThresh = options.pxDiffThresh || 32;
    _this.scoreThresh = options.scoreThresh || 16;

    _this.showMotionBox = options.showMotionBox || false;
    _this.showMotionPx = options.showMotionPx || false;

    // internal canvases
    _this._capCanvas = _this._setupCanvas(_this.capWidth, _this.capHeight);
    _this._capCanvasCtx = _this._capCanvas.getContext('2d');
    _this._diffCanvas = _this._setupCanvas(_this.diffWidth, _this.diffHeight);
    _this._diffCanvasCtx = _this._diffCanvas.getContext('2d');
    _this.motionCanvas = _this._setupCanvas(_this.diffWidth, _this.diffHeight, _this.motionCanvas);
    _this.motionCanvasCtx = _this.motionCanvas.getContext('2d');

    _this.srcVideo.autoplay = true;
    _this.isReady = false;
    _this.stream = null;
    _this._interval = false;

    _this.requestWebCam();

    _this.on('webcam-ready', _this.startVideoStream.bind(_this));
    return _this;
  }

  _createClass(CamDiff, [{
    key: 'requestWebCam',
    value: function requestWebCam() {
      var _this2 = this;

      var constraints = {
        audio: false,
        video: {
          width: this.capWidth,
          height: this.capHeight
        }
      };
      return navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        _this2.stream = stream;
        _this2.emit('webcam-ready', stream);
      }).catch(function (err) {
        throw err;
      });
    }
  }, {
    key: 'startVideoStream',
    value: function startVideoStream() {
      var _this3 = this;

      if (!this.stream) {
        throw new Error('Cannot start video stream, source stream not ready');
      }

      var canPlayCallback = function canPlayCallback() {
        // we are streaming now
        _this3.srcVideo.removeEventListener('canplay', canPlayCallback);
        // start the capture
        _this3._interval = setInterval(_this3.capture.bind(_this3), _this3.capInterval);
      };

      this.srcVideo.srcObject = this.stream;
      this.srcVideo.addEventListener('canplay', canPlayCallback);
    }
  }, {
    key: 'capture',
    value: function capture() {
      this._capCanvasCtx.drawImage(this.srcVideo, 0, 0, this.capWidth, this.capHeight);

      this._diffCanvasCtx.globalCompositeOperation = 'difference';
      this._diffCanvasCtx.drawImage(this.srcVideo, 0, 0, this.diffWidth, this.diffHeight);

      var capImageData = this._capCanvasCtx.getImageData(0, 0, this.capWidth, this.capHeight);
      var diffImageData = this._diffCanvasCtx.getImageData(0, 0, this.diffWidth, this.diffHeight);
      var diff = void 0;

      if (this.isReady) {
        diff = this.createDiff(diffImageData);

        this.motionCanvasCtx.putImageData(diffImageData, 0, 0);

        if (diff.motionBox) {
          this.drawMotionBox(diff.motionBox);
        }

        this.emit('motion', {
          score: diff.score,
          hasMotion: diff.score >= this.scoreThresh,
          motionBox: diff.motionBox,
          motionPixels: diff.motionPixels
        });
      }

      this._diffCanvasCtx.globalCompositeOperation = 'source-over';
      this._diffCanvasCtx.drawImage(this.srcVideo, 0, 0, this.diffWidth, this.diffHeight);

      this.isReady = true;
    }
  }, {
    key: 'createDiff',
    value: function createDiff(diffData) {
      var rgba = diffData.data;
      var score = 0;
      var motionPixels = this.showMotionPx ? [] : null;
      var motionBox = null;
      var i = 0;
      var len = rgba.length;
      var pxDiff = void 0;
      var normalized = void 0;
      var coords = void 0;

      for (; i < len; i += 4) {
        pxDiff = rgba[i] * 0.3 + rgba[i + 1] * 0.6 + rgba[i + 2] * 0.1;
        normalized = Math.min(255, pxDiff * (255 / this.pxDiffThresh));

        rgba[i] = 0;
        rgba[i + 1] = normalized;
        rgba[i + 2] = 0;

        if (pxDiff >= this.pxDiffThresh) {
          score++;
          coords = this.calcCoords(i / 4);

          if (this.showMotionBox) {
            motionBox = this.calcMotionBox(motionBox, coords.x, coords.y);
          }

          if (this.showMotionPx) {
            motionPixels = this.calcMotionPx(motionPixels, coords.x, coords.y, pxDiff);
          }
        }
      }

      return {
        score: score,
        motionBox: motionBox,
        motionPixels: motionPixels
      };
    }
  }, {
    key: 'calcCoords',
    value: function calcCoords(idx) {
      return {
        x: idx % this.diffWidth,
        y: Math.floor(idx / this.diffWidth)
      };
    }
  }, {
    key: 'calcMotionBox',
    value: function calcMotionBox(current, x, y) {
      var box = current;

      if (!box) {
        box = {
          x: {
            min: x,
            max: x
          },
          y: {
            min: y,
            max: y
          }
        };
      }

      box.x.min = Math.min(box.x.min, x);
      box.x.max = Math.max(box.x.max, x);
      box.y.min = Math.min(box.y.min, y);
      box.y.max = Math.max(box.y.max, y);

      return box;
    }
  }, {
    key: 'calcMotionPx',
    value: function calcMotionPx(current, x, y, pxDiff) {
      current[x] = current[x] || [];
      current[x][y] = true;

      return current;
    }
  }, {
    key: 'drawMotionBox',
    value: function drawMotionBox(data) {
      this.motionCanvasCtx.strokeStyle = '#fff';
      this.motionCanvasCtx.strokeRect(data.x.min + 0.5, data.y.min + 0.5, data.x.max - data.x.min, data.y.max - data.y.min);
    }
  }, {
    key: '_setupCanvas',
    value: function _setupCanvas(width, height, el) {
      if (!el) {
        el = document.createElement('canvas');
      }

      el.width = width;
      el.height = height;

      return el;
    }
  }]);

  return CamDiff;
}(EventEmitter);

module.exports = CamDiff;

},{"events":4}],2:[function(require,module,exports){
/*!
 * docReady v1.0.4
 * Cross browser DOMContentLoaded event emitter
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true, unused: true*/
/*global define: false, require: false, module: false */

( function( window ) {

'use strict';

var document = window.document;
// collection of functions to be triggered on ready
var queue = [];

function docReady( fn ) {
  // throw out non-functions
  if ( typeof fn !== 'function' ) {
    return;
  }

  if ( docReady.isReady ) {
    // ready now, hit it
    fn();
  } else {
    // queue function when ready
    queue.push( fn );
  }
}

docReady.isReady = false;

// triggered on various doc ready events
function onReady( event ) {
  // bail if already triggered or IE8 document is not ready just yet
  var isIE8NotReady = event.type === 'readystatechange' && document.readyState !== 'complete';
  if ( docReady.isReady || isIE8NotReady ) {
    return;
  }

  trigger();
}

function trigger() {
  docReady.isReady = true;
  // process queue
  for ( var i=0, len = queue.length; i < len; i++ ) {
    var fn = queue[i];
    fn();
  }
}

function defineDocReady( eventie ) {
  // trigger ready if page is ready
  if ( document.readyState === 'complete' ) {
    trigger();
  } else {
    // listen for events
    eventie.bind( document, 'DOMContentLoaded', onReady );
    eventie.bind( document, 'readystatechange', onReady );
    eventie.bind( window, 'load', onReady );
  }

  return docReady;
}

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( [ 'eventie/eventie' ], defineDocReady );
} else if ( typeof exports === 'object' ) {
  module.exports = defineDocReady( require('eventie') );
} else {
  // browser global
  window.docReady = defineDocReady( window.eventie );
}

})( window );

},{"eventie":3}],3:[function(require,module,exports){
/*!
 * eventie v1.0.6
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true */
/*global define: false, module: false */

( function( window ) {

'use strict';

var docElem = document.documentElement;

var bind = function() {};

function getIEEvent( obj ) {
  var event = window.event;
  // add event.target
  event.target = event.target || event.srcElement || obj;
  return event;
}

if ( docElem.addEventListener ) {
  bind = function( obj, type, fn ) {
    obj.addEventListener( type, fn, false );
  };
} else if ( docElem.attachEvent ) {
  bind = function( obj, type, fn ) {
    obj[ type + fn ] = fn.handleEvent ?
      function() {
        var event = getIEEvent( obj );
        fn.handleEvent.call( fn, event );
      } :
      function() {
        var event = getIEEvent( obj );
        fn.call( obj, event );
      };
    obj.attachEvent( "on" + type, obj[ type + fn ] );
  };
}

var unbind = function() {};

if ( docElem.removeEventListener ) {
  unbind = function( obj, type, fn ) {
    obj.removeEventListener( type, fn, false );
  };
} else if ( docElem.detachEvent ) {
  unbind = function( obj, type, fn ) {
    obj.detachEvent( "on" + type, obj[ type + fn ] );
    try {
      delete obj[ type + fn ];
    } catch ( err ) {
      // can't delete window object properties
      obj[ type + fn ] = undefined;
    }
  };
}

var eventie = {
  bind: bind,
  unbind: unbind
};

// ----- module definition ----- //

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( eventie );
} else if ( typeof exports === 'object' ) {
  // CommonJS
  module.exports = eventie;
} else {
  // browser global
  window.eventie = eventie;
}

})( window );

},{}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],5:[function(require,module,exports){
'use strict';

var docReady = require('doc-ready');
var CamDiff = require('../../lib/camdiff');

docReady(function () {
  var boxR = document.getElementById('redbox');
  var boxB = document.getElementById('bluebox');
  var boxY = document.getElementById('yellowbox');
  var vid = document.getElementById('video');

  var posVid = vid.getBoundingClientRect();
  var vidWidth = posVid.width;
  var leftPos = posVid.left;
  var third = vidWidth / 3;
  var boxes = [boxR, boxB, boxY];
  for (var i = 0; i < 3; ++i) {

    boxes[i].style.left = leftPos + third * (i + 1) - third / 2 + 'px';
    boxes[i].style.top = posVid.top + 'px';
  }

  var c = new CamDiff({
    srcVideo: vid,
    motion: document.getElementById('motion'),
    showMotionBox: true,
    showMotionPx: true
  });

  c.on('motion', function (data) {
    if (!data.hasMotion) {
      return;
    }
    var r1 = {
      left: data.motionBox.x.min,
      right: data.motionBox.x.max,
      top: data.motionBox.y.min,
      bottom: data.motionBox.y.max
    };

    console.log(data.motionPixels);

    var _loop = function _loop(_i) {
      var box = boxes[_i].getBoundingClientRect();

      if (intersectRect(r1, box)) {
        var oldColor = boxes[_i].style.backgroundColor;
        boxes[_i].style.backgroundColor = '#fff';
        setTimeout(function () {
          boxes[_i].style.backgroundColor = oldColor;
        }, 1000);
      }
    };

    for (var _i = 0; _i < 3; ++_i) {
      _loop(_i);
    }
  });

  function intersectRect(r1, r2) {
    console.log(r1, r2);
    return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
  }
});

},{"../../lib/camdiff":1,"doc-ready":2}]},{},[5]);
