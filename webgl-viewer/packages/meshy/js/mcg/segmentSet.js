MCG.SegmentSet = (function() {

  function SegmentSet(context) {
    MCG.GeometrySet.call(this, context);

    this.type = MCG.Types.segmentSet;
  }

  SegmentSet.prototype = Object.create(MCG.GeometrySet.prototype);

  Object.assign(SegmentSet.prototype, {

    constructor: SegmentSet,

    addPointPair: function(p1, p2) {
      this.add(new MCG.Segment(this.context, p1, p2));
    },

    forEachPointPair: function(f) {
      var segments = this.elements;
      var ct = this.count();

      for (var i = 0; i < ct; i++) {
        var s = segments[i];
        f(s.p1, s.p2);
      }
    },

    makeAdjacencyMap: function() {
      var adjacencyMap = new MCG.DirectedAdjacencyMap(this.context);

      var segments = this.elements;
      var ns = segments.length;

      for (var si = 0; si < ns; si++) {
        adjacencyMap.addSegment(segments[si]);
      }

      return adjacencyMap;
    },

    toPolygonSet: function() {
      var context = this.context;

      var pset = new MCG.PolygonSet(context);

      var adjacencyMap = this.makeAdjacencyMap();

      var loops = adjacencyMap.getLoops();
      for (var li = 0; li < loops.length; li++) {
        var polygon = new MCG.Polygon(context, loops[li]);
        if (polygon.valid()) pset.add(polygon);
      }

      return pset;
    },

    pointCount: function() {
      return this.count() * 2;
    }

  });

  return SegmentSet;

})();
