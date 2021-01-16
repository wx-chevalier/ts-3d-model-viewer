const viewer = document.getElementById("viewer");

function loadStl() {
  // 抓取远端数据并且加载
  var loader = new THREE.STLLoader();
  loader.load(
    "https://ufc-assets.oss-cn-shanghai.aliyuncs.com/test/pr2_head_pan.stl",
    geometry => {
      var material = new THREE.MeshStandardMaterial();
      var object = new THREE.Mesh(geometry, material);
      var exporter = new THREE.GLTFExporter();
      exporter.parse(object, gltf => {
        console.log(gltf);
        viewer.src = createURL(gltf);
      });
    }
  );
}

viewer.addEventListener("dragover", event => {
  event.preventDefault();
});

viewer.addEventListener("drop", event => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  const filename = file.name.toLowerCase();
  if (filename.match(/\.(gltf|glb)$/)) {
    viewer.src = URL.createObjectURL(file);
  } else if (filename.match(/\.(obj)$/)) {
    var loader = new THREE.OBJLoader();
    loader.load(URL.createObjectURL(file), object => {
      var exporter = new THREE.GLTFExporter();
      exporter.parse(object, gltf => {
        viewer.src = createURL(gltf);
      });
    });
  } else if (filename.match(/\.(ply)$/)) {
    var loader = new THREE.PLYLoader();
    loader.load(URL.createObjectURL(file), geometry => {
      console.log(geometry);
      var material = new THREE.MeshStandardMaterial();
      var object = new THREE.Mesh(geometry, material);
      var exporter = new THREE.GLTFExporter();
      exporter.parse(object, gltf => {
        viewer.src = createURL(gltf);
      });
    });
  } else if (filename.match(/\.(stl)$/)) {
    var loader = new THREE.STLLoader();
    loader.load(URL.createObjectURL(file), geometry => {
      var material = new THREE.MeshStandardMaterial();
      var object = new THREE.Mesh(geometry, material);
      var exporter = new THREE.GLTFExporter();
      exporter.parse(object, gltf => {
        console.log(gltf);
        viewer.src = createURL(gltf);
      });
    });
  }
});

function createURL(json) {
  var string = JSON.stringify(json);
  var blob = new Blob([string], { type: "text/plain" });
  return URL.createObjectURL(blob);
}

const downloadScreenshot = async () => {
  const modelViewer = document.querySelector("model-viewer");
  const blob = await modelViewer.toBlob({ idealAspect: true });
  const screenshotURL = URL.createObjectURL(blob);

  // From here, you can do anything you want with the URL
  // One example would be to open it in a new tab:
  window.open(screenshotURL);

  // An alternative example would be to make a download link for it:
  const a = document.createElement("a");
  a.download = "screenshot.png";
  a.href = screenshotURL;
  a.textContent = "Download screenshot";
  document.body.appendChild(a);
};
