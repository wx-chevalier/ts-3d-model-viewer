MCG.Segment = (function() {

  function Segment(context, p1, p2) {
    this.context = context;

    this.p1 = p1;
    this.p2 = p2;

    this.type = MCG.Types.segment;
  }

  Object.assign(Segment.prototype, {

    fromVector3Pair: function(v1, v2, normal) {
      var context = this.context;

      var p1 = new MCG.Vector(context).fromVector3(v1);
      var p2 = new MCG.Vector(context).fromVector3(v2);

      if (MCG.Math.coincident(p1, p2)) return this;

      // if normal not given, assign points in given order
      if (normal === undefined) {
        this.p1 = p1;
        this.p2 = p2;
      }
      // if normal given, use it to assign points s.t. polygon is on the left
      // when traversing from v1 to v2
      else {
        // determine which way the winding order points
        var cross = context.up.clone().cross(normal);
        var dot = cross.dot(v2.clone().sub(v1));

        this.p1 = dot > 0 ? p1 : p2;
        this.p2 = dot > 0 ? p2 : p1;
      }

      return this;
    },

    valid: function() {
      if (!(this.p1 && this.p2)) return false;

      return !MCG.Math.coincident(this.p1, this.p2);
    },

    clone: function(recursive) {
      var p1 = recursive ? this.p1.clone() : this.p1;
      var p2 = recursive ? this.p2.clone() : this.p2;

      return new this.constructor(this.context, p1, p2);
    },

    rotate: function(angle) {
      this.p1.rotate(angle);
      this.p2.rotate(angle);

      return this;
    },

    updateBoundsFromThis: function(min, max) {
      min.min(this.p1);
      max.max(this.p1);
      min.min(this.p2);
      max.max(this.p2);
    },

    lengthSq: function() {
      return this.p1.distanceToSq(this.p2);
    },

    length: function() {
      return this.pq.distanceTo(this.p2);
    }

  });

  return Segment;

})();
