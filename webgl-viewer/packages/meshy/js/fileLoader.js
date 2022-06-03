var FileLoader = function() {

  this.load = function(file, callback) {
    var fSplit = splitFilename(file.name);
    var filename = fSplit.name;
    var format = fSplit.extension;

    var reader = new FileReader();

    switch(format) {

      case 'obj':

        reader.addEventListener("load", function(event) {
          var result = event.target.result;
          var object = new THREE.OBJLoader().parse(result);

          var geo = new THREE.Geometry();

          if (object && object.children) {
            for (var i = 0; i < object.children.length; i++) {
              var bufferGeo = object.children[i].geometry;
              geo.merge(new THREE.Geometry().fromBufferGeometry(bufferGeo));
            }
          }

          if (callback) callback(geo, filename);
        });

        reader.readAsText(file);

        break;

      case 'stl':

        reader.addEventListener("load", function(event) {
          var result = event.target.result;
          var bufferGeo = new THREE.STLLoader().parse(result);
          var geo = new THREE.Geometry().fromBufferGeometry(bufferGeo);

          if (callback) callback(geo, filename);
        });

        if (reader.readAsBinaryString !== undefined) {
          reader.readAsBinaryString(file);
        }
        else {
          reader.readAsArrayBuffer(file);
        }

        break;

      default:
        throw "Unsupported format " + format;
    }
  };

};
