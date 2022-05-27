import 'cropperjs/dist/cropper.min.css';
import './index.css';

import { downloadUrl } from '@m-fe/utils';
import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'react-cropper';

interface IProps {
  imgUrl: string;
}

export const ImageClipViewer = ({ imgUrl }: IProps) => {
  const [isView, setIsView] = useState(false);
  const [clipImgUrl, setClipImgUrl] = useState('');
  const cropperRef = useRef<HTMLImageElement>(null);

  const onClipImageUrl = () => {
    const imageElement: any = cropperRef?.current;
    const cropper: any = imageElement?.cropper;
    setClipImgUrl(cropper?.getCroppedCanvas()?.toDataURL('image/png'));
  };

  useEffect(() => {
    if (imgUrl?.length > 0) {
      setIsView(true);
      if (clipImgUrl?.length > 0) {
        onClipImageUrl();
      }
    } else {
      setIsView(false);
    }
  });

  const onCrop = async () => {
    onClipImageUrl();
    if (clipImgUrl.length > 0) {
      downloadUrl(clipImgUrl);
    }
  };

  return (
    <div className={isView ? 'image-container show' : 'image-container hide'}>
      <button onClick={onCrop}>确认剪裁</button>
      <Cropper
        src={imgUrl}
        style={{ height: 400, width: 400 }}
        // Cropper.js options
        viewMode={3}
        dragMode={'move'}
        initialAspectRatio={1}
        guides={true}
        crop={onClipImageUrl}
        ref={cropperRef}
      />
      <div style={{ width: '100px', height: '100px' }}>
        <img
          src={clipImgUrl}
          width={'100'}
          height={'100'}
          style={{ width: '100px', height: '100px', objectFit: 'contain' }}
          alt={'截图预览'}
        />
      </div>
    </div>
  );
};
