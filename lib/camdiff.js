
const EventEmitter = require('events');

class CamDiff extends EventEmitter {

  constructor(options = {}) {
    super();

    // parse the options
    if(!options.srcVideo) {
      throw new Error('Need a video src element as srcVideo');
    }

    this.srcVideo = options.srcVideo;
    this.capInterval = options.interval || 200;
    this.capWidth = options.width || 640;
    this.capHeight = options.height || 480;
    this.diffWidth = options.diffWidth || (this.capWidth / 10);
    this.diffHeight = options.diffHeight || (this.capHeight / 10);

    this.pxDiffThresh = options.pxDiffThresh || 32;
    this.scoreThresh = options.scoreThresh || 16;

    this.includeMotionBox = options.includeMotionBox || false;
    this.includeMotionPx = options.includeMotionPx || false;

    // internal canvases
    this._capCanvas = this._setupCanvas(this.capWidth, this.capHeight);
    this._capCanvasCtx = this._capCanvas.getContext('2d');
    this._diffCanvas = this._setupCanvas(this.diffWidth, this.diffHeight);
    this._diffCanvasCtx = this._diffCanvas.getContext('2d');

    this.srcVideo.autoplay = true;
    this.isReady = false;
    this.stream = null;
    this._interval = false;

    this.requestWebCam();

    this.on('webcam-ready', this.startVideoStream.bind(this))
  }

  requestWebCam() {
    let constraints = {
      audio: false,
      video: {
        width: this.capWidth,
        height: this.capHeight
      }
    };
    return navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        this.stream = stream;
        this.emit('webcam-ready', stream);
      })
      .catch((err) => {
        throw err;
      })
  }

  startVideoStream() {
    if(!this.stream) {
      throw new Error('Cannot start video stream, source stream not ready');
    }

    let canPlayCallback = () => {
      // we are streaming now
      this.srcVideo.removeEventListener('canplay', canPlayCallback);
      // start the capture
      this._interval = setInterval(this.capture.bind(this), this.capInterval);
    }

    this.srcVideo.srcObject = this.stream;
    this.srcVideo.addEventListener('canplay', canPlayCallback);
  }

  capture() {
    this._capCanvasCtx.drawImage(this.srcVideo, 0, 0, this.capWidth, this.capHeight);

    this._diffCanvasCtx.globalCompositeOperation = 'difference';
    this._diffCanvasCtx.drawImage(this.srcVideo, 0, 0, this.diffWidth, this.diffHeight);

    let capImageData = this._capCanvasCtx.getImageData(0, 0, this.capWidth, this.capHeight);
    let diffImageData = this._diffCanvasCtx.getImageData(0, 0, this.diffWidth, this.diffHeight);
    let diff;

    if(this.isReady) {
      diff = this.createDiff(diffImageData);

      this.emit('motion', {
        rawData: diffImageData,
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

  createDiff(diffData) {
    let rgba = diffData.data;
    let score = 0;
    let motionPixels = this.includeMotionPx ? [] : null;
    let motionBox = null;
    let i = 0;
    let len = rgba.length;
    let pxDiff;
    let normalized;
    let coords;

    for(; i < len; i += 4) {
      pxDiff = rgba[i] * 0.3 + rgba[i + 1] * 0.6 + rgba[i + 2] * 0.1;
      normalized = Math.min(255, pxDiff * (255 / this.pxDiffThresh));

      rgba[i] = 0;
      rgba[i + 1] = normalized;
      rgba[i + 2] = 0;

      if(pxDiff >= this.pxDiffThresh) {
        score++;
        coords = this.calcCoords(i / 4);

        if(this.includeMotionBox) {
          motionBox = this.calcMotionBox(motionBox, coords.x, coords.y);
        }

        if(this.includeMotionPx) {
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

  calcCoords(idx) {
    return {
      x: idx % this.diffWidth,
      y: Math.floor(idx / this.diffWidth)
    }
  }

  calcMotionBox(current, x, y) {
    let box = current;

    if(!box) {
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

  calcMotionPx(current, x, y, pxDiff) {
    current[x] = current[x] || [];
    current[x][y] = true;

    return current;
  }

  _setupCanvas(width, height, el) {
    if(!el) {
      el = document.createElement('canvas');
    }

    el.width = width;
    el.height = height;

    return el;
  }
}


module.exports = CamDiff;
