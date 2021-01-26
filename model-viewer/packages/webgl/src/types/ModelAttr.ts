/** 文件的属性 */
export class ModelAttr {
  // 三角面片数量
  triangleCnt: number;
  // 顶点数量
  vertexCnt: number;
  edgeCnt: number;
  // 尺寸
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  // 体积
  volume: number;
  // 表面积
  area: number;

  // 厚度
  thick: number;
  shellCnt: number;
  flipped: number;

  // 其他辅助属性
  boundary: number;
  nonManifol: number;
}
