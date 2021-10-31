# node-stl-to-thumbnail

```sh
for i in *.stl; do
  T=__tmp__$i
  b=`basename $i`
  echo import\(\"$i\"\)\; >$T
  /Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD -o $b.png --imgsize=100,100 $T
  rm $T
done
```

Create thumbnail from 3D STL file. Creates beautifully rendered png and jpeg output server-side with no GPU from ASCII and Binary STL's.

> This code is forked from [`node-stl-to-thumbnail`](https://www.npmjs.com/package/node-stl-to-thumbnail) by instructables but I cannot found it in Github anymore.

## Installation

`npm install --save node-stl-to-thumbnail`

## Usage

The following snippet loads a file from the current directory (`./input.stl`), and creates a 500x500 png thumbnail in the current directory called `./output.png`.

```javascript
var StlThumbnailer = require("node-stl-to-thumbnail");
var fs = require("fs");

var thumbnailer = new StlThumbnailer({
  filePath: __dirname + "/input.stl",
  requestThumbnails: [
    {
      width: 500,
      height: 500
    }
  ]
}).then(function(thumbnails) {
  // thumbnails is an array (in matching order to your requests) of Canvas objects
  // you can write them to disk, return them to web users, etc
  // see node-canvas documentation at https://github.com/Automattic/node-canvas
  thumbnails[0].toBuffer(function(err, buf) {
    fs.writeFileSync(__dirname + "/output.png", buf);
  });
});
```

## Help needed

To be honest, I am not fully understand this. Need help on:

1. Camera setting, so that can get view from any perspective I want
2. Render setting so that it look beautiful. If you see Three.js website the 3D item are so beautiful
3. Update to use latest JavaScript ( ES2015++ )

## Thanks/Credit

Thanks for Digital Data Sdn Bhd (currently working company) for supporting me and open source.
