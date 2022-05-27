import * as THREE from 'three';

export interface OccFace {
  face_index: number;
  normal_coord: number[];
  number_of_triangles: number;
  tri_indexes: number[];
  uv_coord: number[];
  vertex_coord: number[];
}

export interface OccEdge {}

/** 形状组合器 */
export class ShapesCombiner {
  mainObject: THREE.Group;

  constructor(private faceList: OccFace[], private edgeList: OccEdge[]) {}

  combineFaceAsMesh() {
    const vertices: number[] = [];
    const normals: number[] = [];
    const triangles: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    let vInd = 0;
    let globalFaceIndex = 0;
    this.faceList.forEach(face => {
      // Copy Vertices into three.js Vector3 List
      vertices.push(...face.vertex_coord);
      normals.push(...face.normal_coord);
      uvs.push(...face.uv_coord);

      // Sort Triangles into a three.js Face List
      for (let i = 0; i < face.tri_indexes.length; i += 3) {
        triangles.push(
          face.tri_indexes[i + 0] + vInd,
          face.tri_indexes[i + 1] + vInd,
          face.tri_indexes[i + 2] + vInd,
        );
      }

      // Use Vertex Color to label this face's indices for raycast picking
      for (let i = 0; i < face.vertex_coord.length; i += 3) {
        colors.push(face.face_index, globalFaceIndex, 0);
      }

      globalFaceIndex++;
      vInd += face.vertex_coord.length / 3;
    });

    // Compile the connected vertices and faces into a model
    // And add to the scene
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(triangles);
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const model = new THREE.Mesh(geometry);
    model.castShadow = true;
    model.name = 'Model Faces';

    return model;
  }
}
