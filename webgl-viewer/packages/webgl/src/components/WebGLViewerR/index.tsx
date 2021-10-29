import 'rc-tooltip/assets/bootstrap.css';
import './index.css';

// import { OrbitControls } from '@react-three/drei/web';
// import { useLoader } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

interface IProps {
  url: string;
}

const WebGLViewerR: React.FC<IProps> = ({ url }) => {
  const ref = useRef();

  // const stl = useLoader(STLLoader, url);

  useEffect(() => {
    console.log(ref, '渲染');
  }, []);
  return (
    <>
      {/* <axesHelper scale={30} />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />
      <group ref={ref} dispose={null}>
        <mesh castShadow receiveShadow geometry={stl}>
          <meshStandardMaterial color={'#1862F6'} />
        </mesh>
      </group> */}
    </>
  );
};

export default WebGLViewerR;
