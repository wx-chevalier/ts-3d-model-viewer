import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

import { ModelSrc, ModelType } from '../types/IModelViewerProps';

/** 将其他类型的文件，转化为 GLTF 类型 */
export function transformToGLTF(
  src: ModelSrc,
  type: ModelType
): Promise<{ gltf: string; mesh?: THREE.Mesh; srcUrl: string }> {
  const material = new THREE.MeshStandardMaterial();

  return new Promise(resolve => {
    const srcUrl = src instanceof File ? URL.createObjectURL(src) : src;

    if (type === 'glb' || type === 'gltf') {
      resolve({ gltf: srcUrl, srcUrl });
    } else if (type === 'obj') {
      const loader = new OBJLoader();
      loader.load(srcUrl, obj => {
        const exporter = new GLTFExporter();

        exporter.parse(
          obj,
          gltf => {
            // 将 obj 转化为 mesh
            obj.traverse(child => {
              if (child instanceof THREE.Mesh) {
                (child.material as THREE.Material).transparent = true;
                // here in child the geometry and material are available
                const mesh = new THREE.Mesh(child.geometry, child.material);
                resolve({ gltf: createURL(gltf), mesh, srcUrl });
              }
            });
          },
          {}
        );
      });
    } else if (type === 'ply') {
      const loader = new PLYLoader();
      loader.load(srcUrl, geometry => {
        const mesh = new THREE.Mesh(geometry, material);
        const exporter = new GLTFExporter();
        exporter.parse(
          mesh,
          gltf => {
            resolve({ gltf: createURL(gltf), mesh, srcUrl });
          },
          {}
        );
      });
    } else if (type === 'stl') {
      const loader = new STLLoader();

      loader.load(srcUrl, geometry => {
        const mesh = new THREE.Mesh(geometry, material);
        const exporter = new GLTFExporter();
        exporter.parse(
          mesh,
          gltf => {
            resolve({ gltf: createURL(gltf), mesh, srcUrl });
          },
          {}
        );
      });
    }
  });
}

function createURL(json: any) {
  const str = JSON.stringify(json);
  const blob = new Blob([str], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}
