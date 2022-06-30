# assimpjs

The [emscripten](https://emscripten.org) interface for the [assimp](https://github.com/assimp/assimp) library. It runs entirely in the browser, and allows you to import 40+ 3D file formats and access the result in JSON or glTF format. This is not a full port of assimp, but an easy to use interface to access it's functionality.

## How to install?

You can get assimpjs from [npm](https://www.npmjs.com/package/assimpjs):

```
npm install assimpjs
```

## How to use?

The library runs in the browser and as a node.js module as well.

You will need two files from the `dist` folder: `assimpjs.js` and `assimpjs.wasm`. The wasm file is loaded runtime by the js file.

Given that browsers don't access the file system, you should provide all the files needed for import. Some 3D formats are coming in multiple files, so you should list all of them to import the model properly.

You should provide two things for every file:

- **name:** The name of the file. It's used if files are referring to each other.
- **content:** The content of the file as an `Uint8Array` object.

The supported target formats are: `assjson`, `gltf`, `gltf2`, `glb`, and `glb2`. The number of result files depends on the format.

### Use from the browser

First, include the `assimpjs.js` file in your website.

```html
<script type="text/javascript" src="assimpjs.js"></script>
```

After that, download the model files, and pass them to assimpjs.

```js
assimpjs().then(function (ajs) {
  // fetch the files to import
  let files = [
    "testfiles/cube_with_materials.obj",
    "testfiles/cube_with_materials.mtl",
  ];
  Promise.all(files.map((file) => fetch(file)))
    .then((responses) => {
      return Promise.all(responses.map((res) => res.arrayBuffer()));
    })
    .then((arrayBuffers) => {
      // create new file list object, and add the files
      let fileList = new ajs.FileList();
      for (let i = 0; i < files.length; i++) {
        fileList.AddFile(files[i], new Uint8Array(arrayBuffers[i]));
      }

      // convert file list to assimp json
      let result = ajs.ConvertFileList(fileList, "assjson");

      // check if the conversion succeeded
      if (!result.IsSuccess() || result.FileCount() == 0) {
        resultDiv.innerHTML = result.GetErrorCode();
        return;
      }

      // get the result file, and convert to string
      let resultFile = result.GetFile(0);
      let jsonContent = new TextDecoder().decode(resultFile.GetContent());

      // parse the result json
      let resultJson = JSON.parse(jsonContent);

      resultDiv.innerHTML = JSON.stringify(resultJson, null, 4);
    });
});
```

### Use as a node.js module

You should require the `assimpjs` module in your script. In node.js you can use the file system module to get the buffer of each file.

```js
let fs = require("fs");
const assimpjs = require("assimpjs")();

assimpjs.then((ajs) => {
  // create new file list object
  let fileList = new ajs.FileList();

  // add model files
  fileList.AddFile(
    "cube_with_materials.obj",
    fs.readFileSync("testfiles/cube_with_materials.obj")
  );
  fileList.AddFile(
    "cube_with_materials.mtl",
    fs.readFileSync("testfiles/cube_with_materials.mtl")
  );

  // convert file list to assimp json
  let result = ajs.ConvertFileList(fileList, "assjson");

  // check if the conversion succeeded
  if (!result.IsSuccess() || result.FileCount() == 0) {
    console.log(result.GetErrorCode());
    return;
  }

  // get the result file, and convert to string
  let resultFile = result.GetFile(0);
  let jsonContent = new TextDecoder().decode(resultFile.GetContent());

  // parse the result json
  let resultJson = JSON.parse(jsonContent);
});
```

It's also possible to delay load the required files so they have to be loaded only when the importer needs them. In this case you have to provide only the name and content of the main file, and implement callbacks to provide additional files.

```js
let fs = require("fs");
const assimpjs = require("assimpjs")();

assimpjs.then((ajs) => {
  // convert model
  let result = ajs.ConvertFile(
    // file name
    "cube_with_materials.obj",
    // file format
    "assjson",
    // file content as arraybuffer
    fs.readFileSync("testfiles/cube_with_materials.obj"),
    // check if file exists by name
    function (fileName) {
      return fs.existsSync("testfiles/" + fileName);
    },
    // get file content as arraybuffer by name
    function (fileName) {
      return fs.readFileSync("testfiles/" + fileName);
    }
  );

  // check if the conversion succeeded
  if (!result.IsSuccess() || result.FileCount() == 0) {
    console.log(result.GetErrorCode());
    return;
  }

  // get the result file, and convert to string
  let resultFile = result.GetFile(0);
  let jsonContent = new TextDecoder().decode(resultFile.GetContent());

  // parse the result json
  let resultJson = JSON.parse(jsonContent);
});
```

## How to build on Windows?

A set of batch scripts are prepared for building on Windows.

### 1. Install Prerequisites

Install [CMake](https://cmake.org) (3.6 minimum version is needed). Make sure that the cmake executable is in the PATH.

### 2. Install Emscripten SDK

Run the Emscripten setup script.

```
tools\setup_emscripten_win.bat
```

### 3. Compile the WASM library

Run the release build script.

```
tools\build_wasm_win_release.bat
```

### 4. Build the native project (optional)

If you want to debug the code, it's useful to build a native project. To do that, just use cmake to generate the project of your choice.

## How to run locally?

To run the demo and the examples locally, you have to start a web server. Run `npm install` from the root directory, then run `npm start` and visit `http://localhost:8080`.
