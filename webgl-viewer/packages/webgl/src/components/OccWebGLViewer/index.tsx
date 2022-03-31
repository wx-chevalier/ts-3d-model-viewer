import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Loader from 'react-loader-spinner';

import { IModelViewerProps } from '../../types';
import { ErrorFallback } from '../../utils/error';
import {
  getFileObjFromModelSrc,
  getModelCompressType,
  getModelType,
} from '../../utils/file_loader';
import { isSupportThreejsLoader } from '../../utils/mesh_loader';
import { WebGLViewer } from '../WebGLViewer';
import { OccEdge, OccFace, ShapesCombiner } from './ShapesCombiner';

interface IProps extends Partial<IModelViewerProps> {}

interface IState {
  mesh?: THREE.Mesh;
  modelFile?: File;
  isWorkerReady?: boolean;
}

declare global {
  interface Window {
    cadWorker: Worker;
    messageHandlers: Record<string, Function>;
  }
}

export class OccWebGLViewer extends React.Component<IProps, IState> {
  static displayName = 'OccWebGLViewer';

  viewerRef = React.createRef<WebGLViewer>();

  state: IState = {};

  get enableFreshView() {
    return this.viewerRef.current.enableFreshView;
  }

  get model() {
    return this.viewerRef.current.model;
  }

  get camera() {
    return this.viewerRef.current.camera;
  }

  get renderer() {
    return this.viewerRef.current.renderer;
  }

  get disableFreshView() {
    return this.viewerRef.current.disableFreshView;
  }

  componentDidMount(): void {
    // 注册到全局上下文中
    // Begins loading the CAD Kernel Web Worker
    if (window.Worker) {
      window.cadWorker = new Worker('/cad-worker/cad-worker.js');
      if (!window.messageHandlers) {
        window.messageHandlers = {};
      }

      window.messageHandlers['combineAndRenderShapes'] = ([
        faceList,
        edgeList,
      ]: [OccFace[], OccEdge[]]) => {
        const shapeCombiner = new ShapesCombiner(faceList, edgeList);

        const mesh = shapeCombiner.combineFaceAsMesh();

        this.setState({ mesh });
      };

      window.messageHandlers['log'] = (payload: any) => {
        console.log(payload);
      };

      window.messageHandlers['error'] = (payload: any) => {
        console.error(payload);
      };

      window.messageHandlers['startupCallback'] = () => {
        this.setState({ isWorkerReady: true });
        this.triggerModelConvert(this.props);
      };

      window.cadWorker.onmessage = function (e) {
        if (e.data.type in window.messageHandlers) {
          const response = window.messageHandlers[e.data.type](e.data.payload);
          if (response) {
            window.cadWorker.postMessage({
              type: e.data.type,
              payload: response,
            });
          }
        }
      };
    }
  }

  componentWillReceiveProps(nextProps: IProps) {
    if (nextProps.src !== this.props.src) {
      this.triggerModelConvert(nextProps);
    }
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  async triggerModelConvert(props: IProps) {
    const type = props.type || getModelType(props.fileName, undefined);

    if (['stp', 'step', 'iges'].includes(type)) {
      const modelFile = await getFileObjFromModelSrc({
        ...props,
        compressType:
          props.compressType || getModelCompressType(props.fileName, props.src),
      });

      this.setState({ modelFile });

      // 触发 OCC 转化
      window.cadWorker.postMessage({
        type: 'loadFiles',
        payload: [modelFile],
      });
    }
  }

  render() {
    const type =
      this.props.type || getModelType(this.props.fileName, undefined);

    if (isSupportThreejsLoader(type)) {
      return (
        <WebGLViewer
          ref={this.viewerRef}
          {...this.props}
          onLoad={() => {
            if (this.viewerRef.current.state.modelFile) {
              this.setState({
                modelFile: this.viewerRef.current.state.modelFile,
              });
            }
          }}
        />
      );
    }

    if (this.state.mesh && this.state.isWorkerReady) {
      return (
        <WebGLViewer
          ref={this.viewerRef}
          {...this.props}
          mesh={this.state.mesh}
        />
      );
    } else {
      return (
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
            <Loader type="Puff" color="#00BFFF" height={100} width={100} />
            {this.state.isWorkerReady ? (
              <span style={{ marginTop: 16 }}>CAD Worker has Started</span>
            ) : (
              <span style={{ marginTop: 16 }}>Starting CAD Worker</span>
            )}
            {this.state.isWorkerReady && !this.state.mesh && (
              <span style={{ marginTop: 16 }}>Converting Model</span>
            )}
          </div>
        </ErrorBoundary>
      );
    }
  }
}
