//import Stats from "/lib/Stats.js";

// FPS Monitor, check out https://github.com/mrdoob/stats.js/ for more info
var stats = new Stats();

// move panel to right side instead of left
// cuz our canvas will be covered
stats.dom.style.left = "auto";
stats.dom.style.right = "0";
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position; 
  uniform mat4  u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix; 
  void main()  {

  gl_Position =  u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
  gl_FragColor = u_FragColor;
  }`

  //Global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix; 

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST); // Enable depth test
  gl.clearDepth(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear everything

}
function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }


  //set an intital value for this matrix to identity
  var identityM = new Matrix4(); // Create a matrix object
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements); // Pass the matrix to u_ModelMatrix attribute


}
//Constant
const POINT = 0; // Point type
const TRIANGLE = 1; // Triangle type
const CIRCLE = 2; // Circle type

//For camera movement
let g_camYaw   = 0;   // left–right   (Y-axis)
let g_camPitch = 0;   // up–down      (X-axis)
let g_isDragging = false;
let g_lastX, g_lastY;
let g_zoom = 1.0;  // scale factor

//Global variables related to UI Elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]; // Default color is white
let g_selectedSize = 5; // Default size is 10.0
let g_selectedType = POINT; // Default type is point
let g_globalAngle = 0; // Default angle is 0
let g_globalArmAngle = 0; // Default arm angle is 0
let g_lowerArmAngle = 0; // Default arm angle is 0
let g_armAnimation = true;
let g_lowerArmAnimation = true;
let g_globalHeadAngle = 0; // Default head angle is 0
let g_headAnimation = true; // Default head angle is 0
let g_legAnimation = true;
let g_legStride = 0;

//Poke Animation
const POKE_DURATION   = 5;          // seconds
const RAISE_UPPER_ARM = 120;        // degrees
const RAISE_LOWER_ARM = -120;       // degrees
const BEAK_CLOSED_Y   = 0.04;
const BEAK_OPEN_Y     = 0.01;

let g_pokeAnimation = false;
let g_pokeStart     = 0;
let g_beakLowerY    = BEAK_CLOSED_Y; // current Y for lower beak
     

function addActionForHtmlElement() {

  //Buttons Events
  document.getElementById('armAnimationStart').onclick = function(){g_armAnimation = true;}; // Set the selected type to point
  document.getElementById('armAnimationEnd').onclick = function(){g_armAnimation = false;}; // Set the selected
  
  document.getElementById('lowerArmAnimationStart').onclick = function(){g_lowerArmAnimation = true;}; // Set the selected type to point
  document.getElementById('lowerArmAnimationEnd').onclick = function(){g_lowerArmAnimation = false;};

  document.getElementById('headAnimationStart').onclick = function(){g_headAnimation = true;}; // Set the selected type to point
  document.getElementById('headAnimationEnd').onclick = function(){g_headAnimation = false;}; // Set the selected type to point

  document.getElementById('legAnimationStart').onclick = function(){g_legAnimation = true;}; // Set the selected type to point
  document.getElementById('legAnimationEnd').onclick = function(){g_legAnimation = false;}; // Set the selected type to point
  //Camera Angle Slider
  document.getElementById('angleSlide').addEventListener('mousemove', function() {
    g_globalAngle = this.value; // Get the value of the slider
    //console.log(g_globalAngle);
    renderAllShapes(); // Redraw the shapes with the new angle
  });

  //Arm Rotation Slider
  document.getElementById('leftArmAngle').addEventListener('mousemove', function() {
    g_globalArmAngle = this.value; // Get the value of the slider
    
    renderAllShapes(); // Redraw the shapes with the new angle
  });

  //lower arm angle slider
  document.getElementById('lowerArmAngle').addEventListener('mousemove', function() {
    g_lowerArmAngle = this.value; // Get the value of the slider
    
    renderAllShapes(); // Redraw the shapes with the new angle
  });
  document.getElementById('headAngle').addEventListener('mousemove', function() {
    g_globalHeadAngle = this.value; // Get the value of the slider
    
    renderAllShapes(); // Redraw the shapes with the new angle
  });
  document.getElementById('legAngle').addEventListener('mousemove', function() {
    g_legStride = this.value; // Get the value of the slider
    
    renderAllShapes(); // Redraw the shapes with the new angle
  });
}


function main() {
  //Set up canvas and gl variables
  setupWebGL();

  //set up GLSL shader programs and conenct GLSL variables 
  connectVariablesToGLSL()
 
  //Set up actions for HTML elements
  addActionForHtmlElement();


  // Specify the color for clearing <canvas>
  gl.clearColor(0.75, 0.75, 0.75, 1.0);

  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);
  setupMouseCamera(); 
  canvas.addEventListener("mousedown", (ev) => {
    if (ev.shiftKey) {
      g_pokeAnimation = true;         // start (do NOT toggle)
      g_pokeStart     = g_seconds;    // reset the timer
    } else {
      click(ev);                      // your normal click handler
    }
  });
  //renderAllShapes();
  requestAnimationFrame(tick);
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0-g_startTime; // seconds since the start of the program

function tick(){
  stats.begin();
  g_seconds = performance.now()/1000.0-g_startTime; // seconds since the start of the program
  console.log(performance.now());

  updateAnimationAngles();
  renderAllShapes(); // Draw the shapes
  stats.end();
  requestAnimationFrame(tick); // Request that the browser calls tick

}


var g_shapesList = []; // The array for the position of a mouse press
// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = []; // Default size is 10.0


function setupMouseCamera() {
  canvas.onmousedown = function (ev) {
    g_isDragging = true;
    g_lastX = ev.clientX;
    g_lastY = ev.clientY;
  };

  canvas.onmousemove = function (ev) {
    if (!g_isDragging) return;
    const dx = ev.clientX - g_lastX;
    const dy = ev.clientY - g_lastY;
    g_lastX = ev.clientX;
    g_lastY = ev.clientY;

    const SENS = 0.5;
    g_camYaw   += dx * SENS;
    g_camPitch += dy * SENS;
    g_camPitch = Math.max(-89, Math.min(89, g_camPitch));

    renderAllShapes();
  };

  canvas.onmouseup     =
  canvas.onmouseleave  = () => (g_isDragging = false);

  canvas.onwheel = (ev) => {
    g_zoom *= ev.deltaY > 0 ? 1.05 : 0.95;
    renderAllShapes();
    ev.preventDefault();
  };
}

//Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return [x, y];
}

//Update the angles of everything if currently animated
function updateAnimationAngles(){
  if(g_armAnimation){
    g_globalArmAngle = 80 * Math.abs(Math.sin(g_seconds));
  }

  if(g_lowerArmAnimation){
    g_lowerArmAngle = 90 * Math.abs(Math.sin(g_seconds));
  }
  if(g_headAnimation){
    g_globalHeadAngle = 60 * Math.sin(g_seconds);
  }

  if (g_legAnimation) {
    const D = 0.08;           // stride distance (tweak)
    const w = 2 * Math.PI;    // one full step per second
    g_legStride = D * Math.sin(w * g_seconds);
  }

  if (g_pokeAnimation) {
    const t = g_seconds - g_pokeStart;       // elapsed time (s)

    /* whatever motion you like – example: head nod */
    g_globalHeadAngle = 30 * Math.sin(6 * Math.PI * t);

    // phases: 0–0.5 lift & open  |  0.5–4.5 hold  |  4.5–5.0 close
    let k;        // interpolation 0 → 1

    if (t < 0.5) {               // ease in
      k = t / 0.5;               // 0 → 1
    } else if (t < 4.5) {        // hold
      k = 1;
    } else if (t < 5) {          // ease out
      k = 1 - (t - 4.5) / 0.5;   // 1 → 0
    } else {                     // done
      g_pokeAnimation = false;
      k = 0;
    }

    /* blend between rest and target pose */
    g_globalArmAngle = RAISE_UPPER_ARM * k;
    g_lowerArmAngle  = RAISE_LOWER_ARM * k;
    g_beakLowerY     = BEAK_CLOSED_Y  + (BEAK_OPEN_Y - BEAK_CLOSED_Y) * k;
  }
}


//Draw every shape that is supposed to be in the canvas
function renderAllShapes(){

  var startTime = performance.now(); // Start time

  // var u_GlobalRotateMat = new Matrix4().rotate(g_globalAngle,0,1,0); // Create a matrix object
  var u_GlobalRotateMat = new Matrix4();
  u_GlobalRotateMat.rotate(g_camYaw,   0, 1, 0);   // yaw around Y
  u_GlobalRotateMat.rotate(g_camPitch, 1, 0, 0);   // pitch around X
  u_GlobalRotateMat.scale(g_zoom, g_zoom, g_zoom); // wheel zoom
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, u_GlobalRotateMat.elements); // Pass the matrix to u_GlobalRotateMatrix attribute

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //Head
  var head = new Cube();
  head.color = [0.0, 0.0, 0.0, 1.0]; // Red color
  head.matrix.setTranslate(-0.19, .5, .05);
  head.matrix.translate(0.2, 0, 0.2);           // ½ width, ½ depth (move origin to centre)
  head.matrix.rotate(g_globalHeadAngle, 0, 1, 0); // yaw at neck centre
  var headFrame = new Matrix4(head.matrix);
  head.matrix.translate(-0.2, 0, -0.2);         // move origin back to corner
  
  head.matrix.scale(0.4, 0.35, 0.4);
  head.render();

  //beak upper part
  var beakUpper = new Cube();
  beakUpper.color = [1.0, 0.5, 0.0, 1.0]; // Orange color
  beakUpper.matrix = new Matrix4(headFrame);
  beakUpper.matrix.translate(-0.07, .08, -.3);
  beakUpper.matrix.scale(0.14, 0.045,0.2);
  beakUpper.render();


  //TONUGE
  var beakUpper = new Cube();
  beakUpper.color = [1.0, 0, 0.0, 1.0]; // Orange color
  beakUpper.matrix = new Matrix4(headFrame);
  beakUpper.matrix.translate(-0.06, .06, -.25);
  beakUpper.matrix.scale(0.11, 0.045,0.2);
  beakUpper.render();

  //beak lower part
  var beakLower = new Cube();
  beakLower.color = [1.0, 0.5, 0.0, .97]; // Orange color
  beakLower.matrix = new Matrix4(headFrame);
  beakLower.matrix.translate(-0.07, g_beakLowerY, -.3);
  beakLower.matrix.scale(0.14, 0.045, 0.2);
  beakLower.render();

  //left eye
  var leftEye = new Cube();
  leftEye.color = [1.0, 1.0, 1.0, 1.0]; // white color
  leftEye.matrix = new Matrix4(headFrame);
  leftEye.matrix.translate(-0.13, .2, -.22);
  var leftEyeFrame = new Matrix4(leftEye.matrix);
  leftEye.matrix.scale(0.1, 0.1, 0.1);
  leftEye.render();

  //pupil left eye
  var leftEyePupil = new Cube();
  leftEyePupil.color = [0.0, 0.0, 0.0, 1.0]; // black color
  leftEyePupil.matrix = leftEyeFrame;
  leftEyePupil.matrix.translate(.02, .02, -.0011);
  leftEyePupil.matrix.scale(0.05, 0.06, 0.1);
  leftEyePupil.render();

  //right eye
  var rightEye = new Cube();
  rightEye.color = [1.0, 1.0, 1.0, 1.0]; // white color
  rightEye.matrix = new Matrix4(headFrame);
  rightEye.matrix.translate(.04, .2, -.22);
  var rightEyeFrame = new Matrix4(rightEye.matrix);
  rightEye.matrix.scale(0.1, 0.1, 0.1);
  rightEye.render();

  //pupil right eye
  var rightPupil = new Cube();
  rightPupil.color = [0.0, 0.0, 0.0, 1.0]; // black color
  rightPupil.matrix = rightEyeFrame;
  rightPupil.matrix.translate(.02, .02, -.0011);
  rightPupil.matrix.scale(0.05, 0.06, 0.1);
  rightPupil.render();


  //draw  cube
  var body = new Cube();
  body.color = [0.0, 0.0, 0.0, 1.0]; // Red color
  body.matrix.setTranslate(-0.25, -0.5, 0.0); // Translate the cube to the right
  body.matrix.scale(0.5, 1, .5); // Rotate the cube by 45 degrees around the z-axis
  body.render();

//white part of the body
  var whiteBelly = new Cube();
  whiteBelly.color = [1.0, 1.0, 1.0, 1.0]; // Red color
  whiteBelly.matrix.setTranslate(-0.16, -0.44, -.01); // Translate the cube to the right
  //front.matrix.scale(0.5, 1, .5); // Rotate the cube by 45 degrees around the z-axis
  whiteBelly.matrix.scale(0.33, 0.9, 0.5);
  whiteBelly.render();

  //yellow part of the body
  var yellowPart = new Cube();
  yellowPart.color = [1.0, 1.0, 0.8, 1.0]; // Red color
  yellowPart.matrix.setTranslate(-0.16, .301, -.011); // Translate the cube to the right
  yellowPart.matrix.scale(0.33, 0.2, 0.5);
  yellowPart.render();

  // constants so it’s easy to tweak
  const ARM_LEN   = 0.30;   // final height
  const ARM_THICK = 0.09;   // final width
  const t = g_seconds;           // or however you update time
  const armAngle = -80 * Math.abs(Math.sin(t));
  // ------------- LEFT WING, pivot at the shoulder -------------
  var leftArm = new Cube();
  leftArm.color = [0, 0, 0, 1];
  leftArm.matrix.setTranslate(.25, .45, .5);
  leftArm.matrix.rotate(180, 180, 0, 1);          // flip so it points left

  leftArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);
  // if(g_armAnimation){
  //   leftArm.matrix.rotate(armAngle,0,0,1);
  // }else{
  //   leftArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);
  // }

  // *** copy the matrix NOW (before we scale!) ***
  var elbowFrame = new Matrix4(leftArm.matrix);

  leftArm.matrix.scale(ARM_THICK, ARM_LEN, 0.5);
  leftArm.render();

  //white under arm
  var wleftArm = new Cube();
  wleftArm.color = [1, 1, 1, 1];
  wleftArm.matrix.setTranslate(.24, .45, .4);
  wleftArm.matrix.rotate(180, 180, 0, 1);          // flip so it points left

  wleftArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);

  // *** copy the matrix NOW (before we scale!) ***
  wleftArm.matrix.scale(.09, ARM_LEN, 0.25);
  wleftArm.render();

  // ── LOWER ARM ──────────────────────────────────────────────
  var lowLeftArm = new Cube();
  lowLeftArm.color = [0, 0, 0, 1];               // use black later
  lowLeftArm.matrix = new Matrix4(elbowFrame);   // start at the shoulder

  //put the cube’s **top-centre** at the elbow
  lowLeftArm.matrix.translate( ARM_THICK * 0.5, ARM_LEN, 0 );

  // rotate around that top-centre
  lowLeftArm.matrix.rotate( g_lowerArmAngle, 0, 0, 1 );

  // move the origin back to the corner
  lowLeftArm.matrix.translate( -ARM_THICK * 0.5, 0, 0 );

  //stretch the cube into a fore-arm
  lowLeftArm.matrix.scale( ARM_THICK, ARM_LEN, 0.5 );

  lowLeftArm.render();  
   
  var wlowLeftArm = new Cube();
  wlowLeftArm.color = [1, 1, 1, 1];               // use black later
  wlowLeftArm.matrix = new Matrix4(elbowFrame);   // start at the shoulder

  //put the cube’s **top-centre** at the elbow
  wlowLeftArm.matrix.translate( ARM_THICK * 0.5, ARM_LEN, 0 );

  // rotate around that top-centre
  wlowLeftArm.matrix.rotate( g_lowerArmAngle, 0, 0, 1 );

  // move the origin back to the corner
  wlowLeftArm.matrix.translate( -ARM_THICK * 0.5, 0, 0 );

  //stretch the cube into a fore-arm
  wlowLeftArm.matrix.scale( ARM_THICK, ARM_LEN, 0.15 );
  wlowLeftArm.matrix.translate(-.1, -.02, 1.0);

  wlowLeftArm.render();   


  //right arm
  var rightArm = new Cube();
  rightArm.color = [0.0, 0.0, 0.0, 1.0]; // Same black color
  rightArm.matrix.setTranslate( -0.25, .45, 0);
  rightArm.matrix.rotate(180, 0, 0, 1);


  rightArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);
  
  
  var rightElbowFrame = new Matrix4(rightArm.matrix);
  rightArm.matrix.scale(ARM_THICK,  ARM_LEN, 0.5); // Same scale
  rightArm.render();


  //white upper arm
  var wRightArm = new Cube();
  wRightArm.color = [1.0, 1.0, 1.0, 1.0]; // Same black color
  wRightArm.matrix.setTranslate( -.24, .45, .15);
  wRightArm.matrix.rotate(180, 0, 0, 1);


  wRightArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);
  
  wRightArm.matrix.scale(.09, ARM_LEN, 0.25); // Same scale
  wRightArm.render();

  //lower right arm
  var lowRightArm = new Cube();
  lowRightArm.color = [0.0, 0.0, 0.0, 1.0]; // Same black color
  lowRightArm.matrix = new Matrix4(rightElbowFrame); // start at the shoulder

  //put the cube’s **top-centre** at the elbow
  lowRightArm.matrix.translate( ARM_THICK * 0.5, ARM_LEN, 0 );

  // rotate around that top-centre
  lowRightArm.matrix.rotate(g_lowerArmAngle, 0, 0, 1 );

  // move the origin back to the corner
  lowRightArm.matrix.translate( -ARM_THICK * 0.5, 0, 0 );

  //stretch the cube into a fore-arm
  lowRightArm.matrix.scale( ARM_THICK, ARM_LEN, 0.5 );
  lowRightArm.render();

//white lower right arm
  //lower right arm
  var wLowRightArm = new Cube();
  wLowRightArm.color = [1.0, 1.0, 1.0, 1.0]; // Same black color
  wLowRightArm.matrix = new Matrix4(rightElbowFrame); // start at the shoulder

  //put the cube’s **top-centre** at the elbow
  wLowRightArm.matrix.translate( ARM_THICK * 0.5, ARM_LEN, 0 );

  // rotate around that top-centre
  wLowRightArm.matrix.rotate(g_lowerArmAngle, 0, 0, 1 );

  // move the origin back to the corner
  wLowRightArm.matrix.translate( -ARM_THICK * 0.5, 0, 0 );

  //stretch the cube into a fore-arm
  wLowRightArm.matrix.scale( ARM_THICK, ARM_LEN, 0.15 );
  wLowRightArm.matrix.translate(-.1, -.03, 1.2);
  wLowRightArm.render();



  //right foot
  var rightFoot = new Cube();
  rightFoot.color = [1.0, 0.5, 0.0, 1.0]; // Orange color
  rightFoot.matrix.setTranslate(.03, -.57, -.08);
  rightFoot.matrix.rotate(5, 0, 1, 0 );
  rightFoot.matrix.translate(0, 0,  g_legStride);
  rightFoot.matrix.scale(0.14, 0.07, 0.5);
  rightFoot.render();


  //left foot
    var leftFoot = new Cube();
    leftFoot.color = [1.0, 0.5, 0.0, 1.0]; // Orange color
    leftFoot.matrix.setTranslate(-.18, -.57, -.08);
    leftFoot.matrix.rotate(-5, 0, 1, 0 );
    leftFoot.matrix.translate(0, 0, -g_legStride); 
    leftFoot.matrix.scale(0.14, 0.07, 0.5);
    leftFoot.render();


    //Left Shoulder
    const leftShoulder = new Cylinder();
    leftShoulder.color  = [0, 0, 0, 1];
    leftShoulder.matrix.setTranslate(-0.28, .478, -0.01);
    leftShoulder.matrix.rotate(90, 1, 0, 0 );
    leftShoulder.matrix.scale(0.13, .5, 0.13);   // stretch height & radius
    leftShoulder.render();

    //right Shoulder
    const rightShoulder = new Cylinder();
    rightShoulder.color  = [0, 0, 0, 1];
    rightShoulder.matrix.setTranslate(0.28, .478, -0.01);
    rightShoulder.matrix.rotate(90, 1, 0, 0 );
    rightShoulder.matrix.scale(0.13, .5, 0.13);   // stretch height & radius
    rightShoulder.render();

    //left elbow  cylinder
    const leftElbow = new Cylinder();
    leftElbow.color  = [0, 0, 0, 1];
    leftElbow.matrix = new Matrix4(elbowFrame); // start at the shoulder
    // 2. move origin to the elbow (top-centre of upper arm)
    leftElbow.matrix.translate(ARM_THICK * 0.5, ARM_LEN, 0);

    // 3. follow the fore-arm rotation so the disc stays between the two parts
    leftElbow.matrix.rotate(g_lowerArmAngle, 0, 0, 1);

    // 4. turn cylinder sideways → disc
    leftElbow.matrix.rotate(90, 1, 0, 0);

    // 5. make it small and thin  (radius ≈ ARM_THICK, height very small)
    leftElbow.matrix.scale(.1, .51, .1);
        leftElbow.render();

    //right elbow  cylinder
    const rightElbow = new Cylinder();
    rightElbow.color  = [0, 0, 0, 1];
    rightElbow.matrix = new Matrix4(rightElbowFrame); // start at the shoulder
    rightElbow.matrix.translate(ARM_THICK * 0.5, ARM_LEN, 0);
    rightElbow.matrix.rotate(g_lowerArmAngle, 0, 0, 1); // rotate around that top-centre
    // 4. turn cylinder sideways → disc
    rightElbow.matrix.rotate(90, 1, 0, 0);

    // 5. make it small and thin  (radius ≈ ARM_THICK, height very small)
    rightElbow.matrix.scale(.1, .50, .1);

    rightElbow.render();

  
  var duration = performance.now() - startTime; // End time
  console.log("Render time: " + duration + " ms"); // Log the render time

}