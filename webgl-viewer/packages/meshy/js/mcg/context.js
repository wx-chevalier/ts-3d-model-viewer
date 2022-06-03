MCG.Context = (function() {

  function Context(axis, d, precision) {
    if (axis === undefined) axis = 'z';
    if (d === undefined) d = 0;
    if (precision === undefined) precision = 5;

    this.axis = axis;
    this.ah = cycleAxis(axis);
    this.av = cycleAxis(this.ah);
    this.up = makeAxisUnitVector(axis);
    this.d = d;
    this.precision = precision;

    this.epsilon = Math.pow(10, -this.precision);
    this.p = Math.pow(10, this.precision);

    this.type = MCG.Types.context;
  }

  Object.assign(Context.prototype, {

    constructor: Context,

    clone: function() {
      return new this.constructor(this.axis, this.d, this.precision);
    }

  });

  return Context;

})();
