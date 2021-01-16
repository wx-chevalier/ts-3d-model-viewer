import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

import { ModelSrc, ModelType } from '../types/IModelViewerProps';

export const canTransformToGLTF = (type: ModelType) =>
  type === 'glb' || type === 'gltf' || type === 'ply' || type === 'stl' || type === 'obj';

function createURL(json: any) {
  const str = JSON.stringify(json);
  const blob = new Blob([str], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}

/** 将其他类型的文件，转化为 GLTF 类型 */
export function loadMesh(
  src: ModelSrc,
  type: ModelType,
  onError?: (err: Error) => void,
  withGltf = true
): Promise<{ gltf?: string; mesh?: THREE.Mesh; srcUrl: string }> {
  const material = new THREE.MeshStandardMaterial();

  return new Promise(resolve => {
    const srcUrl = src instanceof File ? URL.createObjectURL(src) : src;

    if (type === 'glb' || type === 'gltf') {
      const loader = new GLTFLoader();

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('draco/');
      loader.setDRACOLoader(dracoLoader);

      loader.load(srcUrl, data => {
        resolve({ gltf: srcUrl, srcUrl, mesh: data.scene.children[0] as THREE.Mesh });
      });
    } else if (type === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        srcUrl,
        obj => {
          if (withGltf) {
            const exporter = new GLTFExporter();

            exporter.parse(
              obj,
              gltf => {
                // 将 obj 转化为 mesh
                obj.traverse(child => {
                  if (child instanceof THREE.Mesh) {
                    (child.material as THREE.Material).transparent = true;
                    const mesh = new THREE.Mesh(child.geometry, child.material);
                    resolve({ gltf: createURL(gltf), mesh, srcUrl });
                  }
                });
              },
              {}
            );
          } else {
            // 不包含 gltf 则直接返回
            obj.traverse(child => {
              if (child instanceof THREE.Mesh) {
                (child.material as THREE.Material).transparent = true;
                const mesh = new THREE.Mesh(child.geometry, child.material);
                resolve({ mesh, srcUrl });
              }
            });
          }
        },
        () => {},
        err => {
          if (onError) {
            onError(new Error(err.message));
          }
        }
      );
    } else if (type === 'ply') {
      const loader = new PLYLoader();
      loader.load(
        srcUrl,
        geometry => {
          const mesh = new THREE.Mesh(geometry, material);
          const exporter = new GLTFExporter();
          exporter.parse(
            mesh,
            gltf => {
              resolve({ gltf: createURL(gltf), mesh, srcUrl });
            },
            {}
          );
        },
        () => {},
        err => {
          if (onError) {
            onError(new Error(err.message));
          }
        }
      );
    } else if (type === 'stl') {
      const loader = new STLLoader();

      loader.load(
        srcUrl,
        geometry => {
          const mesh = new THREE.Mesh(geometry, material);

          if (withGltf) {
            const exporter = new GLTFExporter();
            exporter.parse(
              mesh,
              gltf => {
                resolve({ gltf: createURL(gltf), mesh, srcUrl });
              },
              {}
            );
          } else {
            resolve({ mesh, srcUrl });
          }
        },
        () => {},
        err => {
          if (onError) {
            onError(new Error(err.message));
          }
        }
      );
    }
  });
}
