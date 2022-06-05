/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

import './index.css';

import { ellipsis, genId, get, isLanIp, parseJson } from '@m-fe/utils';
import Button from 'antd/lib/button';
import Divider from 'antd/lib/divider';
import Empty from 'antd/lib/empty';
import Space from 'antd/lib/space';
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
import {
  ErrorFallback,
  i18nFormat,
  isSupportOcctLoader,
  isSupportThreejsLoader,
} from '../../utils';
import { Joystick, SnapshotClipViewer, ViewerToolbar } from '../../widgets';
import { BoxSpin } from '../../widgets/decorators/BoxSpin';
import { ModelAttrPanel } from '../../widgets/panels/ModelAttrPanel';
import { RenderOptionsPanel } from '../../widgets/panels/RenderOptionsPanel';
import { SettingsPanel } from '../../widgets/panels/SettingsPanel';

interface IProps extends D3ModelViewerProps {
  viewerStateStore?: ViewerStateStore;
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

  $ref = React.createRef<HTMLDivElement>();

  componentDidMount() {
    const persistedRendererOptionsStr = localStorage.getItem(
      'rmv-renderer-options',
    );

    const persistedRendererOptions = persistedRendererOptionsStr
      ? parseJson(persistedRendererOptionsStr, {})
      : {};

    // 这里需要获取保存起来的状态值
    this.props.viewerStateStore.setPartialState({
      ...getInitialStateFromProps(this.mixedProps),
      ...persistedRendererOptions,
    });

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
      getViewerState: () => this.props.viewerStateStore,
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
    const { hasModelFileLoaded, loaderEvent, threeRenderer } = viewerStateStore;

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
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {get(threeRenderer, () => threeRenderer.viewerProps.src) ? (
                  <>
                    <BoxSpin />

                    {isSupportOcctLoader(
                      get(threeRenderer, () => threeRenderer.viewerProps.type),
                    ) ? (
                      <div style={{ transform: 'translateY(32px)' }}>
                        {loaderEvent
                          ? `${i18nFormat('CAD 解析中')}: ${loaderEvent}`
                          : i18nFormat(
                              'CAD 文件需要加载额外解析器，请耐心等候',
                            )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 24 }}>{loaderEvent}</div>
                    )}
                  </>
                ) : (
                  <Empty
                    description={
                      <div>
                        <div>
                          {i18nFormat(
                            '请点击左上角打开文件，或使用下列演示文件',
                          )}
                        </div>
                        <Space
                          size={0}
                          split={
                            <Divider type="vertical" style={{ margin: 0 }} />
                          }
                        >
                          <Button
                            type="link"
                            onClick={() => {
                              threeRenderer.init({
                                src:
                                  'https://oss-huitong-foshan-pri.oss-cn-shenzhen.aliyuncs.com/TENANT-109/model/202110/d3381eb6-08c1-4f06-9456-36edfaad6d5f/Spider_ascii.stl',
                                fileName: 'Spider_ascii.stl',
                                type: undefined,
                                compressType: 'zlib',
                              });
                            }}
                          >
                            {i18nFormat('STL')}
                          </Button>
                          <Button
                            type="link"
                            onClick={() => {
                              threeRenderer.init({
                                src:
                                  'https://ufc-assets.oss-cn-shanghai.aliyuncs.com/%E6%B5%8B%E8%AF%95%E6%A8%A1%E5%9E%8B/formats/STEP/abstract_pca.step',
                                fileName: 'abstract_pca.step',
                                type: undefined,
                                compressType: 'none',
                              });
                            }}
                          >
                            {i18nFormat('STEP')}
                          </Button>
                          <Button
                            type="link"
                            onClick={() => {
                              threeRenderer.init({
                                src:
                                  'https://ufc-assets.oss-cn-shanghai.aliyuncs.com/%E6%B5%8B%E8%AF%95%E6%A8%A1%E5%9E%8B/formats/IGES/ex1.iges',
                                fileName: 'ex1.iges',
                                type: undefined,
                                compressType: 'none',
                              });
                            }}
                          >
                            {i18nFormat('IGES')}
                          </Button>
                          <Button
                            type="link"
                            onClick={() => {
                              threeRenderer.init({
                                src:
                                  'https://ufc-assets.oss-cn-shanghai.aliyuncs.com/%E6%B5%8B%E8%AF%95%E6%A8%A1%E5%9E%8B/formats/3MF/models/dodeca_chain_loop_color.3mf',
                                fileName: 'dodeca_chain_loop_color.3mf',
                                type: undefined,
                                compressType: 'none',
                              });
                            }}
                          >
                            {i18nFormat('3MF')}
                          </Button>
                          <Button
                            type="link"
                            onClick={() => {
                              threeRenderer.init({
                                src:
                                  'https://ufc-assets.oss-cn-shanghai.aliyuncs.com/%E6%B5%8B%E8%AF%95%E6%A8%A1%E5%9E%8B/formats/OBJ/models/WusonOBJ.obj',
                                fileName: 'WusonOBJ.obj',
                                type: undefined,
                                compressType: 'none',
                              });
                            }}
                          >
                            {i18nFormat('OBJ')}
                          </Button>
                        </Space>
                      </div>
                    }
                  />
                )}
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
        {viewerStateStore.isAttrPanelVisible && <ModelAttrPanel />}
        {viewerStateStore.isSettingsPanelVisible && <SettingsPanel />}
        {viewerStateStore.isRenderOptionsPanelVisible && <RenderOptionsPanel />}
        <SnapshotClipViewer />
      </div>
    );
  }
}

export const ThreeViewer = withViewerStateStore<IProps>(ThreeViewerComp);
