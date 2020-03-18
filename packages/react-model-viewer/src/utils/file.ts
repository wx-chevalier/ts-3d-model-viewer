import axios from 'axios';
import pako from 'pako';
import * as S from 'ueact-utils';

import { IModelViewerProps, ModelSrc, ModelType } from '../types/IModelViewerProps';

export function getModelType(fileName: string, model: ModelSrc): ModelType {
  const name: string = fileName || (model instanceof File ? model.name : model);

  if (name.endsWith('.stl')) {
    return 'stl';
  } else if (name.endsWith('.glb')) {
    return 'glb';
  } else if (name.endsWith('.obj')) {
    return 'obj';
  } else if (name.endsWith('.ply')) {
    return 'ply';
  }

  return 'stl';
}

/** 将模型统一转化为文件对象 */
export async function getFileObjFromModelSrc(props: IModelViewerProps): Promise<File> {
  // 判断是否为 ZIP 文件
  if (props.zippedSrc) {
    let zippedFile;

    if (props.src instanceof File) {
      zippedFile = props.src;
    } else {
      // 将 Blob 转化为文件
      const { data: blob } = await axios.get<Blob>(props.zippedSrc as string, {
        responseType: 'blob'
      });

      zippedFile = S.blobToFile(blob);
    }

    const arrayBuffer = await S.readFileAsArrayBufferAsync(zippedFile);

    // 解压缩文件
    const modelArray: Uint8Array = pako.inflate(new Uint8Array(arrayBuffer));

    return S.arrayBufferToFile(modelArray.buffer, 'application/stl', props.fileName);
  } else {
    // 否则作为正常处理
    if (props.src instanceof File) {
      return props.src;
    } else {
      try {
        // 将 Blob 转化为文件
        const { data: blob } = await axios.get<Blob>(props.src, {
          responseType: 'blob',
          timeout: props.timeout
        });

        return S.blobToFile(blob, S.newUri(props.src).filename());
      } catch (e) {
        return null;
      }
    }
  }
}
