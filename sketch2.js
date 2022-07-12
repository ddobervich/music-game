let song;
let targets = [];
let beat_timings = [];
let start_time = -1;
let beat_threshold = -1;
let boxWidth = 180;
let gameMode = "init";
let SHIFT_AMOUNT = 50;
let MAX_INIT_BEATS = 10;
let MAX_AT_A_TIME = 1;
let colors = []

let poseNet;
let poses = [];
var vid;

let score = 0;
let leftHandX = -1;
let leftHandY = -1;
let rightHandX = -1;
let rightHandY = -1;

function preload() {
  song = loadSound('assets/aroundtheworld.mp4');
}

function setup() {
  createCanvas(800, 600);
  initColors();

  vid = createCapture(VIDEO);
  vid.size(width, height);
  vid.hide();
 
    // Create a new poseNet method with a single detection
    poseNet = ml5.poseNet(vid, modelReady);

    // This sets up an event that fills the global variable "poses"
    // with an array every time new poses are detected
    poseNet.on('pose', function(results) {
      poses = results;
    });
}

function initColors() {
  colors.push(color(255,0,0));
  colors.push(color(0, 255, 0));
  colors.push(color(0, 0, 255));
  colors.push(color(0,0,0));
  colors.push(color(255, 255, 255));
  colors.push(color(127, 127, 127));
  colors.push(color(255, 255, 0));
}

function getRandomColor() {
  let i = int(random(0,colors.length));
  return colors[i];
}

function modelReady() {
  select('#status').html('Model Loaded');
}

function mousePressed() {
  if (song.isPlaying()) {
    song.pause();
  } else {
    song.loop();
  }
}

function keyPressed() {
  if (gameMode === "init") {
    beat_timings.push(millis());
    if (beat_timings.length == MAX_INIT_BEATS) {
      gameMode = "play";
      calculateBPM();
    }
  }
}

function calculateBPM() {
  // throw away first two
  beat_timings.shift();
  beat_timings.shift();

  beat_threshold = (beat_timings[beat_timings.length-1] - beat_timings[0])/(beat_timings.length-1);
  let bpm = 60000.0/beat_threshold;
  console.log("bpm is ", bpm);
  start_time = beat_timings[beat_timings.length-1];
  next_beat = start_time + beat_threshold - SHIFT_AMOUNT;
}

function draw() {
  background(220);

  if (gameMode === "init") {
    initBeats();
  } else {
    play();
  }
}

function initBeats() {
  background(0);
  fill(255);
  stroke(255);
 
  textAlign(CENTER, CENTER);
  textSize(20);
  text("tap to the beat", width/2, height / 4);

  textSize(80);
  text(MAX_INIT_BEATS - beat_timings.length, width/2, height/2);
}

function play() {
  image(vid,0,0, width, height);
  
    // We can call both functions to draw all keypoints and the skeletons
  drawKeypoints();
  drawSkeleton();

  for (const target of targets) {
    target.update();
    target.display();

    collisionCheck();
  }

  if (targets.length <= MAX_AT_A_TIME - 1 && beat_threshold > 0 && (millis() >= next_beat)) {
    next_beat += beat_threshold;
    console.log("adding new target");
    targets.push(new Target(beat_threshold*4))
  }

  targets = targets.filter(function(item) {
    return !item.remove
  })

  fill(255);
  rect(width - 100, 0, width, 100);
  fill(0);
  stroke(0);
  text(score, width-50, 50);
}

function collisionCheck() {
  if (leftHandX > 0 && rightHandX > 0 && leftHandY > 0 && rightHandY > 0) {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i];
      if (target.ignore == false) {
      let distance1 = dist(leftHandX, leftHandY, target.x, target.y);
      let distance2 = dist(rightHandX, rightHandY, target.x, target.y);
      if (distance1 < target.diameter/2 || distance2 < target.diameter/2) {
        target.transitions = []
        target.ignore = true;
        target.addDeathTransition();
        score++;
      }
    }
    }
  }
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints()  {
  // Loop through all the poses detected (at most one)
  for (let i = 0; i < min(poses.length, 1); i++) {
    // For each pose detected, loop through all the keypoints
    let pose = poses[i].pose;
    
    drawPoint(pose.leftShoulder);
    drawPoint(pose.rightShoulder);
    drawPoint(pose.leftElbow);
    drawPoint(pose.rightElbow);
    drawPoint(pose.leftWrist);
    drawPoint(pose.rightWrist);

    let SCALE = 1.2
    leftHandX = pose.leftElbow.x + (pose.leftWrist.x - pose.leftElbow.x)*SCALE;
    leftHandY = pose.leftElbow.y + ( pose.leftWrist.y - pose.leftElbow.y)*SCALE;

    rightHandX = pose.rightElbow.x + (pose.rightWrist.x - pose.rightElbow.x)*SCALE;
    rightHandY = pose.rightElbow.y + (pose.rightWrist.y - pose.rightElbow.y)*SCALE;

    fill(0, 0, 255, 127);
    ellipse(leftHandX, leftHandY, 50, 50);
    ellipse(rightHandX, rightHandY, 50, 50);
  }
}

