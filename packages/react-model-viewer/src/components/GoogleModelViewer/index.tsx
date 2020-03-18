import UZIP from 'pako';
import * as React from 'react';
import Loader from 'react-loader-spinner';
import * as THREE from 'three';
import * as S from 'ueact-utils';

import {
  IModelViewerProps,
  ModelSrc,
  ModelType,
  defaultModelViewerProps
} from '../../types/IModelViewerProps';
import { ModelAttr } from '../../types/ModelAttr';
import { toFixedNumber } from '../../utils';
import { getFileObjFromModelSrc, getModelType } from '../../utils/file';
import { calcTopology } from '../../utils/mesh';
import { transformToGLTF } from '../../utils/GLTF';

import './index.css';

export interface GoogleModelViewerProps extends IModelViewerProps {
  type: ModelType;
}

interface GoogleModelViewerState {
  gltfSrc?: ModelSrc;
  mesh?: THREE.Mesh;
  topology?: ModelAttr;
  type: ModelType;
}

export class GoogleModelViewer extends React.Component<
  GoogleModelViewerProps,
  GoogleModelViewerState
> {
  static defaultProps = { ...defaultModelViewerProps };

  id = S.genId();
  $ref: any;
  state: GoogleModelViewerState = {
    type:
      this.props.type || getModelType(this.props.fileName, this.props.src || this.props.zippedSrc)
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
    const modelFile = await getFileObjFromModelSrc({ ...props, type: this.state.type });

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
      if (modelFile && props.onZip && props.src && !props.zippedSrc) {
        const buffer = await S.readFileAsArrayBufferAsync(modelFile);
        const intArray: Uint8Array = new Uint8Array(buffer);

        const zippedFile = UZIP.deflate(intArray);

        props.onZip(zippedFile);
      }
    });
  }

  onLoad = async () => {
    const { onSnapshot, onTopology } = this.props;

    if (this.$ref) {
      // 返回快照
      if (onSnapshot) {
        setTimeout(async () => {
          const _snap = await this.$ref.toBlob({ idealAspect: true });
          onSnapshot(_snap);
        }, 1 * 1000);
      }
    }

    // 计算基础信息
    if (onTopology && this.state.mesh) {
      const topology = await calcTopology(this.state.mesh);

      onTopology(topology);

      this.setState({ topology });
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
      withAttr
    } = this.props;

    const { gltfSrc, topology } = this.state;

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
          style={{ width: '100%', height: '100%' }}
          {...attrs}
        />
        {withAttr && topology && (
          <div className="rmv-gmv-attr-modal">
            <div className="item">
              尺寸（mm）：{topology.sizeX} * {topology.sizeY} * {topology.sizeZ}
            </div>
            <div className="item">体积：{toFixedNumber(topology.volume)}</div>
            <div className="item">面片：{topology.triangleCnt}</div>
          </div>
        )}
      </div>
    );
  }
}
