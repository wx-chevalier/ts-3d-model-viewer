import * as React from 'react';

import { WebGLViewer, parseD3Model } from '../../src';

export function WebGLViewerExample() {
  React.useEffect(() => {
    (async () => {
      const { snapshot, topology, wallThickness } = await parseD3Model(
        {
          type: 'stl',
          src: '/hollow_of__010.stl',
          width: 1000,
          height: 500
        },
        { withSnapshot: true, withWallThickness: false }
      );

      console.log(topology, wallThickness);

      // S.downloadUrl(snapshot as string);
    })();
  }, []);

  return (
    <div>
      <WebGLViewer
        key="2"
        type="stl"
        src="/hollow_of__010.stl"
        fileName="AAAAAAAAAAAAAAAAAAAAAAAAA"
        width={1000}
        height={400}
        onTopology={m => {
          // console.log(m);
        }}
      />
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
        onZip={b => {
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
        // onZip={b => {
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
        onZip={b => {
          // S.downloadArraybuffer(b, 'application/zlib', 'hollow_of__010.stl.zlib');
        }}
      /> */}
    </div>
  );
}
