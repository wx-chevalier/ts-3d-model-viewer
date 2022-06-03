/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import 'rc-tooltip/assets/bootstrap.css';
import './index.css';

import { ellipsis, genId, get, isLanIp } from '@m-fe/utils';
import Tooltip from 'rc-tooltip';
import React from 'react';
import { SketchPicker } from 'react-color';
import { ErrorBoundary } from 'react-error-boundary';
import Loader from 'react-loader-spinner';

import {
  cookMeshMaterial,
  ObjectSnapshotGenerator,
  ThreeRenderer,
} from '../../engine';
import {
  D3ModelViewerProps,
  D3ModelViewerState,
  getInitialStateFromProps,
  mergeD3ModelViewerProps,
} from '../../types';
import {
  ErrorFallback,
  i18nFormat,
  isSupportThreejsLoader,
  setLocale,
} from '../../utils';
import { Joystick, Switch } from '../../widgets';

declare global {
  const __DEV__: boolean;
}

interface IProps extends D3ModelViewerProps {}

interface IState extends D3ModelViewerState {
  threeRenderer?: ThreeRenderer;
}

export class WebGLViewer extends React.Component<IProps, IState> {
  static displayName = 'WebGLViewer';

  get mixedProps(): D3ModelViewerProps {
    return mergeD3ModelViewerProps({ currentProps: this.props });
  }

  getDom = () => {
    return get(
      '',
      () => this.$ref.current || document.getElementById('webgl-container'),
    );
  };

  get threeRenderer() {
    return this.state.threeRenderer;
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
    if (this.state.threeRenderer) {
      this.state.threeRenderer.destroy();
    }

    if (this.getDom()) {
      this.getDom().remove();
    }
  }

  componentDidCatch(error: Error) {
    console.error('>>>WebGLViewer>>>error>>>', error);
  }

  initRenderer(props = this.mixedProps) {
    if (this.state.threeRenderer) {
      this.state.threeRenderer.destroy();
    }

    const threeRenderer = new ThreeRenderer(props, {
      getDom: this.getDom,
      getViewerState: () => this.state,
      onContextChange: (partialViewerState: Partial<D3ModelViewerState>) => {
        this.setState({ ...partialViewerState });
      },
    });

    threeRenderer.init();

    this.setState({ threeRenderer });
  }

