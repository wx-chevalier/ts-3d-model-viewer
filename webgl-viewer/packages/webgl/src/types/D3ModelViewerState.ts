import {
  D3ModelViewerCustomOptions,
  D3ModelViewerLayoutOptions,
  D3ModelViewerProps,
  D3ModelViewerRenderOptions,
} from './D3ModelViewerProps';

export interface D3ModelViewerState
  extends Partial<D3ModelViewerCustomOptions>,
    Partial<D3ModelViewerLayoutOptions>,
    Partial<D3ModelViewerRenderOptions> {
  /** 模型文件是否加载完毕 */
  hasModelFileLoaded?: boolean;

  /** 是否展示属性面板 */
  isAttrPanelVisible?: boolean;

  /** 是否展示设置面板 */
  isSettingsPanelVisible?: boolean;

  /** 是否展示渲染参数 */
  isRenderOptionsPanelVisible?: boolean;

  /** 颜色选择器，兼容 WebGLViewer 的情况 */
  isColorPickerVisible?: boolean;
}

export const getInitialStateFromProps = (
  props: Partial<D3ModelViewerProps>,
) => {
  const { customOptions, layoutOptions, renderOptions, ...restProps } = props;

  const state: D3ModelViewerState = {
    ...restProps,
    ...customOptions,
    ...layoutOptions,
    ...renderOptions,
  };

  return state;
};
