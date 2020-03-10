import { ModelAttr } from './ModelAttr';

export type ModelSrc = File | string;
export type ModelType = 'gltf' | 'glb' | 'obj' | 'stl' | 'ply';

// 公共的组件应该实现的 Props
export interface IModelViewerProps {
  // 传入的源文件类型
  src: ModelSrc;
  type: ModelType;

  width?: number;
  height?: number;
  backgroundColor?: string;
  style?: Record<string, string | number>;

  cameraControls?: boolean;
  autoplay?: boolean;
  autoRotate?: boolean;
  shadowIntensity?: number;

  onTopology?: (modelAttr: ModelAttr) => void;
  onSnapshot?: (blob: Blob) => void;
}

export const defaultModelViewerProps: Partial<IModelViewerProps> = {
  width: 300,
  height: 200,
  cameraControls: true,
  autoplay: true,
  autoRotate: true,
  shadowIntensity: 0
};
