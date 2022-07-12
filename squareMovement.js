let song;
let target;

let start_time = 370;
let bpm = 98;
let beat_threshold = (1.0/bpm)*60*1000;     // (min/beat)*(60 sec/min)*(1000 ms/sec)
let boxWidth = 180;
let SHIFT_AMOUNT = 50;
let MAX_INIT_BEATS = 10;
let MAX_AT_A_TIME = 1;
let colors = []

// in-out cubic
//let f = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
let f = t => t

// define 4 sides for the square
let x0 = 100;
let y0 = 100;
let side_length = 300;
let p1 = {x: x0, y: y0};
let p2 = {x: x0 + side_length, y: y0};
let p3 = {x: x0 + side_length, y: y0 + side_length}
let p4 = {x: x0, y: y0 + side_length};

function preload() {
  song = loadSound('assets/ratatat.mp3');
}

function setup() {
  createCanvas(800, 600);
  initColors();
  song.loop();
  target = new Target(beat_threshold*400);
}

function keyPressed() {
  //console.log(millis()%beat_threshold);
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

function draw() {
  background(220);
  
  play();
}

function play() {
  if (start_time == -1) {
    start_time = millis();
    target.addBoxMoveTransitions(p1, p2, p3, p4, f);
  }

  target.update()
  target.display();
}

function getNextBeat() {
  let beats_so_far = Math.floor((millis()-start_time)/beat_threshold);

  return start_time + (beats_so_far+1)*beat_threshold;
}

class Target {
  constructor(life, x, y) {
    this.time_alive = life;
    this.transitions = [];
    this.born = millis();
    this.remove = false;
    this.x = x;
    this.y = y;
    this.diameter = boxWidth
    this.color = getRandomColor();
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
      this.addBoxMoveTransitions(p1, p2, p3, p4, f);
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

  // p1 is (x, y) to start, and p2 is (x, y) to end.  f is easing function.
  // n is how many beats to wait
  moveVector(p1, p2, f, n) {
    let t1 = new Transition(getNextBeat()+beat_threshold*n, beat_threshold, f, {x:p1.x, y:p1.y}, {x:p2.x, y:p2.y});
    this.transitions.push(t1);
  }

  display() {
    this.color.setAlpha(127);
    fill(this.color);
    stroke(this.color);
    ellipse(this.x, this.y, this.diameter, this.diameter);
  }

  addBoxMoveTransitions(p1, p2, p3, p4, f) {
    this.moveVector(p1, p2, f, 0);
    this.moveVector(p2, p3, f, 1);
    this.moveVector(p3, p4, f, 2);
    this.moveVector(p4, p1, f, 3);
  }

  addHorizontalMoveTransition() {
    let m1 = new Transition(this.born + beat_threshold, beat_threshold, EasingFunctions.easeInCubic, {x:this.x}, {x:(this.x+2*boxWidth)});
    let m2 = new Transition(this.born + 2*beat_threshold, beat_threshold, EasingFunctions.easeInCubic, {x:(this.x+2*boxWidth)}, {x:this.x});
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
