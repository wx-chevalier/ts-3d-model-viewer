import 'cropperjs/dist/cropper.min.css';
import './index.css';

import Button from 'antd/lib/button';
import Divider from 'antd/lib/divider';
import Space from 'antd/lib/space';
import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'react-cropper';

import { useViewerStateStore } from '../../stores';
import { i18nFormat } from '../../utils';

interface IProps {}

export const SnapshotClipViewer = ({}: IProps) => {
  const store = useViewerStateStore();

  const [clipImgUrl, setClipImgUrl] = useState('');
  const cropperRef = useRef<HTMLImageElement>(null);

  const onClipImageUrl = () => {
    const imageElement: any = cropperRef?.current;
    const cropper: any = imageElement?.cropper;
    setClipImgUrl(cropper?.getCroppedCanvas()?.toDataURL('image/png'));
  };

  useEffect(() => {
    if (store.snapshotDataUrl && store.snapshotDataUrl.length > 0) {
      onClipImageUrl();
    }
  }, [store.snapshotDataUrl]);

  if (!store.snapshotDataUrl) {
    return <></>;
  }

  return (
    <div className="rmv-drawer-panel " style={{ width: '80%' }}>
      <div className="snapshot-clip-viewer">
        <Cropper
          src={store.snapshotDataUrl}
          style={{ height: 300, width: 300 }}
          viewMode={3}
          dragMode={'move'}
          initialAspectRatio={1}
          guides={true}
          crop={onClipImageUrl}
          ref={cropperRef}
        />
        <div
          style={{ marginLeft: 16, display: 'flex', flexDirection: 'column' }}
        >
          <img
            src={clipImgUrl}
            style={{ width: '300px', height: '300px', objectFit: 'contain' }}
            alt={i18nFormat('截图预览')}
          />
        </div>
      </div>
      <Divider />
      <Space
        size={0}
        align="center"
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <Button type="link">{i18nFormat('保存')}</Button>
        <Button
          type="link"
          onClick={() => {
            const image = clipImgUrl.replace('image/png', 'image/octet-stream');
            const link = document.createElement('a');
            link.download = 'my-image.png';
            link.href = image;
            link.click();
          }}
        >
          {i18nFormat('下载')}
        </Button>
        <Button
          type="link"
          onClick={() => {
            store.setPartialState({ snapshotDataUrl: undefined });
          }}
        >
          {i18nFormat('关闭')}
        </Button>
      </Space>
    </div>
  );
};
