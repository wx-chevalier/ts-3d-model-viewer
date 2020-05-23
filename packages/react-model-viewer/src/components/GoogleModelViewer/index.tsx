import * as S from '@m-fe/utils';
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
import { getFileObjFromModelSrc, getModelCompressType, getModelType } from '../../utils/file';
import { calcTopology } from '../../utils/mesh';
import { transformToGLTF } from '../../utils/GLTF';
import { Holdable } from '../Holdable';

import './index.css';

export interface GoogleModelViewerProps extends IModelViewerProps {
  type: ModelType;
  withJoystick: boolean;
}

interface GoogleModelViewerState {
  type: ModelType;
  compressType: ModelCompressType;

  gltfSrc?: ModelSrc;
  mesh?: THREE.Mesh;
  topology?: ModelAttr;

  cox?: number;
  coy?: number;
  coz?: number;
}

export class GoogleModelViewer extends React.Component<
  GoogleModelViewerProps,
  GoogleModelViewerState
> {
  static defaultProps = { ...defaultModelViewerProps, withJoystick: true };

  id = S.genId();
  $ref: any;

  state: GoogleModelViewerState = {
    type: this.props.type || getModelType(this.props.fileName, this.props.src),
    compressType:
      this.props.compressType || getModelCompressType(this.props.fileName, this.props.src),
    cox: 0,
    coy: 0
  };

  componentDidMount() {
    this._setInnerSrc(this.props);
  }

  componentWillReceiveProps(nextProps: GoogleModelViewerProps) {
    if (nextProps.src !== this.props.src) {
      this._setInnerSrc(nextProps);
    }
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  private async _setInnerSrc(props: GoogleModelViewerProps) {
    const modelFile = await getFileObjFromModelSrc({
      ...props,
      type: this.state.type,
      compressType: this.state.compressType
    });

    try {
      const { gltf: gltfSrc, mesh } = await transformToGLTF(
        modelFile || props.src,
        this.state.type
      );

      this.setState({ gltfSrc, mesh }, () => {
        this.$ref = document.getElementById(this.id);
        if (this.$ref) {
          this.$ref.addEventListener('load', this.onLoad);
        }
      });
    } catch (e) {
      console.error(e);
    }

    // 判断是否有 onZip，有的话则进行压缩并且返回
    requestAnimationFrame(async () => {
      // 仅在传入了 Zipped 文件的情况下调用
      if (modelFile && props.onZip && props.src && this.state.compressType === 'none') {
        const buffer = await S.readFileAsArrayBufferAsync(modelFile);
        const intArray: Uint8Array = new Uint8Array(buffer);

        const zippedFile = UZIP.deflate(intArray);

        props.onZip(zippedFile);
      }
    });
  }

  onLoad = async () => {
    const { withAttr, onSnapshot, onTopology } = this.props;

    if (this.$ref) {
      const cameraTarget = this.$ref.getCameraTarget();

      this.setState({ cox: cameraTarget.x, coy: cameraTarget.y });

      // 返回快照
      if (onSnapshot) {
        setTimeout(async () => {
          const _snap = await this.$ref.toBlob({ idealAspect: true });
          onSnapshot(_snap);
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
      withJoystick
    } = this.props;

    const { gltfSrc, topology, cox, coy } = this.state;

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
          style={{ width: '100%', height: '100%', backgroundColor: 'rgb(55,65,92)' }}
          camera-target={`${cox === 0 ? 'auto' : `${cox}m`} ${coy === 0 ? 'auto' : `${coy}m`} auto`}
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
            <div className="item">面片：{topology.triangleCnt} 个</div>
            <div className="item">
              面积：{toFixedNumber(topology.area, 2)}
              {' mm²'}
            </div>
          </div>
        )}
        {withJoystick && (
          <>
            <Holdable
              finite={false}
              onPress={() => {
                console.log(111);
                this.setState({
                  coy: this.state.coy - (this.state.coy === 0 ? 1 : topology.sizeY / 10)
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
                  coy: this.state.coy + (this.state.coy === 0 ? 1 : topology.sizeY / 10)
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
                  cox: this.state.cox + (this.state.cox === 0 ? 1 : topology.sizeX / 20)
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
                  cox: this.state.cox - (this.state.cox === 0 ? 1 : topology.sizeX / 20)
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
