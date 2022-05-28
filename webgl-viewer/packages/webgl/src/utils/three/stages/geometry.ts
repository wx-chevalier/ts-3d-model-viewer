import * as THREE from 'three';

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
