import * as THREE from 'three';

import {
  D3ModelViewerProps,
  D3ModelViewerTheme,
  ModelAttr,
} from '../../../types';

export class ThreeRendererContext {
  modelFile?: File;
  model?: THREE.Mesh;
  modelWireframe?: THREE.Mesh;

  theme?: D3ModelViewerTheme = 'default';
  hasModelFileLoaded?: boolean;
  topology?: ModelAttr;
  withClipping?: boolean;

  scene: THREE.Scene;
  group: THREE.Group;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  orbitControls: any;
  boundingBox: THREE.BoxHelper;
  xSprite: any;
  ySprite: any;
  zSprite: any;
  plane: THREE.GridHelper;
  axisHelper: THREE.AxesHelper;

  xDims: number;
  yDims: number;
  zDims: number;

  constructor(public viewerProps: D3ModelViewerProps) {}
}
