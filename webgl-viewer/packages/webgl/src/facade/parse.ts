/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { sleep } from '@m-fe/utils';

import { D3ModelViewerProps, ModelAttr } from '../types';
import { calcTopology, deflate, ObjectSnapshotGenerator } from '../utils';
import { render } from '../viewers';
import { calcWallThicknessByViolence } from './thickness';

/** 解析模型并且进行一系列计算 */
export async function parseD3Model(
  _props: Partial<D3ModelViewerProps>,
  {
    withSnapshot = false,
    withWallThickness = false,
    withCompress = false,
  }: {
    withSnapshot: boolean;
    withWallThickness?: boolean;
    withCompress?: boolean;
  },
): Promise<{
  topology: ModelAttr;
  wallThickness: number;
  snapshot?: string;
  compressedArrayBuffer?: ArrayBuffer;
}> {
  let wallThickness = 0;
  let topology: ModelAttr;
  let snapshot: string;
  let compressedArrayBuffer: ArrayBuffer;

  return new Promise(async (resolve, reject) => {
    try {
      const { mesh, camera, renderer, modelFile, onDestroy } = await render({
        ..._props,
        withPlane: false,
        modelColor: 'rgb(34, 98, 246)',
      });

      /** 回调归结函数 */
      const onFinish = () => {
        if (!topology) {
          return;
        }

        if (withSnapshot && !snapshot) {
          return;
        }

        if (withCompress && !compressedArrayBuffer) {
          return;
        }

        resolve({ wallThickness, topology, snapshot, compressedArrayBuffer });

        onDestroy();
      };

      // 异步进行压缩操作
      deflate(modelFile).then(ab => {
        compressedArrayBuffer = ab;
        onFinish();
      });

      // 等待 1 秒
      await sleep(1 * 1000);

      topology = await calcTopology(mesh);

      if (withWallThickness) {
        try {
          wallThickness = calcWallThicknessByViolence(mesh);
        } catch (_) {
          console.error('>>>parseD3Model>>>getWallThickness>>>', _);
        }
      }

      if (withSnapshot) {
        // 执行截图
        await new ObjectSnapshotGenerator(
          mesh,
          camera,
          renderer,
          (dataUrl: string) => {
            // 执行清除操作
            snapshot = dataUrl;
            onFinish();
          },
        );
      }

      onFinish();
    } catch (_) {
      console.error('>>>facade>>>parseD3Model>>>error:', _);
      reject(_);
    }
  });
}
