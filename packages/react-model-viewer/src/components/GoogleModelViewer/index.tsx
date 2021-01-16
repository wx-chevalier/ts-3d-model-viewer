import { genId, readFileAsArrayBufferAsync } from '@m-fe/utils';
import UZIP from 'pako';
import * as React from 'react';
import Loader from 'react-loader-spinner';
import * as THREE from 'three';

import {
  IModelViewerProps,
  ModelCompressType,
  ModelSrc,
  ModelType,
  defaultModelViewerProps
} from '../../types/IModelViewerProps';
import { ModelAttr } from '../../types/ModelAttr';
import { toFixedNumber } from '../../utils';
import {
  getFileObjFromModelSrc,
  getModelCompressType,
  getModelType
} from '../../utils/file_loader';
import { calcTopology } from '../../utils/mesh';
import { canTransformToGLTF, loadMesh } from '../../utils/mesh_loader';
import { Holdable } from '../Holdable';

import './index.css';

export interface GoogleModelViewerProps extends IModelViewerProps {}

interface GoogleModelViewerState {
  type: ModelType;
  compressType: ModelCompressType;

  gltfSrc?: ModelSrc;
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
  static defaultProps = { ...defaultModelViewerProps };

  id = genId();
  $ref: any;

  state: GoogleModelViewerState = {
    type: this.props.type || getModelType(this.props.fileName, this.props.src),
    compressType:
      this.props.compressType || getModelCompressType(this.props.fileName, this.props.src),
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0
  };

  componentDidMount() {
    this.loadModel(this.props);
  }

  componentWillReceiveProps(nextProps: GoogleModelViewerProps) {
    if (nextProps.src !== this.props.src) {
      this.loadModel(nextProps);
    }
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  async loadModel(props: GoogleModelViewerProps) {
    const modelFile = await getFileObjFromModelSrc({
      ...props,
      type: this.state.type,
      compressType: this.state.compressType
    });

    // 判断是否可以进行预览
    if (!canTransformToGLTF(this.state.type)) {
      // 仅执行 ZIP 操作
      this.handleZip();
      return;
    }

    try {
      const { gltf: gltfSrc, mesh } = await loadMesh(
        modelFile || props.src,
        this.state.type,
        this.props.onError
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
    const { withAttr, onSnapshot, onTopology } = this.props;

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
    if ((onTopology || withAttr) && this.state.mesh) {
      const topology = await calcTopology(this.state.mesh);

      this.setState({ topology });

      if (onTopology) {
        onTopology(topology);
      }
    }

    // 判断是否有 onZip，有的话则进行压缩并且返回
    requestAnimationFrame(async () => {
      await this.handleZip();
    });
  };

  handleZip = async () => {
    const { src, onZip } = this.props;
    const { modelFile } = this.state;

    if (modelFile && onZip && src && this.state.compressType === 'none') {
      const buffer = await readFileAsArrayBufferAsync(modelFile);
      const intArray: Uint8Array = new Uint8Array(buffer);

      const zippedFile = UZIP.deflate(intArray);

      onZip(zippedFile);
    }
  };

  render() {
    const {
      cameraControls,
      autoplay,
      autoRotate,
      shadowIntensity,
      backgroundColor,
      width,
      height,
      style,
      withAttr,
      externalAttr,
      withJoystick
    } = this.props;

    const { gltfSrc, topology, cameraX, cameraY, cameraZ } = this.state;

    if (!gltfSrc) {
      return <Loader type="Puff" color="#00BFFF" height={100} width={100} />;
    }

    const attrs: any = { backgroundColor };

    if (cameraControls) {
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
        {withAttr && topology && (
          <div className="rmv-gmv-attr-modal">
            <div className="item">
              尺寸：{toFixedNumber(topology.sizeX)} * {toFixedNumber(topology.sizeY)} *{' '}
              {toFixedNumber(topology.sizeZ)} {' mm'}
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
        {withJoystick && (
          <>
            <Holdable
              finite={false}
              onPress={() => {
                this.setState({
                  cameraY: this.state.cameraY + (this.state.cameraY === 0 ? 1 : topology.sizeY / 10)
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
                  cameraY: this.state.cameraY - (this.state.cameraY === 0 ? 1 : topology.sizeY / 10)
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
                  cameraX: this.state.cameraX - (this.state.cameraX === 0 ? 1 : topology.sizeX / 20)
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
                  cameraX: this.state.cameraX + (this.state.cameraX === 0 ? 1 : topology.sizeX / 20)
                });
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-right">
                <i />
              </div>
            </Holdable>
          </>
        )}
      </div>
    );
  }
}
