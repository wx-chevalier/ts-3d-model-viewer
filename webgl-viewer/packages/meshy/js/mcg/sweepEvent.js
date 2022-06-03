Object.assign(MCG.Sweep, (function() {

  // signifies an event's position (inside a polygon or at a boundary or neither)
  var EventPositionFlags = {
    none: 0,
    // inside polygon A
    insideA: 1,
    // inside polygon B
    insideB: 2,
    // on the border of A (crosses from non-positive to positive or vice versa)
    boundaryA: 4,
    // on the border of B
    boundaryB: 8,
    // transition from inside A to inside B (or vice versa)
    fromAtoB: 16
  };



  function SweepEvent(p, id) {
    // MCG.Vector at which this event is located
    this.p = p;

    // store parent for testing collinearity and slopes - this prevents drift
    // from multiple split points snapping to the integer grid
    this.parent = this;

    // used as a last-resort ordering criterion for events; the factory
    // guarantees that event ids are unique
    this.id = id !== undefined ? id : -1;

    this.isLeft = false;
    this.twin = null;
  }

  Object.assign(SweepEvent.prototype, {

    clone: function(p, id) {
      var e = new this.constructor(p);

      // copy properties and set point
      Object.assign(e, this);
      e.p = p;
      e.id = id !== undefined ? id : -1;
      e.t = -1;

      return e;
    },

    isParent: function() {
      return this === this.parent;
    },

    vertical: function() {
      return this.p.h === this.twin.p.h;
    },

    horizontal: function() {
      return this.p.v === this.twin.p.v;
    },

    // determine which of two events comes first in a left-right sweep
    sweepcompare: function(other) {
      var a = this, b = other;

      // in case events are the same
      if (a.id === b.id) return 0;

      // primary sorting on horizontal coordinate (x if up axis is z)
      // secondary sorting on vertical coordinate (y if up axis is z)
      var hvcomp = a.hvcompare(b);
      if (hvcomp !== 0) return hvcomp;

      // tertiary sorting on left/right (right goes first so that, given two
      //   segments sharing an endpoint but with no vertical overlap, the first
      //   segment leaves the sweep status structure before the next goes in)
      var lrcomp = a.lrcompare(b);
      if (lrcomp !== 0) return lrcomp;

      // quaternary sorting on slope (increasing)
      var scomp = a.scompare(b);
      if (scomp !== 0) return scomp;

      // comparison based on parent extents
      var pcomp = a.pcompare(b);
      if (pcomp !== 0) return pcomp;

      return Math.sign(a.id - b.id);
    },

    // comparison for two left events along a vertical line passing through both
    // at the earliest point where they have vertical overlap (i.e., horizontal
    // coordinate of the later event)
    linecompare: function(other) {
      var a = this, b = other;

      // in case events are the same
      if (a.id === b.id) return 0;

      // primary sorting on vertical coordinate at the start of the later event
      // (y if up axis is z)
      var vcomp = a.vlinecompare(b);
      if (vcomp !== 0) return vcomp;

      // secondary sorting on slope
      var scomp = a.scompare(b);
      if (scomp !== 0) return scomp;

      // tertiary sorting on time
      var tcomp = a.tcompare(b);
      if (tcomp !== 0) return tcomp;

      // comparison based on parent extents
      var pcomp = a.pcompare(b);
      if (pcomp !== 0) return pcomp;

      return Math.sign(a.id - b.id);
    },

    // return horizontal comparison
    hcompare: function(other) {
      return this.p.hcompare(other.p);
    },

    // return vertical comparison
    vcompare: function(other) {
      return this.p.vcompare(other.p);
    },

    // return horizontal comparison if unequal; else, return vertical comparison
    hvcompare: function(other) {
      var a = this, b = other;
      var pa = a.p, pb = b.p;

      var hcomp = pa.hcompare(pb);
      if (hcomp !== 0) return hcomp;

      return pa.vcompare(pb);
    },

    hvcomparept: function(pt) {
      var pa = this.p;

      var hcomp = pa.hcompare(pt);
      if (hcomp !== 0) return hcomp;

      return pa.vcompare(pt);
    },

    // return left-right comparison for two events (right goes first)
    lrcompare: function(other) {
      if (!this.isLeft && other.isLeft) return -1;
      else if (this.isLeft && !other.isLeft) return 1;
      else return 0;
    },

    // returns slope comparison for two events that share at least one point:
    //   a's slope is greater if a's twin is to b-b.twin's left (above b);
    //   a's slope is less if a's twin is to b-b.twin's right (below b);
    //   equal slopes if collinear
    scompare: function(other) {
      var a = this.isLeft ? this : this.twin;
      var b = other.isLeft ? other : other.twin;

      // basic checks if one or both are vertical
      var va = a.vertical(), vb = b.vertical();

      if (va && vb) return 0;
      else if (!va && vb) return -1;
      else if (va && !vb) return 1;

      var pa = a.p, pta = a.twin.p;
      var pb = b.p, ptb = b.twin.p;

      // if start points coincident, use strict left comparison
      if (MCG.Math.coincident(pa, pb)) {
        var ls = MCG.Math.leftCompareStrict(pb, ptb, pta);
        return ls < 0 ? -1 : ls > 0 ? 1 : 0
      }

      var lc = MCG.Math.leftCompare;

      var lta = lc(pb, ptb, pta);
      var ltb = lc(pa, pta, ptb);

      if (lta === -1 || ltb === 1) return -1;
      if (lta === 1 || ltb === -1) return 1;

      var la = lc(pb, ptb, pa);
      var lb = lc(pa, pta, pb);

      if (la === 1 || lb === -1) return -1;
      if (la === -1 || lb === 1) return 1;

      return 0;
    },

    tcompare: function(other) {
      return Math.sign(this.t - other.t);
    },

    // returns comparison between two left/two right events based on their
    // parent extents
    pcompare: function(other) {
      var a = this, b = other;

      // parent comparison function
      var pcompare = a.vertical() || b.vertical() ? "vcompare" : "hcompare";

      var pcomp = a.parent.p[pcompare](b.parent.p);
      if (pcomp !== 0) return pcomp;

      var ptcomp = a.twin.parent.p[pcompare](b.twin.parent.p);
      if (ptcomp !== 0) return ptcomp;

      return 0;
    },

    toString: function(pref) {
      var src = this.isLeft ? this : this.twin;
      var pst = (src.weightA!==0?"A":"-") + (src.weightB!==0?"B":"-");
      pref = (pref || pst);

      var d = 4;
      var diff = src.p.vectorTo(src.twin.p);
      var slope = src.vertical() ? Infinity : diff.v/diff.h;
      var cslope = slope===Infinity
        ? "v"
        : (slope===0
          ? 0
          : (Math.sign(slope)==1
            ? "+"+(slope>0.5 ? "^" : ">")
            : "-"+(slope<-0.5 ? "v" : ">")));
      var t = (this.isLeft ? this.t : "")+" ";

      var data =
        [t, this.isLeft ? "L " : "R ", this.id, this.twin.id,
          '(', this.p.h,
          this.p.v, ')',
          '(', this.twin.p.h,
          this.twin.p.v, ')',
          cslope, slope.toFixed(6),
          this.p.vectorTo(this.twin.p).length().toFixed(0),
          "w", src.weightA, src.weightB,
          "d", src.depthBelowA, src.depthBelowA+src.weightA, src.depthBelowB, src.depthBelowB+src.weightB,
          src.contributing ? "t" : "f"];
      var p =
        [5, 1, 5, 5,
          2, d+3,
          d+3, 1,
          2, d+3,
          d+3, 1,
          2, 10,
          9,
          2, 2, 2,
          2, 4, 4, 4, 4,
          1]
      var r = "";
      for (var d=0; d<data.length; d++) r += lpad(data[d], p[d]);

      return pref + " " + r;

      function lpad(s, n) {
        n++;
        var ss = ""+s;
        var l = ss.length;
        return " ".repeat(Math.max(n-l, 0)) + ss;
      }
    }

  });


  function RightSweepEvent(p, id) {
    SweepEvent.call(this, p, id);
  }

  RightSweepEvent.prototype = Object.create(SweepEvent.prototype);
  Object.assign(RightSweepEvent.prototype, {
    constructor: RightSweepEvent
  });


  function LeftSweepEvent(p, id) {
    SweepEvent.call(this, p, id);

    this.isLeft = true;

    this.depthBelowA = 0;
    this.weightA = 0;
    this.depthBelowB = 0;
    this.weightB = 0;

    this.contributing = true;

    // time at which the event occurs; used as a tiebreaker to position more
    // recent events above past events
    this.t = -1;
  }

  LeftSweepEvent.prototype = Object.create(SweepEvent.prototype);

  Object.assign(LeftSweepEvent.prototype, {

    constructor: LeftSweepEvent,

    setT: function(t) {
      this.t = t;

      return this;
    },

    setDepthFromBelow: function(below) {
      this.depthBelowA = below !== null ? below.depthBelowA + below.weightA : 0;
      this.depthBelowB = below !== null ? below.depthBelowB + below.weightB : 0;
    },

    setDepthFrom: function(other) {
      this.depthBelowA = other.depthBelowA;
      this.depthBelowB = other.depthBelowB;
    },

    setWeightFrom: function(other, negate) {
      this.weightA = negate ? -other.weightA : other.weightA;
      this.weightB = negate ? -other.weightB : other.weightB;
    },

    addWeightFrom: function(other) {
      this.weightA += other.weightA;
      this.weightB += other.weightB;
    },

    zeroWeight: function() {
      return this.weightA === 0 && this.weightB === 0;
    },

    // get a status code that indicates the event's position (inside or at the
    // boundary of one of the polygons)
    getPosition: function(minDepthA, minDepthB) {
      var flags = EventPositionFlags;
      var mdA = minDepthA || 1;
      var mdB = minDepthB || 1;

      if (!this.contributing) return flags.none;

      var wA = this.weightA, wB = this.weightB;

      // depths above and below for A
      var dbA = this.depthBelowA;
      var daA = dbA + wA;

      // depths above and below for B
      var dbB = this.depthBelowB;
      var daB = dbB + wB;

      var result = flags.none;

      var boundaryA = (daA < mdA && dbA >= mdA) || (daA >= mdA && dbA < mdA);
      var boundaryB = (daB < mdB && dbB >= mdB) || (daB >= mdB && dbB < mdB);
      var signChange = Math.sign(wA) === -Math.sign(wB);

      if (dbA >= mdA && daA >= mdA) result |= flags.insideA;
      if (dbB >= mdB && daB >= mdB) result |= flags.insideB;
      if (boundaryA) result |= flags.boundaryA;
      if (boundaryB) result |= flags.boundaryB;
      if (boundaryA && boundaryB && signChange) result |= flags.fromAtoB;

      return result;
    },

    addSegmentToSet: function(s, invert, weight) {
      var w = weight === undefined ? this.weightA + this.weightB : weight;

      var pf = w < 0 ? this.twin.p : this.p;
      var ps = w < 0 ? this.p : this.twin.p;

      if (invert) s.addPointPair(ps, pf);
      else s.addPointPair(pf, ps);
    },

    // return vertical axis comparison for two left events at the later event's
    // horizontal coordinate
    vlinecompare: function(other) {
      var a = this, b = other;
      var pa = a.p, pb = b.p;
      var pta = a.twin.p, ptb = b.twin.p;
      var pah = pa.h, pbh = pb.h;
      var ptah = pta.h, ptbh = ptb.h;
      var pav = pa.v, pbv = pb.v;

      // if events horizontally coincident, just test the vertical coordinate
      if (pah === pbh) return pa.vcompare(pb);

      // if the end of one is horizontally coincident with the other's start,
      // test that directly
      if (pah === ptbh) return pa.vcompare(ptb);
      if (ptah === pbh) return pta.vcompare(pb);

      var ptav = a.twin.p.v, ptbv = b.twin.p.v;

      // if no vertical overlap, decide by which is higher/lower
      if (Math.max(pav, ptav) < Math.min(pbv, ptbv)) return -1;
      if (Math.max(pbv, ptbv) < Math.min(pav, ptav)) return 1;

      // first and second events by horizontal coordinate
      var f = pah < pbh ? a : b;
      var s = pah < pbh ? b : a;
      var ps = s.p;

      if (0) {
        var lc = MCG.Math.leftCompare(f.p, f.twin.p, s.p);
        if (pah < pbh) lc *= -1;
        return lc;
      }

      var v = f.interpolate(ps.h).v;

      var result = Math.sign(ps.v - v);

      // flip result if necessary
      if (pah < pbh) result *= -1;

      return result;
    },

    // interpolate a (non-vertical) left event's segment to a given horizontal
    // coordinate
    interpolate: function(h) {
      var context = this.p.context;
      var pa = this.p, pat = this.twin.p;

      var v = pa.v + (pat.v - pa.v) * (h - pa.h) / (pat.h - pa.h);

      return new MCG.Vector(context, h, v);
    },

    hcontains: function(h) {
      return this.p.h <= h && h <= this.twin.p.h;
    },

    vcontains: function(v) {
      return this.p.v <= v && v <= this.twin.p.v;
    },

    contains: function(p) {
      return this.hcontains(p.h) || this.vcontains(p.v);
    },

    collinear: function(other) {
      var a = this, b = other;

      var pa = a.p, pat = a.twin.p;
      var pb = b.p, pbt = b.twin.p;

      // verify that the event pairs actually overlap
      if (a.horizontal() && b.horizontal()) {
        if (Math.max(pa.h, pat.h) <= Math.min(pb.h, pbt.h)) return false;
        if (Math.max(pb.h, pbt.h) <= Math.min(pa.h, pat.h)) return false;
      }
      else {
        if (Math.max(pa.v, pat.v) <= Math.min(pb.v, pbt.v)) return false;
        if (Math.max(pb.v, pbt.v) <= Math.min(pa.v, pat.v)) return false;
      }

      if (a.vertical() && b.vertical()) return true;

      var collinear = MCG.Math.collinear;

      return collinear(pa, pat, pb) && collinear(pa, pat, pbt);
    },

    endpointsCoincident: function(other) {
      if (MCG.Math.coincident(this.p, other.p)) return true;
      if (MCG.Math.coincident(this.twin.p, other.twin.p)) return true;

      return false;
    },

    segmentsCoincident: function(other) {
      var coincident = MCG.Math.coincident;

      return coincident(this.p, other.p) && coincident(this.twin.p, other.twin.p);
    },

    // returns MCG.Math.IntersectionFlags
    intersects: function(other) {
      var a = this, b = other;

      var pa = a.p, pta = a.twin.p;
      var pb = b.p, ptb = b.twin.p;

      return MCG.Math.intersect(pa, pta, pb, ptb);
    },

    intersection: function(other) {
      var a = this, b = other;

      if (a.endpointsCoincident(b)) return null;

      var pa = a.p, pta = a.twin.p;
      var pb = b.p, ptb = b.twin.p;

      return MCG.Math.intersection(pa, pta, pb, ptb);
    },

    setNoncontributing: function() {
      this.contributing = false;
    }

  });



  function SweepEventFactory() {
    this.id = 0;
  }

  Object.assign(SweepEventFactory.prototype, {
    createLeft: function(p) {
      return new LeftSweepEvent(p, this.id++);
    },

    createRight: function(p) {
      return new RightSweepEvent(p, this.id++);
    },

    clone: function(e, p) {
      return e.clone(p, this.id++);
    },

    count: function() {
      return this.id;
    }

  });



  return {
    EventPositionFlags: EventPositionFlags,
    LeftSweepEvent: LeftSweepEvent,
    RightSweepEvent: RightSweepEvent,
    SweepEventFactory: SweepEventFactory
  }
})());
