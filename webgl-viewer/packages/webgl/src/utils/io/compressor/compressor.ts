import { readFileAsArrayBufferAsync } from '@m-fe/utils';
import JSZip from 'jszip';
import Pako from 'pako';
import workerize from 'workerize';

import { zipSourceCode } from './js-zip';
import { pakoSourceCode } from './pako';

/** 模型压缩 */
const workerScript = `
  ${pakoSourceCode}

  export function deflateInWorker(intArray){
    return pako.deflate(intArray)
  }

  export function inflateInWorker(intArray){
    return pako.inflate(intArray)
  }
`;

/** 执行解压操作 */
export async function inflate(modelFile: File) {
  let buffer = await readFileAsArrayBufferAsync(modelFile);
  let intArray: Uint8Array = new Uint8Array(buffer);
  let depressedFile;

  try {
    if (window.Worker) {
      const worker = workerize(workerScript);
      depressedFile = await worker.inflateInWorker(intArray);
    } else {
      depressedFile = Pako.inflate(intArray);
    }
  } catch (_) {
    console.error(_);
    depressedFile = Pako.inflate(intArray);
  }

  // 强制释放内存
  buffer = null;
  intArray = null;

  return depressedFile;
}

/**
 * zlib 文件压缩
 * @param modelFile
 * @returns
 */
export async function deflate(modelFile: File) {
  let buffer = await readFileAsArrayBufferAsync(modelFile);
  let intArray: Uint8Array = new Uint8Array(buffer);

  let deflatedFile;

  try {
    if (window.Worker) {
      const worker = workerize(workerScript);
      deflatedFile = await worker.deflateInWorker(intArray);
      Pako.inflate(deflatedFile);
    } else {
      deflatedFile = Pako.deflate(intArray);
    }
  } catch (_) {
    console.error(_);
    deflatedFile = Pako.deflate(intArray);
  }

  // 强制释放内存
  buffer = null;
  intArray = null;

  return deflatedFile;
}

/** zip 模型压缩 */
const jsZipWorkerScript = `
  ${zipSourceCode}

  export function zippedWorker(filename, intArray){
    const zip = new JSZip();
    zip.file(filename, intArray);
    return zip.generateAsync({
        type: 'uint8array',
        // 压缩算法
        compression: 'DEFLATE',
        compressionOptions: {
          // 压缩级别
          level: 9,
        },
      });
  }

  export function unzipWorker(intArray){
    return JSZip.loadAsync(intArray).then(zip => {
      const filename = Object.keys(zip.files)[0];
      return zip.file(filename).async('uint8array');
    });
  }
`;

/**
 * zip 文件压缩
 * @param modelFile
 * @returns
 */
export async function zipped(modelFile: File) {
  // 读取文件内容
  let buffer = await readFileAsArrayBufferAsync(modelFile);
  let intArray: Uint8Array = new Uint8Array(buffer);
  const zip = new JSZip();
  zip.file(modelFile.name, intArray);
  // 执行压缩操作
  let zippedFile;

  try {
    if (window.Worker) {
      const worker = workerize(jsZipWorkerScript);
      zippedFile = await worker.zippedWorker(modelFile.name, intArray);
    } else {
      zippedFile = await zip.generateAsync({
        type: 'uint8array',
        // 压缩算法
        compression: 'DEFLATE',
        compressionOptions: {
          // 压缩级别
          level: 9,
        },
      });
    }
  } catch (_) {
    console.error(_);
    zippedFile = await zip.generateAsync({
      type: 'uint8array',
      // 压缩算法
      compression: 'DEFLATE',
      compressionOptions: {
        // 压缩级别
        level: 9,
      },
    });
  }

  // 强制释放内存
  buffer = null;
  intArray = null;

  return zippedFile;
}

/**
 * zip 文件解压
 * @param modelFile
 * @returns
 */
export async function unzip(modelFile: File) {
  let buffer = await readFileAsArrayBufferAsync(modelFile);
  let intArray: Uint8Array = new Uint8Array(buffer);
  // 执行解压操作
  let unzipFile;
  try {
    if (window.Worker) {
      const worker = workerize(jsZipWorkerScript);
      unzipFile = await worker.unzipWorker(intArray);
    } else {
      unzipFile = await JSZip.loadAsync(intArray).then(zip => {
        const filename = Object.keys(zip.files)[0];
        return zip.file(filename).async('uint8array');
      });
    }
  } catch (_) {
    console.error(_);
    unzipFile = await JSZip.loadAsync(intArray).then(zip => {
      const filename = Object.keys(zip.files)[0];
      return zip.file(filename).async('uint8array');
    });
  }

  // 强制释放内存
  buffer = null;
  intArray = null;

  return unzipFile;
}
