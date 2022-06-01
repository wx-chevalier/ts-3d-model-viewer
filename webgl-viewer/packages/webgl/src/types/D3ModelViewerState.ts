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
  hasModelFileLoaded?: boolean;
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
