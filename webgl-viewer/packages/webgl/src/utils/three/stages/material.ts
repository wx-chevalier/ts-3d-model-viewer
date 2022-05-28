import * as THREE from 'three';

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
