/*
  Meshy computational geometry namespace.
*/

var MCG = {};

MCG.Types = {
  context: 1,

  vector: 11,
  polygon: 12,
  segment: 13,

  abstractGeometrySet: 21,
  polygonSet: 22,
  segmentSet: 23,

  abstractAdjacencyMap: 31,
  directedAdjacencyMap: 32
};

// namespaces
MCG.Math = {};
MCG.Sweep = {};
MCG.Boolean = {};
MCG.Infill = {};
