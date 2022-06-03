Object.assign(MCG.Math, (function() {

  // float to integer
  function ftoi(f, context) {
    if (context === undefined) context = new MCG.Context();

    return Math.round(f * context.p);
  }

  // integer to float
  function itof(i, context) {
    if (context === undefined) context = new MCG.Context();

    return i / context.p;
  }

  // true if two points are coincident
  function coincident(a, b) {
    return a.h === b.h && a.v === b.v;
  }

  // area of a-b-c triangle in integer space
  function area(a, b, c) {
    var cross = (c.h-b.h) * (a.v-b.v) - (c.v-b.v) * (a.h-b.h);
    return cross / 2;
  }

  // area of a-b-c triangle using normalized a-b and a-c edges
  function narea(a, b, c) {
    var bc = b.vectorTo(c).normalize();
    var ba = b.vectorTo(a).normalize();

    return bc.cross(ba) / 2;
  }

  // area of a-b-c triangle in floating-point space
  function farea(a, b, c) {
    var ash = a.sh(), asv = a.sv();
    var bsh = b.sh(), bsv = b.sv();
    var csh = c.sh(), csv = c.sv();

    var cross = (bsh-ash) * (csv-asv) - (bsv-asv) * (csh-ash);
    return cross / 2;
  }

  // distance squared from point p to line subtended by a-b segment
  function distanceToLineSq(a, b, p) {
    var ab = b.vectorTo(a);
    var ap = p.vectorTo(a);

    var dot = ab.dot(ap);

    if (dot === 0) return ap.lengthSq();

    var ablensq = ab.lengthSq();
    var proj = ab.multiplyScalar(dot / ablensq);

    return proj.distanceToSq(ap);
  }

  function distanceToLine(a, b, p) {
    return Math.sqrt(distanceToLineSq(a, b, p));
  }

  // returns 0 if c collinear with a-b, 1 if c left of a-b, else -1
  function leftCompare(a, b, c) {
    if (distanceToLineSq(a, b, c) <= 2) return 0;
    else return Math.sign(area(a, b, c));
  }

  function leftCompareStrict(a, b, c) {
    return Math.sign(area(a, b, c));
  }

  // signifies special types of intersection between a0-a1 and b0-b1 segments
  var IntersectionFlags = (function() {
    var a0 = 2, a1 = 4;
    var b0 = 8, b1 = 16;
    var a0b0 = a0 | b0;
    var a1b1 = a1 | b1;
    var a0b1 = a0 | b1;
    var a1b0 = a1 | b0;
    var a01 = a0 | a1;
    var b01 = b0 | b1;

    return {
      none: 0,                // no intersection
      intermediate: 1,        // intersection excludes endpoints
      a0: a0,                 // a0 is on b0-b1
      a1: a1,                 // a1 is on b0-b1
      b0: b0,                 // b0 is on a0-a1
      b1: b1,                 // b1 is on a0-a1
      a: a01,                 // a0 and a1 are on b0-b1
      b: b01,                 // b0 and b1 are on a0-a1
      a0b0: a0b0,            // intersection point is start of both segments
      a1b1: a1b1,              // intersection point is end of both segments
      a0b1: a0b1,             // intersection point is a start and b end
      a1b0: a1b0,             // intersection point is a end and b start
      collinear: a0b0 | a1b1  // a and b are collinear
    };
  })();

  // create a normalized vector that is orthogonal to and right of vector d
  function orthogonalRightVector(d, len) {
    var h = d.h, v = d.v;

    // opposite inverse slope makes an orthogonal vector
    var r = d.clone().set(v, -h);

    if (len !== undefined) return r.setLength(len);
    else return r.normalize();
  }

  return {

    ftoi: ftoi,
    itof: itof,

    coincident: coincident,

    area: area,
    farea: farea,
    narea: narea,

    distanceToLineSq: distanceToLineSq,
    distanceToLine: distanceToLine,

    // leftness predicates - these account for the fuzziness introduced by
    // vertices' snapping to the integer grid

    leftCompare: leftCompare,

    collinear: function(a, b, c) {
      // consecutive vertices a, b, c are collinear if b is on a-c segment
      return leftCompare(a, c, b) === 0;
    },

    left: function(a, b, c) {
      return leftCompare(a, b, c) > 0;
    },

    leftOn: function(a, b, c) {
      return leftCompare(a, b, c) >= 0;
    },

    // strict predicates - exact comparisons of area

    leftCompareStrict: leftCompareStrict,

    collinearStrict: function(a, b, c) {
      return leftCompareStrict(a, b, c) === 0;
    },

    leftStrict: function(a, b, c) {
      return leftCompareStrict(a, b, c) > 0;
    },

    leftOnStrict: function(a, b, c) {
      return leftCompareStrict(a, b, c) >= 0;
    },

    IntersectionFlags: IntersectionFlags,

    // intersection predicate: return true if a-b segment intersects c-d
    // segment; returns
    intersect: function(a, b, c, d) {
      var flags = IntersectionFlags;

      // leftness checks for the endpoint of one segment against the other segment
      var labc = leftCompare(a, b, c), labd = leftCompare(a, b, d);
      var lcda = leftCompare(c, d, a), lcdb = leftCompare(c, d, b);

      var result = flags.none;

      // a-b segment is between endpoints of c-d segment
      var abBtwn = labc !== labd || labc === 0;
      // c-d segment is between endpoints of a-b segment
      var cdBtwn = lcda !== lcdb || lcda === 0;

      // check if one endpoint lies on the other segment

      // c lies on a-b and between a-b
      if (labc === 0 && cdBtwn) result |= flags.b0;
      if (labd === 0 && cdBtwn) result |= flags.b1;
      if (lcda === 0 && abBtwn) result |= flags.a0;
      if (lcdb === 0 && abBtwn) result |= flags.a1;

      // if one segment registers as collinear with the other, say both segments
      // are collinear
      //if (result & flags.a0 && result & flags.a1) return flags.collinear;
      //if (result & flags.b0 && result & flags.b1) return flags.collinear;
      //if (result & flags.a0 && result & flags.b1) return flags.collinear;
      //if (result & flags.a1 && result & flags.b0) return flags.collinear;

      // possible intersection on intermediate points
      if (result === flags.none) {
        if (abBtwn && cdBtwn) {
          result = flags.intermediate;
        }
      }

      return result;
    },

    // calculate intersection point of a0-a1 segment and b0-b1 segment
    intersection: function(a0, a1, b0, b1) {
      // denominator
      var d = a0.h * (b1.v - b0.v) + a1.h * (b0.v - b1.v) +
              b1.h * (a1.v - a0.v) + b0.h * (a0.v - a1.v);
      // if denominator is 0, segments are parallel
      if (d === 0) return null;

      // numerator
      var n;

      // calculate pa
      n = a0.h * (b1.v - b0.v) + b0.h * (a0.v - b1.v) + b1.h * (b0.v - a0.v);
      var pa = n / d;

      var ixn = a0.clone().addScaledVector(a0.vectorTo(a1), pa);

      // if intersection is outside segment a's bounds, it's invalid
      if (!inRange(ixn.h, Math.min(a0.h, a1.h), Math.max(a0.h, a1.h))) return null;
      if (!inRange(ixn.v, Math.min(a0.v, a1.v), Math.max(a0.v, a1.v))) return null;

      return ixn;
    },

    orthogonalRightVector: orthogonalRightVector,

    // the bisector of a-b and b-c segments, looking right of both segments
    bisector: function(a, b, c) {
      var abr = orthogonalRightVector(a.vectorTo(b));
      var bcr = orthogonalRightVector(b.vectorTo(c));

      return abr.add(bcr).normalize();
    },

    cycleAxis: function(a) {
      if (a === "h") return "v";
      else if (a === "v") return "h";
      else if (a === "x") return "y";
      else if (a === "y") return "z";
      else return "x";
    }

  };

})());