function drawPoint(keypoint) {
    fill(255, 0, 0, 127);
     noStroke();
     ellipse(keypoint.x, keypoint.y, 10, 10);
}

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < min(poses.length, 1); i++) {
    let skeleton = poses[i].skeleton;
    // For every skeleton, loop through all body connections
    
    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      stroke(255, 0, 0, 127);
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  
  }
}

class Target {
  constructor(life) {
    this.time_alive = life;
    this.born = millis();
    this.remove = false;
    this.x = (int(random(width)/boxWidth))*boxWidth;
    this.y = (int(random(height)/boxWidth))*boxWidth;
    this.diameter = boxWidth
    this.color = getRandomColor();
    this.transitions = [];
    //this.addHorizontalMoveTransition();
    this.addThrobTransition();
    this.ignore = false;
  }

  update() {
    if (this.diameter == 0) {
      this.remove = true;
    }
    if (this.y < 0 || this.x < 0) {
      this.remove = true;
    }
    let applicable_transitions = this.getTransitions();
    if (applicable_transitions.length <= 1) {
      this.addThrobTransition();
      console.log("adding throb transition at next beat");
    } 
    for (let i = 0; i < applicable_transitions.length; i++) {
       let current_transition = applicable_transitions[i];
       current_transition.apply(this);
    }
  }

  getTransitions() { 
    let output = [];
    for (let i = 0; i < this.transitions.length; i++) {
      let time = millis();
      if (this.transitions[i].t1 < time && time < this.transitions[i].t1+this.transitions[i].duration) {
        output.push(this.transitions[i]);
      }
    }

    return output;
  }

  display() {
    //if (millis() - this.born > this.time_alive) {
    //  this.remove = true;
    //}

    this.color.setAlpha(127);
    fill(this.color);
    stroke(this.color);
    ellipse(this.x, this.y, this.diameter, this.diameter);
  }

  addThrobTransition() {
    let beats_since_born = int((millis() - this.born)/beat_threshold);
    let nextBeat = this.born + (beats_since_born+1)*beat_threshold;
    let m = new Transition(nextBeat, beat_threshold, EasingFunctions.throbCos, {diameter:boxWidth}, {diameter:3*boxWidth/4})
    this.transitions.push(m);
  }

  addHorizontalMoveTransition() {
    let m1 = new Transition(this.born + beat_threshold, beat_threshold, EasingFunctions.easeInCubic, {x:this.x}, {x:(this.x+2*boxWidth)});
    let m2 = new Transition(this.born + 2*beat_threshold, beat_threshold, EasingFunctions.easeInCubic, {x:(this.x+2*boxWidth)}, {x:this.x});
    this.transitions.push(m1);
    this.transitions.push(m2);
  }

  addDeathTransition() {
    this.color = color(255,255,255,255);
    let m1 = new Transition(millis(), beat_threshold, EasingFunctions.easeInCubic, {y:this.y}, {y:-this.diameter});
    let m2 = new Transition(millis(), beat_threshold, EasingFunctions.easeInCubic, {diameter:this.diameter}, {diameter:0});
    this.transitions.push(m1);
    this.transitions.push(m2);
  }
}

class Transition {
  constructor(t1, duration, f, properties1, properties2) {
    this.t1 = t1;
    this.duration = duration;
    this.f = f;
    this.properties1 = properties1;
    this.properties2 = properties2;
  }

  apply(target) {
    let in_percent = (millis() - this.t1)/this.duration; // what % through the interval are we?
    let out = this.f(in_percent);                        // calculate output from easing function
    
    if (0 <= out && out <= 1) {
    
    let properties = Object.keys(this.properties1);
    for (let i = 0; i < properties.length; i++) {
      let property = properties[i];
      let val1 = this.properties1[property];
      let val2 = this.properties2[property];

      let newVal = val1 + out*(val2-val1);
      target[property] = newVal;
    }
  }
  }
}

let EasingFunctions = {
  const: t => 1,
  // no easing, no acceleration
  throbCos: t => 0.5*cos(2*3.14159*t)+0.5,
  // wtf
  linear: t => t,
  // accelerating from zero velocity
  easeInQuad: t => t*t,
  // decelerating to zero velocity
  easeOutQuad: t => t*(2-t),
  // acceleration until halfway, then deceleration
  easeInOutQuad: t => t<.5 ? 2*t*t : -1+(4-2*t)*t,
  // accelerating from zero velocity 
  easeInCubic: t => t*t*t,
  // decelerating to zero velocity 
  easeOutCubic: t => (--t)*t*t+1,
  // acceleration until halfway, then deceleration 
  easeInOutCubic: t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1,
  // accelerating from zero velocity 
  easeInQuart: t => t*t*t*t,
  // decelerating to zero velocity 
  easeOutQuart: t => 1-(--t)*t*t*t,
  // acceleration until halfway, then deceleration
  easeInOutQuart: t => t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t,
  // accelerating from zero velocity
  easeInQuint: t => t*t*t*t*t,
  // decelerating to zero velocity
  easeOutQuint: t => 1+(--t)*t*t*t*t,
  // acceleration until halfway, then deceleration 
  easeInOutQuint: t => t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t
}
