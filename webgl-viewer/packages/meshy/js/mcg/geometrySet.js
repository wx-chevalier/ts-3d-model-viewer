MCG.GeometrySet = (function() {

  function GeometrySet(context) {
    this.context = context;

    this.elements = [];

    this.min = null;
    this.max = null;

    this.initBounds();

    this.type = MCG.Types.abstractGeometrySet;
  }

  Object.assign(GeometrySet.prototype, {

    add: function(e) {
      if (e.valid()) {
        this.elements.push(e);

        e.updateBoundsFromThis(this.min, this.max);
      }

      return this;
    },

    initBounds: function() {
      var context = this.context;

      this.min = new MCG.Vector(context).setScalar(Infinity);
      this.max = new MCG.Vector(context).setScalar(-Infinity);
    },

    count: function() {
      return this.elements.length;
    },

    forEach: function(f) {
      var elements = this.elements;
      var ct = this.elements.length;

      for (var i = 0; i < ct; i++) {
        f(elements[i]);
      }
    },

    filter: function(valid) {
      var result = [];

      this.forEach(function(element) {
        if (valid(element)) result.push(element);
      });

      this.elements = result;

      return this;
    },

    rotate: function(angle) {
      this.initBounds();
      var _this = this;

      this.forEach(function(element) {
        element.rotate(angle);
        element.updateBoundsFromThis(_this.min, _this.max);
      });

      return this;
    },

    clone: function(recursive) {
      var clone = new this.constructor(this.context);
      var elements = clone.elements;

      this.forEach(function(element) {
        elements.push(recursive ? element.clone(recursive) : element);
      });

      return clone;
    },

    merge: function(other) {
      var elements = this.elements;

      other.forEach(function(element) {
        elements.push(element);
      });

      return this;
    },

    setContext: function(context) {
      this.context = context;

      return this;
    }

  });

  return GeometrySet;

})();
