import * as React from 'react';

import { GoogleModelViewer } from '../../src';

export default function Simple() {
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
        src="https://ufc-assets.oss-cn-shanghai.aliyuncs.com/test/pr2_head_pan.stl"
        onTopology={m => {
          console.log(m);
        }}
      />
    </div>
  );
}
