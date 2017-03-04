
const docReady = require('doc-ready');
const CamDiff = require('../../lib/camdiff');



docReady(() => {
  let c = new CamDiff({
    video: document.getElementById('video'),
    motion: document.getElementById('motion'),
    showMotionBox: true,
    showMotionPx: true
  });

  c.on('webcam-ready', () => {
    console.log('webcam yo!');
  });
});
