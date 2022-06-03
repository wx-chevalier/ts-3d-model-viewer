import './index.css';

import * as S from '@m-fe/utils';
import * as React from 'react';

import {
  deflate,
  ImageClipViewer,
  ObjectSnapshotGenerator,
  parseD3Model,
  ThreeViewer,
  zipped,
} from '../../src';

export function ThreeViewerExample() {
  const viewerRef = React.useRef<ThreeViewer>();
  const [imgUrl, setImgUrl] = React.useState('');

  const generateSnapshot = async () => {
    const m = viewerRef.current;
    const threeRenderer = m.threeRenderer;

    threeRenderer.changeTheme('fresh');

    await S.sleep(3 * 1000);

    if (m) {
      new ObjectSnapshotGenerator(
        threeRenderer.context.model,
        threeRenderer.context.camera,
        threeRenderer.context.renderer,
        async (dataUrl: string) => {
          setImgUrl(dataUrl);
          threeRenderer.changeTheme('default');
        },
      );
    }
  };

  const saveModelFileAs = async (type: string) => {
    const m = viewerRef.current;

    await S.sleep(3 * 1000);

    const threeRenderer = m.threeRenderer;

    if (m) {
      const modelFile = threeRenderer.context.modelFile;
      let modelArray: Uint8Array;
      let filetype: string;
      let filename: string;
      if (type === 'zip') {
        modelArray = await zipped(modelFile);
        filetype = 'application/zip';
        filename = `${modelFile.name}.zip`;
      }

      if (type === 'zlib') {
        modelArray = await deflate(modelFile);
        filetype = 'application/zlib';
        filename = `${modelFile.name}.zlib`;
      }

      if (type === 'stl') {
        const buffer = await S.readFileAsArrayBufferAsync(modelFile);
        modelArray = new Uint8Array(buffer);
        filetype = 'application/stl';
        filename = `${modelFile.name}`;
      }

      if (modelArray && filetype && filename) {
        S.downloadArraybuffer(modelArray, filetype, filename);
      } else {
        console.log('下载失败');
      }
    }
  };

  return (
    <>
      <div>
        <ThreeViewer
          key="2"
          type="stl"
          src="https://oss-huitong-foshan-pri.oss-cn-shenzhen.aliyuncs.com/TENANT-109/model/202110/d3381eb6-08c1-4f06-9456-36edfaad6d5f/Spider_ascii.stl"
          fileName="Spider_ascii.stl"
          compressType="zlib"
          layoutOptions={{
            width: 1000,
            height: 500,
          }}
          ref={$ref => {
            viewerRef.current = $ref;
          }}
        />
        <button onClick={generateSnapshot}>点击截图</button>
        <button
          onClick={async () => {
            const { topology, snapshot } = await parseD3Model(
              {
                src:
                  'https://oss-huitong-foshan-pri.oss-cn-shenzhen.aliyuncs.com/TENANT-109/model/202110/68808152-1958-4ebe-8bcd-622817e5bd86/box_UTF16BE.obj',
                type: 'obj',
                compressType: 'zlib',
              },
              { withSnapshot: true },
            );

            console.log(topology, snapshot);
          }}
        >
          浏览器内解析
        </button>
        <button onClick={() => saveModelFileAs('stl')}>
          下载 .stl 模型文件
        </button>
        <button onClick={() => saveModelFileAs('zip')}>
          下载 .zip 模型文件
        </button>
        <button onClick={() => saveModelFileAs('zlib')}>
          下载 .zlib 模型文件
        </button>
        <br />
      </div>
      <ImageClipViewer imgUrl={imgUrl} />
    </>
  );
}