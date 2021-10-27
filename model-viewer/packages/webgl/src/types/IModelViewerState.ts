import { ModelCompressType, ModelType } from './IModelViewerProps';
import { ModelAttr } from './ModelAttr';

export interface IModelViewerState {
  type: ModelType;
  compressType: ModelCompressType;
  topology?: ModelAttr;
  modelFile?: File;

  showColorPicker?: boolean;
  modelColor: string;
  backgroundColor: string | number;

  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;

  loaded: boolean;

  // 是否展示信息
  withAttr: boolean;
  // 是否展示线框图
  withWireframe?: boolean;
  // 是否展示底平面
  withPlane?: boolean;
  // 是否展示标尺线
  withBoundingBox?: boolean;
  // 是否展示球体
  withSphere?: boolean;
  // 是否展示坐标系
  withAxis?: boolean;
  // 是否渲染
  withMaterial?: boolean;
  // 是否剖切
  withClipping?: boolean;
  // 是否英文
  withLanguageSelector?: boolean;
  // 是否简约视图
  isFreshViewEnabled?: boolean;
}
