
const docReady = require('doc-ready');
const CamDiff = require('../../lib/camdiff');



docReady(() => {
  let dstMotion = document.getElementById('motion');
  dstMotion.width = 64;
  dstMotion.height = 48;

  let dstContext = dstMotion.getContext('2d');

  let c = new CamDiff({
    srcVideo: document.getElementById('video'),
    motion: dstMotion,
    showMotionBox: true,
    showMotionPx: true
  });

  c.on('motion', (data) => {
    dstContext.putImageData(data.rawData, 0, 0);
  });

  function drawMotionBox(data) {
    return;
    this.motionCanvasCtx.strokeStyle = '#fff';
    this.motionCanvasCtx.strokeRect(
      data.x.min + 0.5,
      data.y.min + 0.5,
      data.x.max - data.x.min,
      data.y.max - data.y.min
    );
  }
});
