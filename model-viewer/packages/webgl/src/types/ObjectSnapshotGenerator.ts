import {
  Box3,
  MathUtils,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Vector3,
  WebGLRenderer,
} from 'three';

export class ObjectSnapshotGenerator {
  box: Box3;
  size: { w: number; h: number };
  pos: { x: number; y: number };

  constructor(
    protected obj: Object3D,
    protected camera: PerspectiveCamera,
    protected renderer: WebGLRenderer,
    protected onDataUrl: (dataUrl: string) => void,
  ) {
    // this.box = new Box3().setFromObject(obj);
    // this.size = { w: 0, h: 0 };
    // this.pos = { x: 0, y: 0 };
    //
    // const distance = this.distance();
    //
    // this.size = this.getSizeInPixel(distance);
    // this.pos = this.getPositionInPixel();
    // this.getImage(this.size.w, this.size.h, this.pos.x, this.pos.y);
    this.getImage();
  }

  distance = () => {
    const size = new Vector3();
    this.box.getSize(size);
    return this.camera.position.z - this.obj.position.z - size.z / 2;
  };

  getSizeInPixel = (distance: number) => {
    const size = new Vector3();

    this.box.getSize(size);

    // Calc visible height and width
    // convert vertical fov to radians
    const vFOV = MathUtils.degToRad(this.camera.fov);
    // visible height
    let height = 2 * Math.tan(vFOV / 2) * Math.abs(distance);
    // Calc ratio between pixel and visible z-unit of threejs
    const ratio = this.renderer.domElement.height / height;

    height = size.y * ratio;
    const width =
      height *
      (this.renderer.domElement.width / this.renderer.domElement.height); // visible width

    return { w: width, h: height };
  };

  getPositionInPixel = () => {
    const vector = new Vector3();
    const viewProjectionMatrix = new Matrix4();
    const viewMatrix = new Matrix4();
    viewMatrix.copy(this.camera.matrixWorldInverse);

    viewProjectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      viewMatrix,
    );
    const widthHalf = 0.5 * this.renderer.domElement.width;
    const heightHalf = 0.5 * this.renderer.domElement.height;
    this.obj.updateMatrixWorld();
    vector.setFromMatrixPosition(this.obj.matrixWorld);

    vector.applyMatrix4(viewProjectionMatrix);

    vector.x = vector.x * widthHalf + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    const x = vector.x - this.size.w / 2;
    const y = vector.y - this.size.h / 2;

    return { x: x, y: y };
  };

  getImage = () => {
    const oldCanvas = this.renderer.domElement;
    const imgData = oldCanvas.toDataURL('image/png');
    this.onDataUrl(imgData);
  };
}
