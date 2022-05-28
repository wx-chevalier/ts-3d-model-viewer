import * as THREE from 'three';

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
