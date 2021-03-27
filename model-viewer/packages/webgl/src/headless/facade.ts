/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { sleep } from '@m-fe/utils';

import { IModelViewerProps, ModelAttr } from '../types';
import { ScreenshotObject } from '../types/ScreenshotObject';
import { calcTopology } from '../utils/mesh';
import { render } from './render';

/** 生成模型截图 */
export async function parseD3Model(
  _props: Partial<IModelViewerProps>,
  { withSnapshot = false }: { withSnapshot: boolean }
): Promise<{
  topology: ModelAttr;
  snapshot?: string;
}> {
  return new Promise(async (resolve, reject) => {
    try {
      const { mesh, camera, renderer, onDestroy } = await render(_props);

      // 等待 1 秒
      await sleep(1 * 1000);

      const topology = await calcTopology(mesh);

      if (withSnapshot) {
        // 执行截图
        new ScreenshotObject(mesh, camera, renderer, (dataUrl: string) => {
          // 执行清除操作
          resolve({ snapshot: dataUrl, topology });
          onDestroy();
        });
      } else {
        onDestroy();

        return { topology };
      }
    } catch (_) {
      console.error(_);
      reject(_);
    }
  });
}