  renderWebGL() {
    const {
      layoutOptions: { width, height },
      style,
    } = this.mixedProps;
    const { hasModelFileLoaded } = this.state;

    return (
      <ErrorBoundary
        FallbackComponent={props => (
          <div style={{ height: 150 }}>
            <ErrorFallback {...props} />
          </div>
        )}
      >
        <div
          id="webgl-container"
          className="rmv-sv-webgl"
          ref={this.$ref}
          style={{ width, height, ...style }}
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
    } = this.mixedProps;
    const { threeRenderer } = this.state;

    if (!threeRenderer) {
      return <Loader type="Puff" color="#00BFFF" height={100} width={100} />;
    }

    const { isAttrPanelVisible } = this.state;
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

  renderLoose() {
    const {
      layoutOptions: { width, withJoystick },
    } = this.mixedProps;

    const {
      withMaterialedMesh,
      withWireframe,
      withBoundingBox,
      withColorPicker,
      withClipping,
      withLanguageSelector,
    } = this.state;

    return (
      <div
        className="rmv-sv-container rmv-sv-loose-container"
        style={{ width }}
      >
        {withColorPicker ? (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="rmv-sv-color-picker">
              <SketchPicker
                color={this.state.modelColor}
                onChange={({ hex }) => {
                  this.setState({ modelColor: hex }, () => {
                    this.state.threeRenderer.changeMaterial(
                      cookMeshMaterial(
                        this.state.withClipping,
                        this.state.modelColor,
                      ),
                    );
                  });
                }}
              />
            </div>
          </ErrorBoundary>
        ) : (
          <></>
        )}
        <div
          className="rmv-sv-toolbar"
          style={{ width: withLanguageSelector ? 150 : 100 }}
        >
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withMaterialedMesh-${this.id}`}>
              {i18nFormat('着色')}：
            </label>
            <Switch
              id={`withMaterialedMesh-${this.id}`}
              checked={withMaterialedMesh}
              onChange={e => {
                if (e.target.checked) {
                  this.state.threeRenderer.setupMaterialedMesh();
                } else {
                  this.state.threeRenderer.removeMaterialedMesh();
                }
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withWireframe-${this.id}`}>
              {i18nFormat('线框')}：
            </label>
            <Switch
              id={`withWireframe-${this.id}`}
              checked={withWireframe}
              onChange={e => {
                if (e.target.checked) {
                  this.state.threeRenderer.setupWireframe();
                } else {
                  this.state.threeRenderer.removeWireFrame();
                }
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withBoundingBox-${this.id}`}>
              {i18nFormat('框体')}：
            </label>
            <Switch
              id={`withBoundingBox-${this.id}`}
              checked={withBoundingBox}
              onChange={e => {
                if (e.target.checked) {
                  this.state.threeRenderer.setupBoundingBox();
                } else {
                  this.state.threeRenderer.removeBoundingBox();
                }
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withColorPicker-${this.id}`}>
              {i18nFormat('色盘')}：
            </label>
            <Switch
              id={`withColorPicker-${this.id}`}
              checked={withColorPicker}
              onChange={e => {
                this.setState({ withColorPicker: e.target.checked });
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withClipping-${this.id}`}>
              {i18nFormat('剖切')}：
            </label>
            <Switch
              id={`withClipping-${this.id}`}
              checked={withClipping}
              onChange={e => {
                this.setState({ withClipping: e.target.checked }, () => {
                  this.state.threeRenderer.changeMaterial(
                    cookMeshMaterial(
                      this.state.withClipping,
                      this.state.modelColor,
                    ),
                  );
                });
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withLanguageSelector-${this.id}`}>中/EN：</label>
            <Switch
              id={`withLanguageSelector-${this.id}`}
              checked={withLanguageSelector}
              onChange={e => {
                if (e.target.checked) {
                  setLocale('en');
                } else {
                  setLocale('zh');
                }

                this.setState({ withLanguageSelector: e.target.checked });
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`isFreshViewEnabled-${this.id}`}>简约：</label>
            <Switch
              id={`isFreshViewEnabled-${this.id}`}
              checked={get(
                this.state.threeRenderer,
                r => r.context.theme === 'fresh',
              )}
              onChange={() => {
                this.state.threeRenderer.changeTheme('fresh');
              }}
            />
          </div>
          {withJoystick && (
            <Joystick threeRenderer={this.state.threeRenderer} />
          )}
        </div>

        {this.renderAttr()}

        {this.renderWebGL()}
      </div>
    );
  }

  render() {
    const {
      type,
      style,
      layoutOptions: {
        width,
        height,
        layoutType,
        withJoystick,
        withCaptureIcon,
      },

      onSnapshot,
    } = this.mixedProps;

    const {
      withMaterialedMesh,
      withWireframe,
      withBoundingBox,
      withColorPicker,
      withClipping,
      withLanguageSelector,
    } = this.state;

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

    if (layoutType === 'pc') {
      // 宽松方式，即左右布局
      return this.renderLoose();
    }

    // 非宽松方式，即上下布局
    return (
      <div
        className="rmv-sv-container rmv-sv-compact-container"
        style={{ width }}
      >
        {withColorPicker && (
          <div
            className="rmv-sv-color-picker"
            style={{ bottom: -8, background: 'none', top: 'unset' }}
          >
            <SketchPicker
              color={this.state.modelColor}
              onChange={({ hex }) => {
                this.setState({ modelColor: hex }, () => {
                  this.state.threeRenderer.changeMaterial(
                    cookMeshMaterial(
                      this.state.withClipping,
                      this.state.modelColor,
                    ),
                  );
                });
              }}
            />
          </div>
        )}

        <div className="rmv-sv-toolbar">
          <div className="rmv-sv-toolbar-left">
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withMaterialedMesh-${this.id}`}
                checked={withMaterialedMesh}
                onChange={e => {
                  if (e.target.checked) {
                    this.state.threeRenderer.setupMaterialedMesh();
                  } else {
                    this.state.threeRenderer.removeMaterialedMesh();
                  }
                }}
              />
              <label htmlFor={`withMaterialedMesh-${this.id}`}>
                {i18nFormat('着色')}
              </label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withWireframe-${this.id}`}
                checked={withWireframe}
                onChange={e => {
                  if (e.target.checked) {
                    this.state.threeRenderer.setupWireframe();
                  } else {
                    this.state.threeRenderer.removeWireFrame();
                  }
                }}
              />
              <label htmlFor={`withWireframe-${this.id}`}>
                {i18nFormat('线框')}
              </label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withBoundingBox-${this.id}`}
                checked={withBoundingBox}
                onChange={e => {
                  if (e.target.checked) {
                    this.state.threeRenderer.setupBoundingBox();
                  } else {
                    this.state.threeRenderer.removeBoundingBox();
                  }
                }}
              />
              <label htmlFor={`withBoundingBox-${this.id}`}>
                {i18nFormat('框体')}
              </label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withColorPicker-${this.id}`}
                checked={withColorPicker}
                onChange={e => {
                  this.setState({ withColorPicker: e.target.checked });
                }}
              />
              <label htmlFor={`withColorPicker-${this.id}`}>
                {i18nFormat('色盘')}
              </label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withClipping-${this.id}`}
                checked={withClipping}
                onChange={e => {
                  this.setState({ withClipping: e.target.checked }, () => {
                    this.state.threeRenderer.changeMaterial(
                      cookMeshMaterial(
                        this.state.withClipping,
                        this.state.modelColor,
                      ),
                    );
                  });
                }}
              />
              <label htmlFor={`withClipping-${this.id}`}>
                {i18nFormat('剖切')}
              </label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withLanguageSelector-${this.id}`}
                checked={withLanguageSelector}
                onChange={e => {
                  if (e.target.checked) {
                    setLocale('en');
                  } else {
                    setLocale('zh');
                  }

                  this.setState({ withLanguageSelector: e.target.checked });
                }}
              />
              <label htmlFor={`withLanguageSelector-${this.id}`}>中/EN</label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <label htmlFor={`isFreshViewEnabled-${this.id}`}>简约：</label>
              <Switch
                id={`isFreshViewEnabled-${this.id}`}
                checked={get(
                  this.state.threeRenderer,
                  r => r.context.theme === 'fresh',
                )}
                onChange={() => {
                  this.state.threeRenderer.changeTheme('fresh');
                }}
              />
            </div>
          </div>
          <div className="rmv-sv-toolbar-right">
            {/** 是否显示截图 */}
            {onSnapshot && withCaptureIcon && (
              <Tooltip placement="left" overlay={i18nFormat('点击生成截图')}>
                <svg
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="671"
                  width="20px"
                  height="20px"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const context = this.state.threeRenderer.context;
                    try {
                      new ObjectSnapshotGenerator(
                        context.model,
                        context.camera,
                        context.renderer,
                        (dataUrl: string) => {
                          onSnapshot(dataUrl);
                        },
                      );
                    } catch (_) {
                      console.error(_);
                    }
                  }}
                >
                  <path
                    d="M970.88 803.2V375.04a98.56 98.56 0 0 0-97.92-97.92h-152.32L696.32 192a64 64 0 0 0-64-43.52H393.6a64 64 0 0 0-64 43.52l-26.24 84.48H151.04A97.92 97.92 0 0 0 53.12 375.04v428.8a97.92 97.92 0 0 0 97.92 97.92h721.92a98.56 98.56 0 0 0 97.92-98.56z m-64 0a33.92 33.92 0 0 1-33.92 33.92H151.04a33.92 33.92 0 0 1-33.92-33.92V375.04a33.92 33.92 0 0 1 33.92-33.92h176.64A32 32 0 0 0 359.04 320L384 211.2a14.08 14.08 0 0 1 7.04 0h243.84L665.6 320a32 32 0 0 0 30.72 23.68h176.64a33.92 33.92 0 0 1 33.92 33.92z"
                    fill="#ffffff"
                    p-id="672"
                  />
                  <path
                    d="M284.16 423.04H209.28a16 16 0 0 0 0 32h74.88a16 16 0 0 0 0-32zM512 384a188.16 188.16 0 1 0 188.16 192A188.8 188.8 0 0 0 512 384z m0 345.6A156.16 156.16 0 1 1 668.16 576 156.8 156.8 0 0 1 512 729.6z"
                    fill="#ffffff"
                    p-id="673"
                  />
                </svg>
              </Tooltip>
            )}
          </div>
        </div>

        {withJoystick && <Joystick threeRenderer={this.state.threeRenderer} />}

        {this.renderAttr()}

        {this.renderWebGL()}
      </div>
    );
  }
}
