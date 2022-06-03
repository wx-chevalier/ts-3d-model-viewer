import './index.css';

import { genId, readFileAsArrayBufferAsync } from '@m-fe/utils';
import UZIP from 'pako';
import * as React from 'react';
import Loader from 'react-loader-spinner';
import * as THREE from 'three';

import { calcTopology } from '../../engine';
import {
  D3ModelCompressType,
  D3ModelSrc,
  D3ModelType,
  D3ModelViewerProps,
  mergeD3ModelViewerProps,
  ModelAttr,
} from '../../types';
import {
  getFileObjFromModelSrc,
  getModelCompressType,
  getModelType,
  isSupportThreejsLoader,
  loadMesh,
  toFixedNumber,
} from '../../utils';
import { Holdable } from '../../widgets';

export interface GoogleModelViewerProps extends D3ModelViewerProps {}

interface GoogleModelViewerState {
  type: D3ModelType;
  compressType: D3ModelCompressType;

  gltfSrc?: D3ModelSrc;
  mesh?: THREE.Mesh;
  topology?: ModelAttr;
  modelFile?: File;

  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
}

export class GoogleModelViewer extends React.Component<
  GoogleModelViewerProps,
  GoogleModelViewerState
> {
  get mixedProps(): D3ModelViewerProps {
    return mergeD3ModelViewerProps({ currentProps: this.props });
  }

  id = genId();
  $ref: any;

  state: GoogleModelViewerState = {
    type:
      this.mixedProps.type ||
      getModelType(this.mixedProps.fileName, this.mixedProps.src),
    compressType:
      this.mixedProps.compressType ||
      getModelCompressType(this.mixedProps.fileName, this.mixedProps.src),
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
  };

  componentDidMount() {
    this.loadModel(this.mixedProps);
  }

  componentWillReceiveProps(nextProps: GoogleModelViewerProps) {
    if (nextProps.src !== this.mixedProps.src) {
      this.loadModel(nextProps);
    }
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  async loadModel(props: GoogleModelViewerProps) {
    const modelFile = await getFileObjFromModelSrc({
      ...props,
      type: this.state.type,
      compressType: this.state.compressType,
    });

    // 判断是否可以进行预览
    if (!isSupportThreejsLoader(this.state.type)) {
      // 仅执行 ZIP 操作
      this.handleCompress();
      return;
    }

    try {
      const { gltf: gltfSrc, mesh } = await loadMesh(
        modelFile || props.src,
        this.state.type,
      );

      this.setState({ gltfSrc, mesh, modelFile }, () => {
        this.$ref = document.getElementById(this.id);
        if (this.$ref) {
          this.$ref.addEventListener('load', this.onLoad);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  onLoad = async () => {
    const { layoutOptions, onSnapshot, onTopology } = this.mixedProps;

    if (this.$ref) {
      // 返回快照
      if (onSnapshot) {
        setTimeout(async () => {
          const _snap = await this.$ref.toBlob({ idealAspect: true });
          onSnapshot(_snap);

          const cameraTarget = this.$ref.getCameraTarget();

          this.setState({ cameraX: cameraTarget.x, cameraY: cameraTarget.y });
        }, 1 * 1000);
      }
    }

    // 计算基础信息
    if (onTopology && this.state.mesh) {
      const topology = await calcTopology(this.state.mesh);

      this.setState({ topology });

      if (onTopology) {
        onTopology(topology);
      }
    }

    // 判断是否有 onCompress，有的话则进行压缩并且返回
    requestAnimationFrame(async () => {
      await this.handleCompress();
    });
  };

  handleCompress = async () => {
    const { src, onCompress } = this.mixedProps;
    const { modelFile } = this.state;

    if (modelFile && onCompress && src && this.state.compressType === 'none') {
      const buffer = await readFileAsArrayBufferAsync(modelFile);
      const intArray: Uint8Array = new Uint8Array(buffer);

      const zippedFile = UZIP.deflate(intArray);

      onCompress(zippedFile);
    }
  };

  render() {
    const {
      layoutOptions: { height, width },
      renderOptions: {
        withCameraControls,
        autoplay,
        autoRotate,
        shadowIntensity,
        backgroundColor,
      },
      customOptions: { externalAttr },
      style,
    } = this.mixedProps;

    const { gltfSrc, topology, cameraX, cameraY, cameraZ } = this.state;

    if (!gltfSrc) {
      return <Loader type="Puff" color="#00BFFF" height={100} width={100} />;
    }

    const attrs: any = { backgroundColor };

    if (withCameraControls) {
      attrs['camera-controls'] = true;
    }

    if (autoplay) {
      attrs.autoplay = true;
    }

    if (autoRotate) {
      attrs['auto-rotate'] = true;
    }

    return (
      <div className="rmv-gmv-container" style={{ width, height, ...style }}>
        <model-viewer
          id={this.id}
          className="rmv-gmv-model-viewer"
          src={gltfSrc}
          shadow-intensity={shadowIntensity}
          style={{ width: '100%', height: '100%', backgroundColor }}
          camera-target={`${cameraX === 0 ? 'auto' : `${cameraX}m`} ${
            cameraY === 0 ? 'auto' : `${cameraY}m`
          } ${cameraZ === 0 ? 'auto' : `${cameraZ}m`}`}
          min-field-of-view="10deg"
          max-field-of-view="180deg"
          {...attrs}
        />
        {topology && (
          <div className="rmv-gmv-attr-modal">
            <div className="item">
              尺寸：{toFixedNumber(topology.sizeX)} *{' '}
              {toFixedNumber(topology.sizeY)} * {toFixedNumber(topology.sizeZ)}{' '}
              {' mm'}
            </div>
            <div className="item">
              体积：{toFixedNumber(topology.volume)}
              {' mm³'}
            </div>
            <div className="item">
              面积：{toFixedNumber(topology.area, 2)}
              {' mm²'}
            </div>
            <div className="item">面片：{topology.triangleCnt} 个</div>
            {Object.keys(externalAttr).map(k => (
              <div className="item" key={k}>
                {k}：{externalAttr[k]}
              </div>
            ))}
          </div>
        )}
        {
          <>
            <Holdable
              finite={false}
              onPress={() => {
                this.setState({
                  cameraY:
                    this.state.cameraY +
                    (this.state.cameraY === 0 ? 1 : topology.sizeY / 10),
                });
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-up">
                <i />
              </div>
            </Holdable>
            <Holdable
              finite={false}
              onPress={() => {
                this.setState({
                  cameraY:
                    this.state.cameraY -
                    (this.state.cameraY === 0 ? 1 : topology.sizeY / 10),
                });
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-down">
                <i />
              </div>
            </Holdable>
            <Holdable
              finite={false}
              onPress={() => {
                this.setState({
                  cameraX:
                    this.state.cameraX -
                    (this.state.cameraX === 0 ? 1 : topology.sizeX / 20),
                });
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-left">
                <i />
              </div>
            </Holdable>
            <Holdable
              finite={false}
              onPress={() => {
                this.setState({
                  cameraX:
                    this.state.cameraX +
                    (this.state.cameraX === 0 ? 1 : topology.sizeX / 20),
                });
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-right">
                <i />
              </div>
            </Holdable>
          </>
        }
      </div>
    );
  }
}
