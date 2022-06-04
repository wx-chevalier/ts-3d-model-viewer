import React from 'react';
import create from 'zustand';

import { ThreeRenderer } from '../engine';
import { D3ModelViewerState } from '../types';

export interface ViewerStateStore extends D3ModelViewerState {
  threeRenderer?: ThreeRenderer;

  setPartialState?: (partialState: Partial<ViewerStateStore>) => void;
}

export const useViewerStateStore = create<ViewerStateStore>(set => ({
  isAttrPanelVisible: false,
  setPartialState: (partialState: Partial<ViewerStateStore>) =>
    set(state => ({ ...state, ...partialState })),
}));

export const withViewerStateStore = <T,>(
  BaseComponent: React.ComponentType<T>,
) => (props: T) => {
  const store = useViewerStateStore();

  return <BaseComponent {...props} viewerStateStore={store} />;
};
