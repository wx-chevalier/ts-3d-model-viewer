import { readFileAsArrayBufferAsync } from '@m-fe/utils';
import UZIP from 'pako';
import workerize from 'workerize';

/** 模型压缩 */
const workerScript = `
  importScripts("https://libs.cdnjs.net/pako/0.1.0/pako.min.js");

  export function deflateInWorker(intArray){
    return pako.deflate(intArray)
  }
`;

export async function deflate(modelFile: File) {
  let buffer = await readFileAsArrayBufferAsync(modelFile);
  let intArray: Uint8Array = new Uint8Array(buffer);

  // 执行压缩操作
  let zippedFile;

  try {
    if (window.Worker) {
      const worker = workerize(workerScript);
      zippedFile = await worker.deflateInWorker(intArray);
      UZIP.inflate(zippedFile);
    } else {
      zippedFile = UZIP.deflate(intArray);
    }
  } catch (_) {
    console.error(_);
    zippedFile = UZIP.deflate(intArray);
  }

  // 强制释放内存
  buffer = null;
  intArray = null;

  return zippedFile;
}
