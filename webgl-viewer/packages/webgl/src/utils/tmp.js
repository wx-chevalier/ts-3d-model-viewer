/**
 * Provides requestAnimationFrame in a cross browser way.
 * @author paulirish / http://paulirish.com/
 */

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (function () {
    return (
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (
        /* function FrameRequestCallback */ callback,
        /* DOMElement Element */ element,
      ) {
        window.setTimeout(callback, 1000 / 60);
      }
    );
  })();
}
var container, stats;

var camera, scene, renderer;

var cube, plane;

var targetRotationX = 0.5;
var targetRotationOnMouseDownX = 0;

var targetRotationY = 0.2;
var targetRotationOnMouseDownY = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;

var mouseY = 0;
var mouseYOnMouseDown = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var slowingFactor = 0.25;

init();
animate();

function init() {
  container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  camera.position.y = 150;
  camera.position.z = 500;
  scene.add(camera);

  var materials = [];

  for (var i = 0; i < 6; i++) {
    materials.push(
      new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff }),
    );
  }

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(200, 200, 200),
    new THREE.MeshFaceMaterial(materials),
  );
  cube.position.y = 150;
  cube.overdraw = true;
  scene.add(cube);

  plane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: 0xe0e0e0 }),
  );
  plane.rotation.x = -90 * (Math.PI / 180);
  plane.overdraw = true;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  container.appendChild(stats.domElement);

  document.addEventListener('mousedown', onDocumentMouseDown, false);
}

function onDocumentMouseDown(event) {
  event.preventDefault();

  document.addEventListener('mousemove', onDocumentMouseMove, false);
  document.addEventListener('mouseup', onDocumentMouseUp, false);
  document.addEventListener('mouseout', onDocumentMouseOut, false);

  mouseXOnMouseDown = event.clientX - windowHalfX;
  targetRotationOnMouseDownX = targetRotationX;

  mouseYOnMouseDown = event.clientY - windowHalfY;
  targetRotationOnMouseDownY = targetRotationY;
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;

  targetRotationX = (mouseX - mouseXOnMouseDown) * 0.00025;

  mouseY = event.clientY - windowHalfY;

  targetRotationY = (mouseY - mouseYOnMouseDown) * 0.00025;
}

function onDocumentMouseUp(event) {
  document.removeEventListener('mousemove', onDocumentMouseMove, false);
  document.removeEventListener('mouseup', onDocumentMouseUp, false);
  document.removeEventListener('mouseout', onDocumentMouseOut, false);
}

function onDocumentMouseOut(event) {
  document.removeEventListener('mousemove', onDocumentMouseMove, false);
  document.removeEventListener('mouseup', onDocumentMouseUp, false);
  document.removeEventListener('mouseout', onDocumentMouseOut, false);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  rotateAroundWorldAxis(cube, new THREE.Vector3(0, 1, 0), targetRotationX);
  rotateAroundWorldAxis(cube, new THREE.Vector3(1, 0, 0), targetRotationY);

  targetRotationY = targetRotationY * (1 - slowingFactor);
  targetRotationX = targetRotationX * (1 - slowingFactor);
  renderer.render(scene, camera);
}

function rotateAroundWorldAxis(object, axis, radians) {
  var rotationMatrix = new THREE.Matrix4();

  rotationMatrix.makeRotationAxis(axis.normalize(), radians);
  rotationMatrix.multiply(object.matrix); // pre-multiply
  object.matrix = rotationMatrix;
  object.rotation.setFromRotationMatrix(object.matrix);
}
