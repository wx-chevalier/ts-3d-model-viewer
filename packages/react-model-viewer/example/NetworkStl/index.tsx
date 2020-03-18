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
        src="/test.stl"
        onTopology={m => {
          console.log(m);
        }}
        onSnapshot={b => {
          console.log(b);
        }}
        onZip={b => {
          // S.downloadArraybuffer(b, 'application/zlib', 'stl.zlib');
        }}
      />
      <GoogleModelViewer
        key="3"
        type="stl"
        zippedSrc="/test.zlib"
        width={600}
        height={400}
        withAttr={true}
        onTopology={m => {
          console.log(m);
        }}
      />
    </div>
  );
}
