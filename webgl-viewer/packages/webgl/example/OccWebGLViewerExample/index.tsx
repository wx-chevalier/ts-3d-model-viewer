import './index.css';

import * as S from '@m-fe/utils';
import * as React from 'react';

import {
  ImageClipViewer,
  ObjectSnapshotGenerator,
  OccWebGLViewer,
  parseD3Model,
} from '../../src';

export function OccWebGLViewerExample() {
  const viewerRef = React.useRef<OccWebGLViewer>();
  const [imgUrl, setImgUrl] = React.useState('');

  const generateSnapshot = async () => {
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

  return (
    <>
      <div>
        <OccWebGLViewer
          key="2"
          src="https://assets.unionfab.com/%E6%B5%8B%E8%AF%95%E6%A8%A1%E5%9E%8B/formats/STEP/abstract_pca.step"
          // src="http://192.168.3.71:4243/file/md5/b3474995f06b6af2f62262ecccc727b5/download?name=6-DOFRobotMechanicalArmKitsv19.step"
          fileName="6-DOFRobotMechanicalArmKitsv19.step"
          compressType="none"
          width={1000}
          height={500}
          ref={$ref => {
            viewerRef.current = $ref;
          }}
          autoSnapshot={true}
          onTopology={topo => {
            console.log(topo);
          }}
          onSnapshot={dataUrl => {
            console.log('>>>dataUrl>>>', dataUrl);
          }}
        />
        {/* <OccWebGLViewer
          key="2"
          type="stp"
          src="/2.stp"
          fileName="2.stp"
          compressType="none"
          width={1000}
          height={500}
          ref={$ref => {
            viewerRef.current = $ref;
          }}
          onTopology={topo => {
            console.log(topo);
          }}
        /> */}
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
        <br />
      </div>
      <ImageClipViewer imgUrl={imgUrl} />
    </>
  );
}
