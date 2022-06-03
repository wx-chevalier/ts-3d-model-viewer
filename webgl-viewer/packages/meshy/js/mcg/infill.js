Object.assign(MCG.Infill, (function() {

  var Types = {
    none: 0,
    linear: 1,
    grid: 2,
    triangle: 4,
    hex: 8
  };

  function generate(contour, type, params) {
    params = params || {};

    if (type === Types.linear) {
      return generateLinear(contour, params.angle, params.spacing, params.parity, params.connectLines);
    }
    if (type === Types.grid) {
      return generateGrid(contour, params.angle, params.spacing, params.connectLines);
    }
    if (type === Types.triangle) {
      return generateTriangle(contour, params.spacing);
    }
    /*if (type === Types.hex) {
      return generateHex(contour, params.spacing, params.linewidth, params.parity);
    }*/

    return null;
  }

  function generateLinear(contour, angle, spacing, parity, connectLines) {
    context = contour.context;
    angle = angle || 0;
    spacing = spacing || context.p;
    parity = parity || 0;
    connectLines = connectLines || false;

    // constants
    var pi = Math.PI;
    var pi2 = pi * 2;
    var pi_2 = pi / 2;

    // rotate by 90 degrees if nonzero parity
    if (parity !== 0) angle += pi_2;

    var contourRotated = contour.clone(true).rotate(angle);

    var op = MCG.Sweep.Operations.linearInfill({
      spacing: spacing,
      connectLines: connectLines
    });

    var infillRotated = MCG.Sweep.sweep(op, contourRotated).infill;

    return infillRotated.rotate(-angle);
  }

  function generateGrid(contour, angle, spacing, connectLines) {
    context = contour.context;
    angle = angle || 0;
    spacing = spacing || context.p;
    connectLines = connectLines || false;

    // constants
    var pi = Math.PI;
    var pi2 = pi * 2;
    var pi_2 = pi / 2;

    // make the sweep operation
    var op = MCG.Sweep.Operations.linearInfill({
      spacing: spacing,
      connectLines: connectLines,
      handleIntersections: false
    });

    // clone and rotate the contour by the initial angle
    var contourRotated = contour.clone(true).rotate(angle);
    // construct the infill in one direction
    var infillRotated0 = MCG.Sweep.sweep(op, contourRotated).infill;

    // rotate by pi/2 further
    contourRotated.rotate(pi_2);
    // construct the infill in the orthogonal direction
    var infillRotated1 = MCG.Sweep.sweep(op, contourRotated).infill;

    // unrotate second direction, merge with first direction, unrotate both
    return infillRotated1.rotate(-pi_2).merge(infillRotated0).rotate(-angle);
  }

  return {
    Types: Types,
    generate: generate
  }

})());
