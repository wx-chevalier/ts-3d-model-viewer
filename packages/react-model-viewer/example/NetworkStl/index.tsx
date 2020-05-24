import * as React from 'react';

import { GoogleModelViewer } from '../../src';

export function NetworkStl() {
  return (
    <div>
      <GoogleModelViewer
        key="1"
        type="gltf"
        src="https://cdn.glitch.com/36cb8393-65c6-408d-a538-055ada20431b/Astronaut.glb?1542147958948"
      />
      <GoogleModelViewer
        key="2"
        type="stl"
        src="/tri-3.stl"
        onTopology={m => {
          // console.log(m);
        }}
        onZip={b => {
          // S.downloadArraybuffer(b, 'application/zlib', 'stl.zlib');
        }}
      />
      <GoogleModelViewer
        key="3"
        type="stl"
        // src="https://ufc-prod.oss-cn-shenzhen.aliyuncs.com/1/model/202003/rc-upload-1584548085737-2/5.stl.zlib"
        src="/test-n.stl"
        width={600}
        height={400}
        withAttr={true}
        onTopology={m => {
          console.log(m);
        }}
        onSnapshot={b => {
          // S.downloadUrl(URL.createObjectURL(b));
        }}
      />
    </div>
  );
}
