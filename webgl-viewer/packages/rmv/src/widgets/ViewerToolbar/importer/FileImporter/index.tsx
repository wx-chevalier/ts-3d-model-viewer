import React, { useRef } from 'react';

import { ThreeRenderer } from '../../../../engine';
import { i18nFormat } from '../../../../utils';

export interface FileImporterProps {
  className?: string;
  style?: Record<string, string | number>;

  threeRenderer: ThreeRenderer;
}

export const FileImporter = ({
  className,
  style,
  threeRenderer,
}: FileImporterProps) => {
  const fileRef = useRef<HTMLInputElement>();

  return (
    <span
      onClick={() => {
        if (fileRef.current) {
          fileRef.current.click();
        }
      }}
    >
      {i18nFormat('打开本地文件')}
      <span style={{ display: 'none' }}>
        <input
          ref={fileRef}
          id="file"
          type="file"
          onChange={async () => {
            const file = fileRef.current.files[0];

            threeRenderer.init({
              src: file,
              fileName: file.name,
              type: undefined,
              compressType: undefined,
            });
          }}
        />
      </span>
    </span>
  );
};

FileImporter.displayName = 'FileImporter';
