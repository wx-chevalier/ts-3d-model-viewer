declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': any;
  }
}

declare global {
  const __DEV__: boolean;
}

declare module 'react-loader-spinner';

declare module 'uzip';

declare module 'stl-viewer';

declare module 'three-orbit-controls';

declare module '@seregpie/three.text-sprite';

declare module 'workerize';

declare module 'three/build/three.min.js' {
  export * from 'three';
}
