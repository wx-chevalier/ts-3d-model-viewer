/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

import { D3ModelCompressType, D3ModelViewerProps } from '../types';
import {
  deflate,
  getFileObjFromModelSrc,
  getModelCompressType,
} from '../utils';

export async function compressD3Model(
  props: Partial<D3ModelViewerProps>,
  _targetCompressType: D3ModelCompressType, // TODO: 后续支持不同的压缩类型
): Promise<ArrayBuffer> {
  const compressType =
    props.compressType || getModelCompressType(props.fileName, props.src);
  const modelFile = await getFileObjFromModelSrc({
    ...props,
    compressType,
  });

  // 异步进行压缩操作
  const ab = await deflate(modelFile);

  return ab;
}
