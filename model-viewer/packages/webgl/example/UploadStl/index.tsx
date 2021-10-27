import Upload from 'rc-upload';
import * as React from 'react';

import { GoogleModelViewer } from '../../src';

export const UploadStl = () => {
  const [fileMap, setFileMap] = React.useState<Record<string, File>>({});

  return (
    <div>
      <Upload
        action="/"
        customRequest={({ file, filename }) => {
          setFileMap({
            ...fileMap,
            [filename]: file,
          });
        }}
      >
        <button>点击上传</button>
      </Upload>
      {Object.keys(fileMap).map(n => (
        <GoogleModelViewer key={n} src={fileMap[n]} />
      ))}
    </div>
  );
};
