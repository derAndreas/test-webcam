
const docReady = require('doc-ready');
const CamDiff = require('../../lib/camdiff');

const isDebug = false;

docReady(() => {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  let boxR = document.getElementById('redbox');
  let boxB = document.getElementById('bluebox');
  let boxY = document.getElementById('yellowbox');
  let boxG = document.getElementById('greenbox');
  let btnStart = document.getElementById('start');
  let btnStop = document.getElementById('stop');
  let vid = document.getElementById('video');
  let dstMotion = document.getElementById('motion');
  let dstContext = dstMotion.getContext('2d');
  let audioCtx = new AudioContext();
  let masterGain = audioCtx.createGain();
  let playingNotes = [];

  let dstWidth = 640;
  let dstHeight = 480;
  let vidWidth = 640;
  let vidHeight = 480;
  let boxSize = 50;

  let boxDef = {
    'tl': {
      el: boxR,
      pos: {
        left: 0,
        top: 0
      }
    },
    'tr': {
      el: boxB,
      pos: {
        left: dstWidth - boxSize,
        top: 0
      }
    },
    'bl': {
      el: boxY,
      pos: {
        left: 0,
        top: dstHeight - boxSize
      }
    },
    'br': {
      el: boxG,
      pos: {
        left: dstWidth - boxSize,
        top: dstHeight - boxSize
      }
    }
  };

  masterGain.gain.value = 0.2;
  masterGain.connect(audioCtx.destination);

  dstMotion.width = dstWidth;
  dstMotion.height = dstHeight;

  let c = new CamDiff({
    srcVideo: document.getElementById('video'),
    autoStart: true,
    includeMotionBox: true,
    includeMotionPx: true,
    interval: 100,
    width: vidWidth,
    height: vidHeight,
    diffWidth: dstWidth,
    diffHeight: dstHeight,
    pxDiffThresh: 64,
    scoreThresh: 48
  });

  c.on('motion', (data) => {
    isDebug && dstContext.putImageData(data.rawData, 0, 0);

    if(!data.hasMotion) {
      return;
    }

    isDebug && drawMotionBox(dstContext, data.motionBox);

    let r1 = {
      left: data.motionBox.x.min * (vidWidth / dstWidth),
      right: data.motionBox.x.max * (vidWidth / dstWidth),
      top: data.motionBox.y.min * (vidHeight / dstHeight),
      bottom: data.motionBox.y.max * (vidHeight / dstHeight),
    }

    let boxKeys = Object.keys(boxDef);
    let boxData;
    let boxEl;
    let boxPos;
    let box;
    let i;
    for(i = 0; i < boxKeys.length; ++i) {
      boxData = boxDef[boxKeys[i]];
      boxEl = boxData.el;
      boxPos = boxData.pos;
      box = {
        left: boxPos.left,
        right: boxPos.left + boxSize,
        top: boxPos.top,
        bottom: boxPos.top + boxSize,
        width: boxSize,
        height: boxSize
      };
      if(isDebug) {
        dstContext.strokeStyle = 'aqua';
        dstContext.strokeRect(box.left, box.top, boxSize, boxSize);
      }

      if(intersectRect(r1, box)) {
        playTone(boxEl);
      }
    }
  });


  btnStart.addEventListener('click', () => {
    c.start();
  });
  btnStop.addEventListener('click', () => {
    c.stop();
    isDebug && dstContext.clearRect(0, 0, diffWidth, diffHeight);
  });

  function playTone(box) {
    let freq = box.getAttribute('data-frequency');
    if(playingNotes.indexOf(freq) > -1) {
      return;
    }
    let os = createOssi(freq);

    playingNotes.push(freq)

    box.style.backgroundColor = '#fff';
    os.start(0);
    setTimeout(() => {
      box.style.backgroundColor = '';

      os.stop(0);
      os.disconnect();

      playingNotes.splice(playingNotes.indexOf(freq), 1);
    }, 1000);
  }


  function drawMotionBox(ctx, data) {
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(
      data.x.min + 0.5,
      data.y.min + 0.5,
      data.x.max - data.x.min,
      data.y.max - data.y.min
    );
  }


  function intersectRect(r1, r2) {
    return !(r2.left > r1.right ||
             r2.right < r1.left ||
             r2.top > r1.bottom ||
             r2.bottom < r1.top);
  }

  function createOssi(freq) {
    let os = audioCtx.createOscillator();
    os.type = 'sine';
    os.frequency.value = freq;
    os.connect(masterGain);

    return os;
  }
});
