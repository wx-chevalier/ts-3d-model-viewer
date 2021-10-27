import { ModelAttr } from './ModelAttr';

export type ModelSrc = File | string;
export type ModelType =
  | 'gltf'
  | 'glb'
  | 'obj'
  | 'stl'
  | 'ply'
  | 'stp'
  | 'step'
  | '3dxml'
  | 'catpart'
  | 'x_t'
  | 'x_b';
export type ModelCompressType = 'none' | 'zlib' | 'zip';
export type ZippedModelMap = Record<string, Uint8Array>;

// 公共的组件应该实现的 Props
export interface IModelViewerProps {
  // 传入的源文件类型
  src: ModelSrc;
  type: ModelType;
  compressType: ModelCompressType;

  fileName?: string;
  width?: number | string;
  height?: number | string;
  modelColor?: string;
  backgroundColor?: string | number;
  style?: Record<string, string | number>;
  // 是否展示模型
  showModelViewer?: boolean;
  // 是否展示属性浮窗
  withAttr?: boolean;
  externalAttr?: Record<string, string>;
  // 是否展示右侧摄像头按钮
  showCameraIcon?: boolean;
  // 是否显示三维 x-y-z 指示线
  showAxisHelper?: boolean;
  // 简约模式
  simplicity: boolean;

  cameraControls?: boolean;
  autoplay?: boolean;
  autoRotate?: boolean;
  shadowIntensity?: number;
  timeout?: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;

  withJoystick: boolean;
  withPlane?: boolean;
  // 展示类型，是在 PC 上还是在移动设备上
  layoutType: 'compact' | 'loose';

  onTopology?: (modelAttr: ModelAttr) => void;
  onSnapshot?: (blobOrDataUrl: Blob | string) => void;
  onCompress?: (zippedArrayBuffer: ArrayBuffer) => void;
  onLoad?: () => void;
  onError?: (err: Error) => void;
}

export const defaultModelViewerProps: Partial<IModelViewerProps> = {
  width: 300,
  height: 200,
  showModelViewer: true,
  cameraControls: true,
  autoplay: true,
  autoRotate: false,
  shadowIntensity: 0,
  timeout: 30 * 1000,
  modelColor: `0xb3b3b3`,
  backgroundColor: 'rgb(55,65,92)',
  withAttr: true,
  externalAttr: {},
  withJoystick: true,
  layoutType: window.innerWidth > 600 ? 'loose' : 'compact',
  cameraX: 0,
  cameraY: 0,
  cameraZ: 0,
  showCameraIcon: false,
  withPlane: true,
  showAxisHelper: true,
};
