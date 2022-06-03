AxisWidget = function (sourceCamera) {
  this.sourceCamera = sourceCamera;
  this.camera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 1000);
  this.camera.up = this.sourceCamera.up;

  this.container = document.createElement('div');
  document.body.appendChild(this.container);
  this.container.id = 'axes';
  this.styleContainer();
  this.visible = true;

  this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  this.renderer.setClearAlpha(0);
  this.renderer.setSize(100, 100);
  this.container.appendChild(this.renderer.domElement);
  this.scene = new THREE.Scene();

  this.cameraLight = new THREE.PointLight(0xffffff, 1);
  this.scene.add(this.cameraLight);
  this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));

  this.size = 26;
  var cubeGeo = new THREE.BoxGeometry(this.size, this.size, this.size);
  var cubeMat = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, shininess: 10 });
  var cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
  this.scene.add(cubeMesh);

  var _this = this;
  var fontLoader = new THREE.FontLoader();
  fontLoader.load('./js/helvetiker_regular.typeface.json', function (font) {
    var params = {
      font: font,
      size: 7,
      height: 1,
    };
    var dist = _this.size / 2 + 1;
    var geos = [
      new THREE.TextGeometry('x', params),
      new THREE.TextGeometry('-x', params),
      new THREE.TextGeometry('y', params),
      new THREE.TextGeometry('-y', params),
      new THREE.TextGeometry('z', params),
      new THREE.TextGeometry('-z', params),
    ];
    geos[0].rotateX(Math.PI / 2);
    geos[0].rotateZ(Math.PI / 2);
    geos[0].translate(-dist, -2, -2);
    geos[1].rotateX(Math.PI / 2);
    geos[1].rotateZ(Math.PI / 2);
    geos[1].translate(dist, -4, -2);
    geos[2].rotateX(Math.PI / 2);
    geos[2].translate(-2, -dist, -2);
    geos[3].rotateX(Math.PI / 2);
    geos[3].rotateZ(Math.PI);
    geos[3].translate(4, dist, -2);
    geos[4].translate(-2, -2, dist);
    geos[5].rotateY(Math.PI);
    geos[5].translate(4, -2, -dist);
    mats = [
      new THREE.MeshPhongMaterial({ color: 0xff3333, shininess: 0 }),
      new THREE.MeshPhongMaterial({ color: 0x337733, shininess: 0 }),
      new THREE.MeshPhongMaterial({ color: 0x3333ff, shininess: 0 }),
    ];
    meshes = [
      new THREE.Mesh(geos[0], mats[0]),
      new THREE.Mesh(geos[1], mats[0]),
      new THREE.Mesh(geos[2], mats[1]),
      new THREE.Mesh(geos[3], mats[1]),
      new THREE.Mesh(geos[4], mats[2]),
      new THREE.Mesh(geos[5], mats[2]),
    ];
    for (var i = 0; i < meshes.length; i++) {
      _this.scene.add(meshes[i]);
    }
  });

  this.origin = new THREE.Vector3(0, 0, 0);
};

AxisWidget.prototype.toggleVisibility = function () {
  this.visible = !this.visible;
  if (this.scene) this.scene.visible = this.visible;
};

AxisWidget.prototype.update = function () {
  var camPos = new THREE.Vector3();
  this.sourceCamera.getWorldDirection(camPos);
  var up = this.camera.up.clone();
  // reflect camera position along camera up axis
  camPos.sub(up.multiplyScalar(2 * camPos.dot(up)));
  this.camera.position.copy(camPos);
  this.camera.position.setLength(this.size * 1.5);
  this.camera.lookAt(this.origin);
  this.cameraLight.position.copy(camPos).multiplyScalar(this.size * 1.2);
  this.renderer.render(this.scene, this.camera);
};

AxisWidget.prototype.styleContainer = function () {
  this.container.style.width = '100px';
  this.container.style.height = '100px';
  this.container.style.position = 'absolute';
  this.container.style.bottom = '15px';
  this.container.style.left = '15px';
  this.container.style.backgroundColor = 'transparent';
  this.container.style.pointerEvents = 'none';
};
