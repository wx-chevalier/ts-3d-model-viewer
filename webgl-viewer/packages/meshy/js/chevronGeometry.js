var ChevronBufferGeometry = (function() {

  function ChevronBufferGeometry(width, height, thickness, insetHeight) {

    THREE.BufferGeometry.call(this);

    this.parameters = {
      width: width,
      height: height,
      thickness: thickness,
      insetHeight: insetHeight
    };

    var scope = this;

    width = width !== undefined ? width : 2;
    height = height !== undefined ? height : 1;
    thickness = thickness !== undefined ? thickness : 0.5;
    insetHeight = insetHeight !== undefined ? insetHeight : 0.5;

    var indices = [];
    var vertices = [];
    var normals = [];
    var uvs = [];

    var index = 0;

    var halfThickness = thickness / 2;
    var halfWidth = width / 2;
    var topWallLength = Math.sqrt(halfWidth * halfWidth + height * height);
    var insetWidth = insetHeight === 0 ? 0 : insetHeight * halfWidth / height;
    var insetWallLength = Math.sqrt(insetHeight * insetHeight + insetWidth * insetWidth);
    var botWallLength = halfWidth - insetWidth;
    var perimeterHalfLength = topWallLength + botWallLength + insetWallLength;

    var groupStart = 0;

    if (thickness > 0) {
      generateWall(true);
      generateWall(false);
    }

    generateCap(true);
    if (thickness > 0) {
      generateCap(false);
    }

    this.setIndex(indices);
    this.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.addAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    function generateWall(right) {
      var x0, z0, x1, z1;
      var normal = new THREE.Vector3();
      var vertex = new THREE.Vector3();
      var sign = right ? 1 : -1;

      var perimeterPos = right ? perimeterHalfLength * 2 : 0;

      // top wall
      normal.set(height * sign, 0, halfWidth).normalize();
      addFacePair(0, height, halfWidth * sign, 0, normal);
      uvs.push(perimeterPos / perimeterHalfLength, 1);
      uvs.push(perimeterPos / perimeterHalfLength, 0);
      perimeterPos += topWallLength * sign;
      uvs.push(perimeterPos / perimeterHalfLength, 1);
      uvs.push(perimeterPos / perimeterHalfLength, 0);

      // bot wall
      normal.set(0, 0, -1);
      addFacePair(halfWidth * sign, 0, insetWidth * sign, 0, normal);
      uvs.push(perimeterPos / perimeterHalfLength, 1);
      uvs.push(perimeterPos / perimeterHalfLength, 0);
      perimeterPos += botWallLength * sign;
      uvs.push(perimeterPos / perimeterHalfLength, 1);
      uvs.push(perimeterPos / perimeterHalfLength, 0);

      if (insetHeight > 0) {
        normal.set(-insetHeight * sign, 0, -insetWidth).normalize();
        addFacePair(insetWidth * sign, 0, 0, insetHeight, normal);
        uvs.push(perimeterPos / perimeterHalfLength, 1);
        uvs.push(perimeterPos / perimeterHalfLength, 0);
        perimeterPos += insetWallLength * sign;
        uvs.push(perimeterPos / perimeterHalfLength, 1);
        uvs.push(perimeterPos / perimeterHalfLength, 0);
      }

      function addFacePair(x0, z0, x1, z1, normal) {
        addVertexPair(x0, z0, normal);
        addVertexPair(x1, z1, normal);
        var i = index;
        if (right) {
          indices.push(i, i+1, i+3);
          indices.push(i, i+3, i+2);
        }
        else {
          indices.push(i, i+3, i+1);
          indices.push(i, i+2, i+3);
        }

        index += 4;
      }

      function addVertexPair(x, z, normal) {
        vertices.push(x, halfThickness, z);
        vertices.push(x, -halfThickness, z);
        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    function generateCap(top) {
      var sign = top ? 1 : -1;
      var normal = new THREE.Vector3(0, sign, 0);
      var vertex = new THREE.Vector3();
      var y = halfThickness * sign;

      // if no inset, just make one triangle
      if (insetHeight === 0) {
        addVertex(halfWidth * sign, y, 0);
        addVertex(-halfWidth * sign, y, 0);
        addVertex(0, y, height);

        indices.push(index, index+1, index+2);
        index += 3;
      }
      // else, make four triangle pairs
      else {
        addCapHalf(true);
        addCapHalf(false);
      }

      function addCapHalf(right) {
        var rsign = right ? 1 : -1;

        addVertex(halfWidth * rsign * sign, y, 0);
        addVertex(insetWidth * rsign * sign, y, 0);
        addVertex(0, y, insetHeight);
        addVertex(0, y, height);

        var i = index;
        if (right) {
          indices.push(i, i+1, i+2);
          indices.push(i, i+2, i+3);
        }
        else {
          indices.push(i, i+2, i+1);
          indices.push(i, i+3, i+2);
        }
        index += 4;
      }

      function addVertex(x, y, z) {
        vertices.push(x, y, z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(x / width + 0.5, 1 - z / height);
      }
    }
  }

  ChevronBufferGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
  ChevronBufferGeometry.prototype.constructor = ChevronBufferGeometry;

  return ChevronBufferGeometry;

})();
