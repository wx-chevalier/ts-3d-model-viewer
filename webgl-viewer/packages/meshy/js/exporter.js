// Generate file output representing the model and save it.

var Exporter = (function() {

  function Exporter() {
    this.littleEndian = true;
    this.p = 6;
  }

  Object.assign(Exporter.prototype, {

    export: function(mesh, format, name, factor) {
      mesh = mesh || new THREE.Mesh();
      format = format || "obj";
      name = name || "meshy";
      factor = factor || 1;

      var littleEndian = this.littleEndian;
      var p = this.p;

      var blob;
      var fname;
      var geo = mesh.geometry;
      var matrix = mesh.matrixWorld;

      var count = geo.faces.length;
      var vertices = geo.vertices;
      var faces = geo.faces;

      var vector = new THREE.Vector3();

      if (format=="stl") {
        var stlSize = 84 + 50 * count;
        var array = new ArrayBuffer(stlSize);
        var offset = 80;
        var dv = new DataView(array);

        // write face count
        dv.setUint32(offset, count, littleEndian);
        offset += 4;

        // write faces
        for (var f = 0; f < count; f++) {
          var face = faces[f];

          writeVector3(face.normal);

          for (var v = 0; v < 3; v++) {
            vector.copy(vertices[face[faceGetSubscript(v)]]);
            vector.applyMatrix4(matrix);
            vector.multiplyScalar(factor);

            writeVector3(vector);
          }

          // the "attribute byte count" should be set to 0 according to
          // https://en.wikipedia.org/wiki/STL_(file_format)
          dv.setUint8(offset, 0);
          dv.setUint8(offset+1, 0);

          offset += 2;
        }

        function writeVector3(vector) {
          dv.setFloat32(offset, vector.x, littleEndian);
          dv.setFloat32(offset + 4, vector.y, littleEndian);
          dv.setFloat32(offset + 8, vector.z, littleEndian);

          offset += 12;
        }

        blob = new Blob([dv]);
        fname = name + ".stl";
      }
      else if (format=="stlascii") {
        var p = this.p;
        var indent2 = "  ", indent4 = "    ", indent6 = "      ";
        var out = "";

        out =  "solid " + name + '\n';
        for (var f = 0; f < count; f++) {
          var faceOut = "";
          var face = faces[f];
          faceOut += indent2 + "facet normal" + writeVector3(face.normal) + '\n';
          faceOut += indent4 + "outer loop" + '\n';
          for (var v = 0; v < 3; v++) {
            vector.copy(vertices[face[faceGetSubscript(v)]]);
            vector.applyMatrix4(matrix);
            vector.multiplyScalar(factor);

            faceOut += indent6 + "vertex" + writeVector3(vector) + '\n';
          }
          faceOut += indent4 + "endloop" + '\n';
          faceOut += indent2 + "endfacet" + '\n';

          out += faceOut;
        }
        out += "endsolid";

        function writeVector3(v) {
          line = "";
          for (var i=0; i<3; i++) line += " " + (+v.getComponent(i).toFixed(p));
          return line;
        }

        blob = new Blob([out], { type: 'text/plain' });
        fname = name + ".stl";
      }
      else if (format=="obj") {
        var out = "";

        out =  "# OBJ exported from Meshy, 0x00019913.github.io/meshy \n";
        out += "# NB: this file only stores faces and vertex positions. \n";
        out += "# number vertices: " + vertices.length + "\n";
        out += "# number triangles: " + faces.length + "\n";
        out += "#\n";
        out += "# vertices: \n";

        // write the list of vertices
        for (var v = 0; v < vertices.length; v++) {
          var line = "v";

          vector.copy(vertices[v]);
          vector.applyMatrix4(matrix);
          vector.multiplyScalar(factor);

          for (var c = 0; c < 3; c++) line += " " + (+vector.getComponent(c).toFixed(p));

          line += "\n";
          out += line;
        }

        out += "# faces: \n";
        for (var f = 0; f < count; f++) {
          var line = "f";
          var face = faces[f];

          for (var v = 0; v < 3; v++) {
            line += " " + (face[faceGetSubscript(v)] + 1);
          }

          line += "\n";
          out += line;
        }

        blob = new Blob([out], { type: 'text/plain' });
        fname = name+".obj";
      }
      else {
        throw "Exporting format '"+format+"' is not supported.";

        return;
      }

      var a = document.createElement("a");
      if (window.navigator.msSaveOrOpenBlob) { // IE :(
        window.navigator.msSaveOrOpenBlob(blob, fname);
      }
      else {
        var url = URL.createObjectURL(blob);
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        });
      }
    }
  });



  return Exporter;

})();
