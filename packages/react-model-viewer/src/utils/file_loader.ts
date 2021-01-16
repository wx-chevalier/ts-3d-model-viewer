import { arrayBufferToFile, blobToFile, newUri, readFileAsArrayBufferAsync } from '@m-fe/utils';
import pako from 'pako';

import {
  IModelViewerProps,
  ModelCompressType,
  ModelSrc,
  ModelType
} from '../types/IModelViewerProps';
import { inflate } from './compressor';

/** 根据模型名称推导出可能的类型 */
export function getModelType(fileName: string, model: ModelSrc): ModelType {
  const name: string = (model instanceof File ? model.name : model) || fileName || '';

  if (name.indexOf('.stl') > -1) {
    return 'stl';
  } else if (name.indexOf('.glb') > -1) {
    return 'glb';
  } else if (name.indexOf('.obj') > -1) {
    return 'obj';
  } else if (name.indexOf('.ply') > -1) {
    return 'ply';
  }

  return 'stl';
}

/** 根据模型名称推导出可能的压缩类型 */
export function getModelCompressType(fileName: string, model: ModelSrc): ModelCompressType {
  const name: string = (model instanceof File ? model.name : model) || fileName || '';

  if ((name || '').indexOf('.zlib') > -1) {
    return 'zlib';
  }

  return 'none';
}

/** 将模型统一转化为文件对象 */
export async function getFileObjFromModelSrc(props: IModelViewerProps): Promise<File> {
  // 判断是否为 ZIP 文件
  if (props.compressType === 'zlib') {
    let zippedFile;

    if (props.src instanceof File) {
      zippedFile = props.src;
    } else {
      // 将 Blob 转化为文件
      const blob = await (
        await fetch(props.src as string, {
          cache: 'force-cache'
        })
      ).blob();

      zippedFile = blobToFile(blob);
    }

    // 解压缩文件
    const modelArray: Uint8Array = await inflate(zippedFile);

    return arrayBufferToFile(modelArray.buffer, 'application/stl', props.fileName);
  } else {
    // 否则作为正常处理
    if (props.src instanceof File) {
      return props.src;
    } else {
      try {
        // 将 Blob 转化为文件
        const blob = await (
          await fetch(props.src as string, {
            cache: 'force-cache'
          })
        ).blob();

        return blobToFile(blob, newUri(props.src).filename());
      } catch (e) {
        return null;
      }
    }
  }
}
