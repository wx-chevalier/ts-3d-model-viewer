import { ModelAttr } from './ModelAttr';

export type ModelSrc = File | string;
export type ModelType = 'gltf' | 'glb' | 'obj' | 'stl' | 'ply' | 'stp' | 'step';
export type ModelCompressType = 'none' | 'zlib';
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
  modelColor?: string | number;
  backgroundColor?: string | number;
  style?: Record<string, string | number>;
  // 是否展示属性浮窗
  withAttr?: boolean;
  externalAttr?: Record<string, string>;

  cameraControls?: boolean;
  autoplay?: boolean;
  autoRotate?: boolean;
  shadowIntensity?: number;
  timeout?: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  withJoystick: boolean;

  onTopology?: (modelAttr: ModelAttr) => void;
  onSnapshot?: (blob: Blob) => void;
  onZip?: (zippedArrayBuffer: ArrayBuffer) => void;
  onLoad?: () => void;
}

export const defaultModelViewerProps: Partial<IModelViewerProps> = {
  width: 300,
  height: 200,
  cameraControls: true,
  autoplay: true,
  autoRotate: false,
  shadowIntensity: 0,
  timeout: 30 * 1000,
  modelColor: 0xb3b3b3,
  backgroundColor: 'rgb(55,65,92)',
  externalAttr: {},
  withJoystick: true,
  cameraX: 0,
  cameraY: 0,
  cameraZ: 0
};
