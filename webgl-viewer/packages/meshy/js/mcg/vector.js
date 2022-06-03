/*
  Integer point based on a Vector3, expanded to p decimal places.
*/

MCG.Vector = (function() {

  function Vector(context, h, v) {
    this.context = context || new MCG.Context();

    this.h = Math.round(h || 0);
    this.v = Math.round(v || 0);

    this.type = MCG.Types.vector;
  }

  Object.assign(Vector.prototype, {

    fromVector3: function(v3) {
      var context = this.context;
      var ftoi = MCG.Math.ftoi;

      this.h = ftoi(v3[context.ah], context);
      this.v = ftoi(v3[context.av], context);

      return this;
    },

    // arguments:
    //  constr: 3-vector constructor; assumed to follow THREE.Vector3 API
    //  context: context to use, if different from this.context
    toVector3: function(constr, context) {
      context = context || this.context;

      var itof = MCG.Math.itof;

      var res = new constr();
      res[context.axis] = context.d;
      res[context.ah] = itof(this.h, context);
      res[context.av] = itof(this.v, context);

      return res;
    },

    set: function(h, v) {
      this.h = Math.round(h);
      this.v = Math.round(v);

      return this;
    },

    setH: function(h) {
      this.h = Math.round(h);

      return this;
    },

    setV: function(v) {
      this.v = Math.round(v);

      return this;
    },

    setUnitVector: function(axis) {
      var p = this.context.p;

      if (axis === "h") this.set(p, 0);
      else this.set(0, p);

      return this;
    },

    setScalar: function(s) {
      this.h = s;
      this.v = s;

      return this;
    },

    negate: function() {
      this.h *= -1;
      this.v *= -1;

      return this;
    },

    copy: function(other) {
      this.h = other.h;
      this.v = other.v;
      this.context = other.context;

      return this;
    },

    clone: function() {
      return new this.constructor().copy(this);
    },

    hash: function() {
      return this.h + "_" + this.v;
    },

    sh: function() {
      return MCG.Math.itof(this.h, this.context);
    },

    sv: function() {
      return MCG.Math.itof(this.v, this.context);
    },

    add: function(other) {
      this.h += other.h;
      this.v += other.v;

      return this;
    },

    sub: function(other) {
      this.h -= other.h;
      this.v -= other.v;

      return this;
    },

    multiply: function(other) {
      this.h = this.h * other.h;
      this.v = this.v * other.v;

      return this;
    },

    divide: function(other) {
      this.h = Math.round(this.h / other.h);
      this.v = Math.round(this.v / other.v);

      return this;
    },

    multiplyScalar: function(s) {
      this.h = Math.round(this.h * s);
      this.v = Math.round(this.v * s);

      return this;
    },

    divideScalar: function(s) {
      return this.multiplyScalar(1 / s);
    },

    addScaledVector: function(other, s) {
      return this.set(this.h + other.h * s,
                      this.v + other.v * s);
    },

    lengthSq: function() {
      return this.h * this.h + this.v * this.v;
    },

    length: function() {
      return Math.sqrt(this.lengthSq());
    },

    setLength: function(l) {
      var tl = this.length();
      if (tl === l) return this;

      return this.multiplyScalar(l / tl);
    },

    // normalize the vector to length this.context.p (1 in its original
    // floating-point space)
    normalize: function() {
      if (this.h === 0 && this.v === 0) return this;

      var length = this.context.p;
      return this.setLength(length);
    },

    distanceToSq: function(other) {
      var dh = this.h - other.h, dv = this.v - other.v;
      return dh * dh + dv * dv;
    },

    distanceTo: function(other) {
      return Math.sqrt(this.distanceToSq(other));
    },

    dot: function(other) {
      return this.h * other.h + this.v * other.v;
    },

    // component of the cross product normal to the plane
    cross: function(other) {
      return this.h * other.v - this.v * other.h;
    },

    angleTo: function(other) {
      var normalization = Math.sqrt(this.lengthSq() * other.lengthSq());

      return acos(this.dot(other) / normalization);
    },

    vectorTo: function(other) {
      return other.clone().sub(this);
    },

    max: function(other) {
      this.h = Math.max(this.h, other.h);
      this.v = Math.max(this.v, other.v);

      return this;
    },

    min: function(other) {
      this.h = Math.min(this.h, other.h);
      this.v = Math.min(this.v, other.v);

      return this;
    },

    hcompare: function(other) {
      return Math.sign(this.h - other.h);
    },

    vcompare: function(other) {
      return Math.sign(this.v - other.v);
    },

    // rotates CCW
    rotate: function(angle) {
      var h = this.h;
      var v = this.v;
      var c = Math.cos(angle);
      var s = Math.sin(angle);

      this.setH(c * h - s * v);
      this.setV(s * h + c * v);

      return this;
    }

  });

  return Vector;

})();
