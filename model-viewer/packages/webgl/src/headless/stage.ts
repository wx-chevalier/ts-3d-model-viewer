import * as THREE from 'three';

import { defaultModelViewerProps, IModelViewerProps } from '../types';

export function getThreeJsWebGLRenderer(
  _props: Partial<IModelViewerProps>,
  { height, width }: { height: number; width: number },
): THREE.WebGLRenderer {
  const props = { ...defaultModelViewerProps, ..._props };

  const renderer = new THREE.WebGLRenderer({
    // 增加下面两个属性，可以抗锯齿
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  const devicePixelRatio = window.devicePixelRatio || 1;

  renderer.setClearColor(new THREE.Color(props.backgroundColor), 1);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(width, height);

  // renderer.gammaInput = true;
  // renderer.gammaOutput = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.cullFace = THREE.CullFaceBack;

  renderer.clippingPlanes = Object.freeze([]) as any; // GUI sets it to globalPlanes
  renderer.localClippingEnabled = true;

  return renderer;
}

/** 获得材料 */
export function getMaterial(withClipping: boolean, color: string) {
  const localPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.5);

  return new THREE.MeshPhongMaterial({
    color,
    specular: 0x111111,
    shininess: 20,
    // side: THREE.DoubleSide,

    // ***** Clipping setup (material): *****
    clippingPlanes: withClipping ? [localPlane] : [],
    clipShadows: true,
  });
}

export function adjustGeometry(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
) {
  geometry.computeBoundingSphere();
  geometry.center();
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

  const mesh = new THREE.Mesh(geometry, material);

  geometry.computeBoundingBox();

  const xDims = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
  const yDims = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
  const zDims = geometry.boundingBox.max.z - geometry.boundingBox.min.z;

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.material = material;

  // reset center point
  const box = new THREE.Box3().setFromObject(mesh);
  box.getCenter(mesh.position);
  mesh.position.multiplyScalar(-1);

  return { mesh, xDims, yDims, zDims };
}

/** 设置灯光 */
export function setupLights(model: THREE.Mesh, scene: THREE.Scene) {
  // Ambient，散射灯光
  scene.add(new THREE.AmbientLight(0x505050));

  const maxGeo = model.geometry.boundingBox.max;
  const minGeo = model.geometry.boundingBox.min;

  const target = new THREE.Object3D();
  target.position.set(0, 0, 0);

  const LightPosList: { x: number; y: number; z: number }[] = [
    {
      x: maxGeo.x * 2,
      y: maxGeo.y * 2,
      z: maxGeo.z * 2,
    },
    {
      x: minGeo.x * 2,
      y: minGeo.y * 2,
      z: minGeo.z * 2,
    },
  ];

  LightPosList.forEach(pos => {
    const light = new THREE.SpotLight(0xffffff);
    light.castShadow = true;
    light.angle = 180;
    light.position.set(pos.x, pos.y, pos.z);

    light.target = target;

    scene.add(light);
  });
}
