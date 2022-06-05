import * as U from '@m-fe/utils';

import { useViewerStateStore } from '../../../stores';
import { D3ModelViewerProps } from '../../../types';
import { OccEdge, OccFace, ShapesCombiner } from '../../cad';

declare global {
  interface Window {
    cadWorker: Worker;
    cadWorkerBasePath: string;
    messageHandlers: Record<string, Function>;
    occtLoader: OcctLoader;
  }
}

export class OcctLoader {
  mesh?: THREE.Mesh;
  isWorkerReady?: boolean;

  static getInstance() {
    if (window.occtLoader) {
      return window.occtLoader;
    }

    window.occtLoader = new OcctLoader();

    return window.occtLoader;
  }

  constructor() {
    this.initWorker();
  }

  async initWorker() {
    if (window.Worker) {
      useViewerStateStore.setState({
        loaderEvent: 'Loading cad worker',
      });

      window.cadWorker = new Worker(
        (window.cadWorkerBasePath || '/cad-worker') + '/cad-worker.js',
      );

      if (!window.messageHandlers) {
        window.messageHandlers = {};
      }

      window.messageHandlers['combineAndRenderShapes'] = ([
        faceList,
        edgeList,
      ]: [OccFace[], OccEdge[]]) => {
        const shapeCombiner = new ShapesCombiner(faceList, edgeList);

        this.mesh = shapeCombiner.combineFaceAsMesh();
      };

      window.messageHandlers['log'] = (payload: any) => {
        console.log(payload);
      };

      window.messageHandlers['error'] = (payload: any) => {
        console.error(payload);
      };

      window.messageHandlers['startupCallback'] = () => {
        console.log(
          '>>>OcctLoader>>>componentDidMount>>>initWorker>>>successfully',
        );

        useViewerStateStore.setState({ loaderEvent: 'Cad worker has loaded' });
        this.isWorkerReady = true;
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

  async load(file: File, props: D3ModelViewerProps): Promise<THREE.Mesh> {
    console.log('>>>OcctLoader>>>load>>>props: ', props);

    await this.waitForWorkerReady();

    console.log('>>>OcctLoader>>>load>>>worker ready');

    return new Promise(async (resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = ((_: FileReader, ev: any) => {
        console.error('>>>OcctLoader>>>load>>>reader>>>error:', ev);
        if (props.onError) {
          props.onError(new Error('Invalid cad file text'));
        }
      }) as any;

      reader.onload = async () => {
        const cadFileText = reader.result;

        console.log(
          '>>>OcctLoader>>>load:',
          file,
          '>>>cadFileText:',
          cadFileText,
        );

        useViewerStateStore.setState({
          loaderEvent: 'Start parse the cad file',
        });

        window.cadWorker.postMessage({
          type: 'loadCadFiles',
          payload: [{ text: cadFileText, fileName: props.fileName }],
        });

        this.mesh = undefined;

        // 等待解析完毕
        for (let i = 0; i < 100; i++) {
          await U.sleep(2.5 * 1000);

          if (this.mesh) {
            resolve(this.mesh);
            return;
          }
        }

        reject(new Error('Parse cad file timeout'));
      };

      await reader.readAsText(file);
    });
  }

  async waitForWorkerReady() {
    for (let i = 0; i < 100; i++) {
      if (this.isWorkerReady) {
        return;
      }

      await U.sleep(2.5 * 1000);
    }

    console.error(
      '>>>OcctLoader>>>waitForWorkerReady>>>error:',
      'worker timeout',
    );

    throw new Error("Can't load OCCT CAD file");
  }
}
