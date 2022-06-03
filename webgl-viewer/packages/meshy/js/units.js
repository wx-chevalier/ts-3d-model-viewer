var Units = (function() {

  var mm = "mm";
  var cm = "cm";
  var inches = "inches";

  // conversion factors from other units to mm
  var mmfactors = {
    mm: 1,
    cm: 10,
    inches: 25.4
  };

  function getFactor(from, to) {
    if (!mmfactors.hasOwnProperty(from) || !mmfactors.hasOwnProperty(to)) return 1;

    return mmfactors[from] / mmfactors[to];
  }

  function id(val) { return val; }

  function getConverter(from, to) {
    var factor = getFactor(from, to);

    return function(val) { return val * factor; };
  }

  function getConverterV3(from, to) {
    var factor = getFactor(from, to);

    return function(val) { return val.clone().multiplyScalar(factor); };
  }

  return {
    mm: mm,
    cm: cm,
    inches: inches,
    getFactor: getFactor,
    getConverter: getConverter,
    getConverterV3: getConverterV3
  };

})();
