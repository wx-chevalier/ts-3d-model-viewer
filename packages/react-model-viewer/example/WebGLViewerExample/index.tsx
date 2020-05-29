import * as S from '@m-fe/utils';
import * as React from 'react';

import { WebGLViewer } from '../../src';

export function WebGLViewerExample() {
  return (
    <div>
      <WebGLViewer
        key="2"
        type="stl"
        src="/stl.zlib"
        width={600}
        height={400}
        onTopology={m => {
          // console.log(m);
        }}
        onZip={b => {
          // S.downloadArraybuffer(b, 'application/zlib', 'stl.zlib');
        }}
      />
      <br />
      <WebGLViewer
        key="2"
        type="obj"
        src="/file.obj"
        width={600}
        height={400}
        onTopology={m => {
          // console.log(m);
        }}
        onZip={b => {
          // S.downloadArraybuffer(b, 'application/zlib', 'stl.zlib');
        }}
      />
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
      />
      <WebGLViewer
        key="4"
        type="stl"
        src="/1.stl"
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
    </div>
  );
}
