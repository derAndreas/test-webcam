
const docReady = require('doc-ready');
const CamDiff = require('../../lib/camdiff');



docReady(() => {
  let boxR = document.getElementById('redbox');
  let boxB = document.getElementById('bluebox');
  let boxY = document.getElementById('yellowbox');
  let vid = document.getElementById('video');

  let posVid = vid.getBoundingClientRect();
  let vidWidth = posVid.width;
  let leftPos = posVid.left;
  let third = vidWidth / 3;
  let boxes = [boxR, boxB, boxY];
  for(let i = 0; i < 3; ++i) {

    boxes[i].style.left = leftPos + third * (i+1) - (third/2) + 'px';
    boxes[i].style.top = posVid.top + 'px';
  }


  let c = new CamDiff({
    video: vid,
    motion: document.getElementById('motion'),
    showMotionBox: true,
    showMotionPx: true
  });

  c.on('motion', (data) => {
    if(!data.hasMotion) {
      return;
    }
    let r1 = {
      left: data.motionBox.x.min,
      right: data.motionBox.x.max,
      top: data.motionBox.y.min,
      bottom: data.motionBox.y.max,
    }

    console.log(data.motionPixels)

    for(let i = 0; i < 3; ++i) {
      let box = boxes[i].getBoundingClientRect();

      if(intersectRect(r1, box)) {
        let oldColor = boxes[i].style.backgroundColor;
        boxes[i].style.backgroundColor = '#fff';
        setTimeout(() => {
          boxes[i].style.backgroundColor = oldColor;
        }, 1000);
      }
    }
  });



  function intersectRect(r1, r2) {
    console.log(r1, r2)
    return !(r2.left > r1.right ||
             r2.right < r1.left ||
             r2.top > r1.bottom ||
             r2.bottom < r1.top);
  }
});
