// Define the persistent global variables
var oc = null,
  externalShapes = {},
  sceneShapes = [],
  GUIState,
  fullShapeEdgeHashes = {},
  fullShapeFaceHashes = {},
  currentShape;

// Capture Logs and Errors and forward them to the main thread
let realConsoleLog = console.log;
let realConsoleError = console.error;
console.log = function (message) {
  setTimeout(() => {
    postMessage({ type: 'log', payload: message });
  }, 0);
  realConsoleLog.apply(console, arguments);
};

console.error = function (err, url, line, colno, errorObj) {
  postMessage({ type: 'resetWorking' });
  setTimeout(() => {
    err.message = 'INTERNAL OPENCASCADE ERROR DURING GENERATE: ' + err.message;
    throw err;
  }, 0);

  realConsoleError.apply(console, arguments);
};
// This is actually accessed via worker.onerror in the main thread

// Import the set of scripts we'll need to perform all the CAD operations
// importScripts(
//   '../../libs/three/build/three.min.js',
//   './CascadeStudioStandardLibrary.js',
//   './CascadeStudioShapeToMesh.js',
//   '../../libs/opencascade.js/dist/opencascade.wasm.js',
//   '../../libs/opentype.js/dist/opentype.min.js',
//   '../../libs/potpack/index.js',
// );
