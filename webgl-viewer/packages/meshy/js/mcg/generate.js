Object.assign(MCG.Generate, (function() {

  return {

    infillLinear: function(min, max, spacing, angle, parity) {
      context = min.context;
      spacing = spacing || context.p;
      angle = angle || 0;
      parity = parity || 0;

      // constants
      var pi = Math.PI;
      var pi2 = pi * 2;
      var pi_2 = pi / 2;

      // rotate by 90 degrees if non-0 parity
      if (parity !== 0) angle += pi_2;

      // clamp angle to 0-pi range
      angle = (angle + pi2) % pi2;
      if (angle > pi) angle -= pi;

      // direction of infill lines
      var d = new MCG.Vector(context).setUnitVector("v").rotate(-angle);
      var dh = d.h, dv = d.v;

      // vector by which the line is shifted at every iteration
      var shift = MCG.Math.orthogonalRightVector(d, spacing);

      // top left and top right corners
      var topleft = new MCG.Vector(context, min.h, max.v);
      var topright = max;

      // lines have positive slope
      var spos = angle < pi_2;

      // if 0-90 degrees CW from the vertical, start from top-left corner;
      // if 90-180, start from top-right corner
      var p = spos ? new MCG.Vector(context, min.h, max.v) : max.clone();

      // horizontal/vertical values the line will cross first/second
      var h1 = min.h, v1 = spos ? min.v : max.v;
      var h2 = max.h, v2 = spos ? max.v : min.v;

      var lines = new MCG.SegmentSet(context);

      // iteratively shift the point and determine where it intersects the
      // rectangular box
      while (1) {
        p.add(shift);

        // each line is given by p + t * d = x, where x is some point on the
        // line; determine the parameter t for crossing the vertical and
        // horizontal boundaries
        // for entry crossing, take the max t; for exit, take the min t
        var th1 = dh !== 0 ? ((h1 - p.h) / dh) : -Infinity;
        var tv1 = dv !== 0 ? ((v1 - p.v) / dv) : -Infinity;
        var t1 = Math.max(th1, tv1);

        var th2 = dh !== 0 ? ((h2 - p.h) / dh) : Infinity;
        var tv2 = dv !== 0 ? ((v2 - p.v) / dv) : Infinity;
        var t2 = Math.min(th2, tv2);

        // line is outside the box, so subsequent lines will be outside too
        if (t1 >= t2) break;

        // calculate intersection points
        var p1 = p.clone().addScaledVector(d, t1);
        var p2 = p.clone().addScaledVector(d, t2);

        lines.addPointPair(p1, p2);
      }

      return lines;
    },

    infillHex(min, max, spacing, linewidth, parity) {
      context = min.context;
      spacing = spacing || context.p;
      linewidth = linewidth || 0;
      parity = parity || 0;

      var sqrt3 = Math.sqrt(3);

      var dh = spacing * sqrt3 / 2;
      var dv = spacing / 2;

      var vertical = new MCG.Vector(context, 0, spacing);

      var lines = new MCG.SegmentSet(context);

      // if parity 0, build the hex pattern in vertical columns
      if (parity === 0) {
        // column index
        var cidx = 0;

        var right = new MCG.Vector(context, dh, dv);
        var left = new MCG.Vector(context, -dh, dv);

        // start point for each column
        var start = min.clone();
        var p = start;

        while (p.h < max.h) {
          // true if column index is even
          var even = cidx % 2 === 0;

          while (p.v < max.v) {
            var p0 = p.clone();
            var p1 = p0.clone().add(vertical);
            var p2 = p1.clone().add(even ? right : left);
            var p3 = p2.clone().add(vertical);
            var p4 = p3.clone().add(even ? left : right);

            lines.addPointPair(p0, p1);
            lines.addPointPair(p1, p2);
            lines.addPointPair(p2, p3);
            lines.addPointPair(p3, p4);

            p = p4;
          }

          start.h += even ? dh * 2 + linewidth : linewidth;
          p = start;

          cidx++;
        }
      }
      // if parity !== 0, go across in a zigzag pattern
      else {
        // horizontal and vertical displacements for zigzag segments
        var dhz = dh + linewidth;
        var dvz = dhz / sqrt3;

        // vertical shift in start point for even and odd iterations
        var vshifteven = dv*2 + spacing + (dvz - dv);
        var vshiftodd = (spacing*2 + dv*2) - vshifteven;

        var up = new MCG.Vector(context, dhz, dvz);
        var down = new MCG.Vector(context, dhz, -dvz);

        // row index
        var ridx = 0;

        // start point for each row
        var start = min.clone().add(vertical);
        start.h -= linewidth / 2;
        start.v -= (dvz - dv) / 2;
        var p = start;

        while (p.v < max.v) {
          // true if row index is even
          var even = ridx % 2 === 0;

          while (p.h < max.h) {
            var p0 = p.clone();
            var p1 = p.clone().add(even ? up : down);
            var p2 = p1.clone().add(even ? down : up);

            lines.addPointPair(p0, p1);
            lines.addPointPair(p1, p2);

            p = p2;
          }

          start.v += even ? vshifteven : vshiftodd;
          p = start;

          ridx++;
        }
      }

      return lines;
    }

  };

})());
