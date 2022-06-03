/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

import './index.css';

import { ellipsis, genId, get, isLanIp } from '@m-fe/utils';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Loader from 'react-loader-spinner';

import { ThreeRenderer } from '../../engine';
import { ViewerStateStore, withViewerStateStore } from '../../stores';
import {
  D3ModelViewerProps,
  D3ModelViewerState,
  getInitialStateFromProps,
  mergeD3ModelViewerProps,
} from '../../types';
import { ErrorFallback, i18nFormat, isSupportThreejsLoader } from '../../utils';
import { Joystick, ViewerToolbar } from '../../widgets';

interface IProps extends D3ModelViewerProps {
  viewerStateStore: ViewerStateStore;
}

interface IState {}

export class ThreeViewerComp extends React.Component<IProps, IState> {
  static displayName = 'ThreeViewer';

  get mixedProps(): IProps {
    return {
      ...mergeD3ModelViewerProps({ currentProps: this.props }),
      viewerStateStore: this.props.viewerStateStore,
    };
  }

  getDom = () => {
    return get(
      '',
      () => this.$ref.current || document.getElementById('webgl-container'),
    );
  };

  get threeRenderer() {
    return this.props.viewerStateStore.threeRenderer;
  }

  id = genId();

  state: IState = {
    ...getInitialStateFromProps(this.mixedProps),
  };

  $ref = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.initRenderer();
  }

  componentWillReceiveProps(nextProps: IProps) {
    if (
      nextProps.src !== this.mixedProps.src ||
      nextProps.mesh !== this.mixedProps.mesh
    ) {
      this.initRenderer(nextProps);
    }
  }

  componentWillUnmount() {
    if (this.threeRenderer) {
      this.threeRenderer.destroy();
    }

    if (this.getDom()) {
      this.getDom().remove();
    }
  }

  initRenderer(props = this.mixedProps) {
    if (this.threeRenderer) {
      this.threeRenderer.destroy();
    }

    const threeRenderer = new ThreeRenderer(props, {
      getDom: this.getDom,
      getViewerState: () => this.state,
      onContextChange: (partialViewerState: Partial<D3ModelViewerState>) => {
        if (typeof props.viewerStateStore.setPartialState === 'function') {
          props.viewerStateStore.setPartialState({ ...partialViewerState });
        } else {
          console.log(
            props.viewerStateStore,
            props.viewerStateStore.setPartialState,
            partialViewerState,
          );
        }
      },
    });

    threeRenderer.init();

    props.viewerStateStore.setPartialState({ threeRenderer });
  }

  renderWebGL() {
    const {
      layoutOptions: { width, height },
      style,
      viewerStateStore,
    } = this.mixedProps;
    const { hasModelFileLoaded } = viewerStateStore;

    return (
      <ErrorBoundary
        FallbackComponent={props => (
          <div style={{ width }}>
            <ErrorFallback {...props} />
          </div>
        )}
      >
        <div
          id="webgl-container"
          className="rmv-sv-webgl"
          ref={this.$ref}
          style={{
            width,
            height:
              typeof height === 'number'
                ? height - 40
                : `calc(${height || '100%'} - 40px)`,
            ...style,
          }}
        >
          {!hasModelFileLoaded ? (
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Loader type="Puff" color="#00BFFF" height={100} width={100} />
              </div>
            </ErrorBoundary>
          ) : (
            <></>
          )}
        </div>
      </ErrorBoundary>
    );
  }

  renderAttr() {
    const {
      fileName,
      src,
      customOptions: { unit },
      viewerStateStore,
    } = this.mixedProps;
    const { threeRenderer, isAttrPanelVisible } = viewerStateStore;

    if (!threeRenderer) {
      return <Loader type="Puff" color="#00BFFF" height={100} width={100} />;
    }

    const { topology } = threeRenderer.context;

    return isAttrPanelVisible && topology ? (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="rmv-gmv-attr-modal">
          <div className="rmv-gmv-attr-modal-row">
            {fileName && (
              <div className="item">
                {i18nFormat('名称')}：{`${ellipsis(fileName)}`}
              </div>
            )}
            <div className="item">
              {i18nFormat('尺寸')}：
              {topology.sizeX ? topology.sizeX.toFixed(2) : 0}*
              {topology.sizeY ? topology.sizeY.toFixed(2) : 0}*
              {topology.sizeZ ? topology.sizeZ.toFixed(2) : 0} {unit}
            </div>
            <div className="item">
              {i18nFormat('体积')}：
              {topology.volume ? topology.volume.toFixed(2) : 0} {unit}
              <sup>3</sup>
            </div>
          </div>

          <div className="rmv-gmv-attr-modal-row">
            <div className="item">
              {i18nFormat('面积')}：
              {topology.area ? topology.area.toFixed(2) : 0} {unit}
              <sup>2</sup>
            </div>
            <div className="item">
              {i18nFormat('面片')}：{`${topology.triangleCnt}`}
            </div>
            <div className="item">
              {i18nFormat('来源')}：
              {typeof src === 'string' && isLanIp(src)
                ? i18nFormat('内网')
                : i18nFormat('公网')}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    ) : (
      <></>
    );
  }

  render() {
    const {
      type,
      style,
      layoutOptions: { width, height, widgets },

      viewerStateStore,
    } = this.mixedProps;

    const { threeRenderer } = viewerStateStore;

    // 如果出现异常
    if (!isSupportThreejsLoader(type) && !this.mixedProps.mesh) {
      return (
        <div
          className="rmv-sv-container"
          style={{
            width,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            className="rmv-sv-webgl"
            ref={this.$ref}
            style={{
              width,
              height,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              ...style,
            }}
          >
            {i18nFormat('该类型暂不支持预览')}
          </div>
        </div>
      );
    }

    // 非宽松方式，即上下布局
    return (
      <div
        className="rmv-three-viewer-container"
        style={{ width, height: height }}
      >
        <ViewerToolbar threeRenderer={threeRenderer} />
        {this.renderWebGL()}
        {widgets.includes('joystick') && (
          <Joystick threeRenderer={this.threeRenderer} />
        )}
      </div>
    );
  }
}

export const ThreeViewer = withViewerStateStore(ThreeViewerComp);
