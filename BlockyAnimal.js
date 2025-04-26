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


//Global variables related to UI Elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]; // Default color is white
let g_selectedSize = 5; // Default size is 10.0
let g_selectedType = POINT; // Default type is point
let g_globalAngle = 0; // Default angle is 0
let g_globalArmAngle = 0; // Default arm angle is 0

function addActionForHtmlElement() {

  //Camera Angle Slider
  document.getElementById('angleSlide').addEventListener('mousemove', function() {
    g_globalAngle = this.value; // Get the value of the slider
    //console.log(g_globalAngle);
    renderAllShapes(); // Redraw the shapes with the new angle
  });

  //Arm Rotation Slider
  document.getElementById('leftArmAngle').addEventListener('mousemove', function() {
    g_globalArmAngle= this.value; // Get the value of the slider
    //console.log(g_triangleRotation);
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

  renderAllShapes();
}



var g_shapesList = []; // The array for the position of a mouse press
// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = []; // Default size is 10.0

function click(ev) {
  //Extract the event click and return it in WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev); 


  let point;
  if(g_selectedType == POINT){
    point = new Point(); // Create a point object
  }else if(g_selectedType == TRIANGLE){
    point = new Triangle(); // Create a triangle object
    point.rotation = g_triangleRotation;
  }else if(g_selectedType == CIRCLE){
    point = new Circle(); // Create a circle object
    point.segments = g_selectedSegments; // Set the number of segments for the circle
  }
  point.position=[x, y];
  point.color = g_selectedColor.slice(); 
  point.size = g_selectedSize; 
  g_shapesList.push(point); 

  // Store the coordinates to g_points array
  // g_points.push([x, y]);


  // g_colors.push(g_selectedColor.slice()); // Store the color to g_colors array

  // g_sizes.push(g_selectedSize); // Store the size to g_size array

  // Store the coordinates to g_points array
  /*
  if (x >= 0.0 && y >= 0.0) {      // First quadrant
    g_colors.push([1.0, 0.0, 0.0, 1.0]);  // Red
  } else if (x < 0.0 && y < 0.0) { // Third quadrant
    g_colors.push([0.0, 1.0, 0.0, 1.0]);  // Green
  } else {                         // Others
    g_colors.push([1.0, 1.0, 1.0, 1.0]);  // White
  }*/


  //Draw every shape that is supposed to be in the canvas
  renderAllShapes(); 
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

//Draw every shape that is supposed to be in the canvas
function renderAllShapes(){

  var startTime = performance.now(); // Start time

  var u_GlobalRotateMat = new Matrix4().rotate(g_globalAngle,0,1,0); // Create a matrix object
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, u_GlobalRotateMat.elements); // Pass the matrix to u_GlobalRotateMatrix attribute

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//Head
  var head = new Cube();
  head.color = [0.0, 0.0, 0.0, 1.0]; // Red color
  head.matrix.setTranslate(-0.19, .5, .05);
  head.matrix.scale(0.4, 0.35, 0.4);
  head.render();

  //beak upper part
  var beakUpper = new Cube();
  beakUpper.color = [1.0, 0.5, 0.0, 1.0]; // Orange color
  beakUpper.matrix.setTranslate(-0.07, .59, -.08);
  beakUpper.matrix.scale(0.14, 0.045,0.2);
  beakUpper.render();

  //beak lower part
  var beakLower = new Cube();
  beakLower.color = [1.0, 0.5, 0.0, .97]; // Orange color
  beakLower.matrix.setTranslate(-0.07, .55, -.08);
  beakLower.matrix.scale(0.14, 0.045, 0.2);
  beakLower.render();

  //left eye
  var leftEye = new Cube();
  leftEye.color = [1.0, 1.0, 1.0, 1.0]; // white color
  leftEye.matrix.setTranslate(-0.13, .7, .01);
  leftEye.matrix.scale(0.1, 0.1, 0.1);
  leftEye.render();
//testing
  // var leftEye = new Cube();
  // leftEye.color = [1.0, 1.0, 1.0, 1.0]; // white color
  // leftEye.matrix.setTranslate(-0.14, .5, .001);
  // leftEye.matrix.scale(0.3, 0.3, 0.1);
  // leftEye.render();

  //pupil left eye
  var leftEyePupil = new Cube();
  leftEyePupil.color = [0.0, 0.0, 0.0, 1.0]; // black color
  leftEyePupil.matrix.setTranslate(-0.101, .72, -.0011);
  leftEyePupil.matrix.scale(0.05, 0.06, 0.1);
  leftEyePupil.render();

  //right eye
  var rightEye = new Cube();
  rightEye.color = [1.0, 1.0, 1.0, 1.0]; // white color
  rightEye.matrix.setTranslate(.05, .7, -.001);
  rightEye.matrix.scale(0.1, 0.1, 0.1);
  rightEye.render();

  //pupil right eye
  var rightPupil = new Cube();
  rightPupil.color = [0.0, 0.0, 0.0, 1.0]; // black color
  rightPupil.matrix.setTranslate(.075, .72, -.0011);
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
  yellowPart.matrix.setTranslate(-0.16, .3, -.011); // Translate the cube to the right
  yellowPart.matrix.scale(0.33, 0.2, 0.5);
  yellowPart.render();

// constants so it’s easy to tweak
const ARM_LEN   = 0.70;   // final height
const ARM_THICK = 0.07;   // final width

// ------------- LEFT WING, pivot at the shoulder -------------
var leftArm = new Cube();
leftArm.color = [0.0, 0.0, 0.0, 1.0]; // Same black color
leftArm.matrix.setTranslate( .25, .45, .5);
leftArm.matrix.rotate(180, 180, 0, 1);
leftArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);
leftArm.matrix.scale(ARM_THICK,  ARM_LEN, 0.5); // Same scale
leftArm.render();

  //right arm
  var rightArm = new Cube();
  rightArm.color = [0.0, 0.0, 0.0, 1.0]; // Same black color
  rightArm.matrix.setTranslate( -0.25, .45, 0);
  rightArm.matrix.rotate(180, 0, 0, 1);
  rightArm.matrix.rotate(-g_globalArmAngle, 0, 0, 1);
  rightArm.matrix.scale(ARM_THICK,  ARM_LEN, 0.5); // Same scale
  rightArm.render();

  //right foot
  var rightFoot = new Cube();
  rightFoot.color = [1.0, 0.5, 0.0, 1.0]; // Orange color
  rightFoot.matrix.setTranslate(.09, -.55, -.08);
  rightFoot.matrix.scale(0.14, 0.07,0.5);
  rightFoot.render();


  //left foot
    var leftFoot = new Cube();
    leftFoot.color = [1.0, 0.5, 0.0, 1.0]; // Orange color
    leftFoot.matrix.setTranslate(-.23, -.55, -.08);
    leftFoot.matrix.scale(0.14, 0.07,0.5);
    leftFoot.render();
  // var testCube = new Cube();
  // testCube.matrix.setTranslate(-0.7, 0.0, 0.0);
  // testCube.matrix.rotate(45, 0, 25, 1);
  // testCube.matrix.scale(0.2, .2, .2);
  
  // testCube.render();
  
  
  var duration = performance.now() - startTime; // End time
  console.log("Render time: " + duration + " ms"); // Log the render time

}