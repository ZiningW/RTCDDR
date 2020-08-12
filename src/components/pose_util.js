import * as posenet from '@tensorflow-models/posenet';

var COLOR = 'aqua';
var WIDE_COLOR = 'rgb(255, 0, 0, 0.3)';
var WIDE_COLOR_ACCEPTED = 'rgb(102, 255, 51, 0.3)'
const LINE_WIDTH = 2;
const TOLERANCE = 100;

// Check tolerance based on best of 6 calculated distances
var rollingToleranceA = [true, true, true, true, true, true];
var rollingToleranceB = [true, true, true, true, true, true];

export function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
function drawSegment([ay, ax], [by, bx], color, scale, ctx) {

  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawSegmentReceived([ay, ax], [by, bx], color, wideColor, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = 40;
  ctx.strokeStyle = wideColor;

  ctx.stroke();
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
export function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints =
      posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  function toTuple({y, x}) {
    return [y, x];
  }

  adjacentKeyPoints.forEach((keypoints) => {

    drawSegment(
        toTuple(keypoints[0].position), toTuple(keypoints[1].position), COLOR,
        scale, ctx);
  });

}

export function checkToleranceAndDrawSkeleton(keyPointsSelf, keyPointsReceived, minConfidence, ctx, scale = 1){
  const adjacentKeyPointsSelf = posenet.getAdjacentKeyPoints(keyPointsSelf, minConfidence);
  const adjacentKeyPointsReceived = posenet.getAdjacentKeyPoints(keyPointsReceived, minConfidence);
  
  function toTuple({y, x}) {
    return [y, x];
  }

  function distance(yxSelf, yxRec){
    return Math.sqrt((yxSelf[0] - yxRec[0])**2 + (yxSelf[1] - yxRec[1])**2)
  }

  adjacentKeyPointsSelf.forEach((keyPointsSelf) => 
  adjacentKeyPointsReceived.forEach((keyPointsReceived) => {
    // get distance between two points
    let aPositionSelf = toTuple(keyPointsSelf[0].position);
    let bPositionSelf = toTuple(keyPointsSelf[1].position);
    let aPositionRec = toTuple(keyPointsReceived[0].position);
    let bPositionRec = toTuple(keyPointsReceived[1].position);

    // First draw our own segment
    drawSegment(toTuple(keyPointsSelf[0].position), 
                toTuple(keyPointsSelf[1].position), 
                COLOR, scale, ctx);

    var distanceA = distance(aPositionSelf, aPositionRec);
    var distanceB = distance(bPositionSelf, bPositionRec);

    rollingToleranceA.shift();
    rollingToleranceB.shift();

    if (distanceA < TOLERANCE){
      rollingToleranceA.push(true)
    } else {
      rollingToleranceA.push(false)
    }

    if (distanceB < TOLERANCE){
      rollingToleranceB.push(true)
    } else {
      rollingToleranceB.push(false)
    }
    
    // console.log('rolling A', rollingToleranceA)
    // console.log('rolling B', rollingToleranceB)
    if (rollingToleranceA.some(e => e === true) && 
        rollingToleranceB.some(e => e === true)){
      // If the segment is within the set tolerance
      drawSegmentReceived(toTuple(keyPointsReceived[0].position), 
                          toTuple(keyPointsReceived[1].position), 
                          COLOR, WIDE_COLOR_ACCEPTED,scale, ctx);

    } else {
      // If the segment is not within the set tolerance

      drawSegmentReceived(toTuple(keyPointsReceived[0].position), 
                          toTuple(keyPointsReceived[1].position), 
                          COLOR, WIDE_COLOR, scale, ctx);
    }

  }));
}

/**
 * Draw pose keypoints onto a canvas
 */
export function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const {y, x} = keypoint.position;

    drawPoint(ctx, y * scale, x * scale, 3, COLOR);
  }
}


