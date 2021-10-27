import './index.css';

import { Canvas } from '@react-three/fiber';
import React, { Suspense, useRef } from 'react';

import WebGLViewerR from '../../src/components/WebGLViewerR';

interface IProps {}

export const WebGLViewerExampleR: React.FC<IProps> = () => {
  const ref = useRef();

  return (
    <Canvas ref={ref}>
      <Suspense fallback={null}>
        <WebGLViewerR url={'test.stl'} />
      </Suspense>
    </Canvas>
  );
};
