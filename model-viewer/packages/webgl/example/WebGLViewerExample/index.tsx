import './index.css';

import * as S from '@m-fe/utils';
import * as React from 'react';

import {
  ImageClipViewer,
  ObjectSnapshotGenerator,
  WebGLViewer,
} from '../../src';
import { deflate, zipped } from '../../src/utils/compressor';
export function WebGLViewerExample() {
  const viewerRef = React.useRef<WebGLViewer>();
  const [imgUrl, setImgUrl] = React.useState('');

  const getWebGLViewer = async () => {
    const m = viewerRef.current;
    m.enableFreshView();

    await S.sleep(3 * 1000);

    if (m) {
      new ObjectSnapshotGenerator(
        m.model,
        m.camera,
        m.renderer,
        async (dataUrl: string) => {
          setImgUrl(dataUrl);
          m.disableFreshView();
        },
      );
    }
  };

  const getModelFile = async (type: string) => {
    const m = viewerRef.current;

    await S.sleep(3 * 1000);

    if (m) {
      const modelFile = m.state.modelFile;
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
        <WebGLViewer
          key="2"
          type="stl"
          src="aa.stl"
          fileName="hollow_of__010.stl"
          width={1000}
          height={500}
          ref={$ref => {
            viewerRef.current = $ref;
          }}
          // onTopology={m => {
          //   // console.log(m);
          // }}
        />
        <button onClick={getWebGLViewer}>点击截图</button>
        <button onClick={() => getModelFile('stl')}>下载 .stl 模型文件</button>
        <button onClick={() => getModelFile('zip')}>下载 .zip 模型文件</button>
        <button onClick={() => getModelFile('zlib')}>
          下载 .zlib 模型文件
        </button>
        <br />
        {/* <WebGLViewer
        key="21"
        src="big.stl"
        fileName="BBB"
        width={'100vw'}
        height={400}
        layoutType="compact"
        onTopology={m => {
          // console.log(m);
        }}
        onSnapshot={dataUrl => {
          S.downloadUrl(dataUrl as string);
        }}
        onError={() => {
          console.error('Invalid');
        }}
      /> */}
        {/* <WebGLViewer
        key="22"
        src="big.glb"
        fileName="BBB"
        width={'100vw'}
        height={400}
        layoutType="compact"
        onTopology={m => {
          // console.log(m);
        }}
        onSnapshot={dataUrl => {
          S.downloadUrl(dataUrl as string);
        }}
        onError={() => {
          console.error('Invalid');
        }}
      /> */}
        <br />
        {/* <WebGLViewer
        key="3"
        type="obj"
        src="/file.obj"
        width={1000}
        height={400}
        onTopology={m => {
          // console.log(m);
        }}
      /> */}
        {/*
      <WebGLViewer
        key="33"
        type="stl"
        src="/error.stl"
        width={600}
        height={400}
        onTopology={m => {
          // console.log(m);
        }}
        onCompress={b => {
          // 执行解压缩
          const modelArray: Uint8Array = pako.inflate(new Uint8Array(b));
          console.log(modelArray);
        }}
        onError={err => {
          console.log(err);
        }}
      />
      <WebGLViewer
        key="4"
        type="stp"
        src="/ap203.stp"
        width={600}
        height={400}
        onTopology={m => {
          // console.log(m);
        }}
        // onCompress={b => {
        //   // S.downloadArraybuffer(b, 'application/zlib', 'ap203.stp.zlib');
        //   // 执行解压缩
        //   const modelArray: Uint8Array = pako.inflate(new Uint8Array(b));
        //   // S.downloadArraybuffer(modelArray, 'application/stp', 'ap203.stp');
        // }}
      /> */}
        {/* <WebGLViewer
        key="3"
        type="stl"
        src="https://ufc-prod.oss-cn-shenzhen.aliyuncs.com/1/model/202003/rc-upload-1584548085737-2/5.stl.zlib"
        // src="/test-n.stl"
        width={600}
        height={400}
        withAttr={true}
        externalAttr={{ 破损: '12' }}
        onTopology={m => {
          console.log(m);
        }}
        onSnapshot={b => {
          // S.downloadUrl(URL.createObjectURL(b));
        }}
      /> */}
        {/* <WebGLViewer
        key="4"
        type="stl"
        src="/hollow_of__010.stl.zlib"
        width={600}
        height={400}
        withAttr={true}
        externalAttr={{ 破损: '12' }}
      />
      <WebGLViewer
        key="5"
        type="stl"
        src="/stl_text.stl"
        width={600}
        height={400}
        withAttr={true}
        externalAttr={{ 破损: '12' }}
        // onTopology={m => {
        //   console.log(m);
        // }}
        // onSnapshot={b => {
        //   S.downloadUrl(URL.createObjectURL(b));
        // }}
        onCompress={b => {
          // S.downloadArraybuffer(b, 'application/zlib', 'hollow_of__010.stl.zlib');
        }}
      /> */}
      </div>
      <ImageClipViewer imgUrl={imgUrl} />
    </>
  );
}
