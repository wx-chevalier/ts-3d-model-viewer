Object.assign(MCG.Boolean, (function() {

  return {
    union: function(a, b, params) {
      var op = MCG.Sweep.Operations.union(params);

      return MCG.Sweep.sweep(op, a, b);
    },

    intersection: function(a, b, params) {
      var op = MCG.Sweep.Operations.intersection(params);
      var context = a.context;

      if (a.count() === 0 || b.count() === 0) return op.initStore(context).result;

      return MCG.Sweep.sweep(op, a, b);
    },

    intersectionOpen: function(a, b, params) {
      var op = MCG.Sweep.Operations.intersectionOpen(params);
      var context = a.context;

      if (a.count() === 0 || b.count() === 0) return op.initStore(context).result;

      return MCG.Sweep.sweep(op, a, b);
    },

    difference: function(a, b, params) {
      var op = MCG.Sweep.Operations.difference(params);
      var context = a.context;

      if (a.count() === 0) return op.initStore(context).result;
      if (b.count() === 0) return a;

      return MCG.Sweep.sweep(op, a, b);
    },

    fullDifference: function(a, b, params) {
      var op = MCG.Sweep.Operations.fullDifference(params);
      var context = a.context;

      if (a.count() === 0) {
        var result = op.initStore(context).result;
        result.BminusA = b;
        return result;
      }

      if (b.count() === 0) {
        var result = op.initStore(context).result;
        result.AminusB = a;
        return result;
      }

      return MCG.Sweep.sweep(op, a, b);
    }
  };

})());
