const StlThumbnailer = require('../index');
const fs = require('fs');

const thumbnail = new StlThumbnailer({
  filePath: __dirname + "/input.stl",
  requestThumbnails: [
    {
      width: 500,
      height: 500,
      cameraAngle: [10, 50, 100],       // optional: specify the angle of the view for thumbnailing. This is the camera's position vector, the opposite of the direction the camera is looking.
      showMinorEdges: true,             // optional: show all edges lightly, even ones on ~flat faces
      metallicOpacity: 0.2,               // optional: some models, particularly those with non-flat surfaces or very high-poly models will look good with this environment map
      enhanceMajorEdges: true,          // optional: major edges will appear more boldly than minor edges
      shadeNormalsOpacity: 0.4,         // optional: faces will be shaded lightly by their normal direction
      backgroundColor: 0xffffff,        // optional: background color (RGB) for the rendered image
      baseOpacity: 0.7,                 // optional: translucency of the base material that lets you see through it
      baseColor: 0x3097d1,              // optional: base color
      baseLineweight: 0.1,              // optional: lineweights will scale to image size, but this serves as a base for that scaling. Larger numbers = heavier lineweights
      lineColor: 0x287dad
    }
  ]
})
  .then(function (thumbnails) {
    // thumbnails is an array (in matching order to your requests) of Canvas objects
    // you can write them to disk, return them to web users, etc
    // see node-canvas documentation at https://github.com/Automattic/node-canvas
    thumbnails[0].toBuffer(function (err, buf) {
      fs.writeFileSync(__dirname + "/output.png", buf);
    })
  })