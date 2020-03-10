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
import { calcTopology } from '../../utils/mesh';
import { transformToGLTF } from '../../utils/GLTF';

export interface GoogleModelViewerProps extends IModelViewerProps {
  type: ModelType;
}

interface GoogleModelViewerState {
  gltfSrc?: ModelSrc;
  mesh?: THREE.Mesh;
}

export class GoogleModelViewer extends React.Component<
  GoogleModelViewerProps,
  GoogleModelViewerState
> {
  static defaultProps = { ...defaultModelViewerProps };

  id = S.genId();
  $ref: any;
  state: GoogleModelViewerState = {};

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
    const { gltf: gltfSrc, mesh } = await transformToGLTF(props.src, props.type);

    this.setState({ gltfSrc, mesh }, () => {
      this.$ref = document.getElementById(this.id);
      if (this.$ref) {
        this.$ref.addEventListener('load', this.onLoad);
      }
    });
  }

  onLoad = async () => {
    const { onSnapshot, onTopology } = this.props;

    if (this.$ref) {
      // 返回快照
      if (onSnapshot) {
        const _snap = await this.$ref.toBlob({ idealAspect: true });
        onSnapshot(_snap);
      }
    }

    // 计算基础信息
    if (onTopology && this.state.mesh) {
      const topology = await calcTopology(this.state.mesh);
      onTopology(topology);
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
      style
    } = this.props;

    const { gltfSrc } = this.state;

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
          src={gltfSrc}
          shadow-intensity={shadowIntensity}
          width={width}
          height={height}
          {...attrs}
        />
      </div>
    );
  }
}
