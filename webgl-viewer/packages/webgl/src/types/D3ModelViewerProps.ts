import * as U from '@m-fe/utils';

import { getLocale, getModelCompressType, getModelType } from '../utils';
import { ModelAttr } from './ModelAttr';

export type D3ModelSrc = File | string;
export const D3ModelTypes = [
  'stl',
  'obj',
  'stp',
  'step',
  '3dm',
  '3ds',
  '3mf',
  'cob',
  'blender',
  'dxf',
  'ply',
  'x3d',
  'gitf',
  'gltf',
  'glb',
  'igs',
  'iges',
  'fbx',
  '3dxml',
  'catpart',
  'x_t',
  'x_b',
] as const;
export type D3ModelType = typeof D3ModelTypes[number];
export type D3ModelCompressType = 'none' | 'zlib' | 'zip' | 'zip-dir';
export type D3ModelViewerTheme = 'fresh' | 'default';
export type D3ModelViewerLayoutType = 'pc' | 'tablet' | 'mobile';

export interface D3ModelViewerCustomOptions {
  customModelAttr?: ModelAttr;
  externalAttr?: Record<string, string>;
  unit?: string;
}

export interface D3ModelViewerLayoutOptions {
  layoutType?: D3ModelViewerLayoutType;
  width?: number | string;
  height?: number | string;

  // 是否展示语言切换
  withLanguageSelector?: boolean;
  // 是否展示信息
  withAttrIcon?: boolean;
  /** 是否展示截图 */
  withCaptureIcon?: boolean;
  /** 是否自动截图 */
  autoCapture?: boolean;
  // 是否展示颜色拾取器
  withColorPicker?: boolean;
  withJoystick?: boolean;
}

export interface D3ModelViewerRenderOptions {
  theme?: D3ModelViewerTheme;
  modelColor?: string;
  backgroundColor?: string | number;
  shadowIntensity?: number;

  /** 是否展示属性面板 */
  isAttrPanelVisible?: boolean;
  /** 是否展示 Mesh */
  withMesh?: boolean;
  /** 是否展示线框图 */
  withWireframe?: boolean;
  /** 是否展示底平面 */
  withPlane?: boolean;
  /** 是否展示标尺线 */
  withBoundingBox?: boolean;
  /** 是否展示球体 */
  withSphere?: boolean;
  /** 是否包含渲染图 */
  withMaterialedMesh?: boolean;
  // 是否剖切
  withClipping?: boolean;
  // 是否英文
  withLanguageSelector?: boolean;
  /** 是否显示三维 x-y-z 指示线 */
  withAxisHelper?: boolean;
  /** 包含摄像头控制器 */
  withCameraControls?: boolean;

  autoplay?: boolean;
  autoRotate?: boolean;
  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
}

// 公共的组件应该实现的 Props
export interface D3ModelViewerProps {
  /** 传入的源文件类型 */
  src: D3ModelSrc;
  mesh?: THREE.Mesh;
  fileName?: string;
  type: D3ModelType;
  compressType: D3ModelCompressType;

  className?: string;
  style?: Record<string, string | number>;

  customOptions?: D3ModelViewerCustomOptions;
  layoutOptions?: D3ModelViewerLayoutOptions;
  renderOptions?: D3ModelViewerRenderOptions;

  onTopology?: (modelAttr: ModelAttr) => void;
  onSnapshot?: (blobOrDataUrl: Blob | string) => void;
  onCompress?: (compressedArrayBuffer: ArrayBuffer) => void;
  onLoad?: () => void;
  onError?: (err: Error) => void;
}

export const defaultModelViewerProps: Partial<D3ModelViewerProps> = {
  compressType: 'none',
  customOptions: {
    unit: 'mm',
    externalAttr: {},
  },
  layoutOptions: {
    width: 600,
    height: 400,
    withAttrIcon: true,
    withJoystick: true,
    withCaptureIcon: true,
    layoutType: window.innerWidth > 600 ? 'pc' : 'mobile',
    withLanguageSelector: getLocale() === 'en',
  },
  renderOptions: {
    theme: 'default',
    modelColor: `0xb3b3b3`,
    backgroundColor: 'rgb(55,65,92)',

    withMesh: true,
    withCameraControls: true,
    withPlane: true,
    withAxisHelper: true,
    withMaterialedMesh: true,

    autoplay: true,
    shadowIntensity: 0,
    autoRotate: false,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
  },
};

/** 合并 Props */
export const mergeD3ModelViewerProps = ({
  currentProps,
  originProps = defaultModelViewerProps,
}: {
  currentProps: Partial<D3ModelViewerProps>;
  originProps?: Partial<D3ModelViewerProps>;
}) => {
  const finalProps = {
    ...(originProps || {}),
    ...(currentProps || {}),
    customOptions: {
      ...(originProps.customOptions || {}),
      ...(currentProps.customOptions || {}),
    },
    layoutOptions: {
      ...(originProps.layoutOptions || {}),
      ...(currentProps.layoutOptions || {}),
    },
    renderOptions: {
      ...(originProps.renderOptions || {}),
      ...(currentProps.renderOptions || {}),
    },
  };

  if (!finalProps.fileName && typeof finalProps.src === 'string') {
    finalProps.fileName = U.getFileNameFromUrl(finalProps.src);
  }

  if (!finalProps.type) {
    finalProps.type = getModelType(finalProps.fileName, finalProps.src);
  }

  // 判断结尾是否有 zlib，如果有，则先设置为 zlib
  if ((finalProps.fileName || '').endsWith('zlib')) {
    finalProps.compressType = 'zlib';
  }

  if (!finalProps.compressType) {
    finalProps.compressType = getModelCompressType(
      finalProps.fileName,
      finalProps.src,
    );
  }

  return finalProps as D3ModelViewerProps;
};
