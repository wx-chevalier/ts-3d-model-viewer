MCG.PolygonSet = (function() {

  function PolygonSet(context) {
    MCG.GeometrySet.call(this, context);

    this.type = MCG.Types.polygonSet;
  }

  PolygonSet.prototype = Object.create(MCG.GeometrySet.prototype)

  Object.assign(PolygonSet.prototype, {

    constructor: PolygonSet,

    forEachPoint: function(f) {
      this.forEach(function(polygon) {
        if (polygon.valid()) polygon.forEach(f);
      });
    },

    forEachPointPair: function(f) {
      this.forEach(function(polygon) {
        if (polygon.valid()) polygon.forEachPointPair(f);
      });
    },

    forEachSegmentPair: function(f) {
      this.forEach(function(polygon) {
        if (polygon.valid()) polygon.forEachSegmentPair(f);
      });
    },

    computeBisectors: function() {
      this.forEach(function(polygon) {
        if (polygon.valid()) polygon.computeBisectors();
      });
    },

    foffset: function(fdist, ftol) {
      var polygonSet = new this.constructor(this.context);

      this.forEach(function(polygon) {
        var offset = polygon.foffset(fdist, ftol);

        if (offset.valid()) polygonSet.add(offset);
      });

      return polygonSet;
    },

    offset: function(dist, tol) {
      var polygonSet = new this.constructor(this.context);

      this.forEach(function(polygon) {
        var offset = polygon.offset(dist, tol);

        if (offset.valid()) polygonSet.add(offset);
      });

      return polygonSet;
    },

    fdecimate: function(ftol) {
      this.forEach(function(polygon) {
        polygon.fdecimate(ftol);
      });

      // remove invalid polygons
      this.filter(function(polygon) {
        return polygon.valid();
      });

      return this;
    },

    decimate: function(tol) {
      this.forEach(function(polygon) {
        polygon.decimate(tol);
      });

      // remove invalid polygons
      this.filter(function(polygon) {
        return polygon.valid();
      });

      return this;
    },

    pointCount: function() {
      var count = 0;

      this.forEach(function(polygon) {
        count += polygon.count();
      });

      return count;
    }

  });

  return PolygonSet;

})();
