import * as THREE from 'three';

import { D3ModelViewerProps, mergeD3ModelViewerProps } from '../../types';

export function getThreeJsWebGLRenderer(
  _props: Partial<D3ModelViewerProps>,
  { height, width }: { height: number; width: number },
): THREE.WebGLRenderer {
  const props = mergeD3ModelViewerProps({ currentProps: _props });

  const renderer = new THREE.WebGLRenderer({
    // 增加下面两个属性，可以抗锯齿
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  const devicePixelRatio = window.devicePixelRatio || 1;

  renderer.setClearColor(
    new THREE.Color(props.renderOptions.backgroundColor),
    1,
  );
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(width, height);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.cullFace = THREE.CullFaceBack;

  renderer.clippingPlanes = Object.freeze([]) as any; // GUI sets it to globalPlanes
  renderer.localClippingEnabled = true;

  return renderer;
}
