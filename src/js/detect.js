
const docReady = require('doc-ready');
const CamDiff = require('../../lib/camdiff');



docReady(() => {
  let btnStart = document.getElementById('start');
  let btnStop = document.getElementById('stop');
  let dstMotion = document.getElementById('motion');
  let dstContext = dstMotion.getContext('2d');
  dstMotion.width = 64;
  dstMotion.height = 48;

  let c = new CamDiff({
    srcVideo: document.getElementById('video'),
    motion: dstMotion,
    includeMotionBox: true,
    includeMotionPx: true
  });

  c.on('motion', (data) => {
    dstContext.putImageData(data.rawData, 0, 0);
    if(data.hasMotion) {
      drawMotionBox(dstContext, data.motionBox);
    }
  });


  btnStart.addEventListener('click', () => {
    c.start();
  });
  btnStop.addEventListener('click', () => {
    c.stop();
    dstContext.clearRect(0, 0, 64, 48);
  });


  function drawMotionBox(ctx, data) {
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(
      data.x.min + 0.5,
      data.y.min + 0.5,
      data.x.max - data.x.min,
      data.y.max - data.y.min
    );
  }
});
