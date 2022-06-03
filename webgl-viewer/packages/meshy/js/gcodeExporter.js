var GcodeExporter = (function() {

  var newline = '\n';

  // convert per-second speed to per-minute speed
  function perSec2PerMin(val) {
    return val * 60;
  }

  function GcodeExporter() {
    this.filename = "gcode";
    this.extension = "gcode";
    this.travelSpeed = 9000;
    this.coordPrecision = 3,
    this.extruderPrecision = 5;

    this.init();

    this.gcode = "";
  }

  GcodeExporter.prototype.setFilename = function(filename) {
    if (filename !== undefined) this.filename = filename;
    return this;
  }

  GcodeExporter.prototype.setExtension = function(extension) {
    if (extension !== undefined) this.extension = extension;
    return this;
  }

  GcodeExporter.prototype.setTravelSpeed = function(speed) {
    if (speed !== undefined) this.travelSpeed = perSec2PerMin(speed);
    return this;
  }

  GcodeExporter.prototype.setCoordPrecision = function(precision) {
    if (precision !== undefined) this.coordPrecision = precision;
    return this;
  }

  GcodeExporter.prototype.setExtruderPrecision = function(precision) {
    if (precision !== undefined) this.extruderPrecision = precision;
    return this;
  }

  GcodeExporter.prototype.init = function() {
    this.position = new THREE.Vector3();
    this.e = 0;
    this.f = 0;

    this.gcode = "";

    return this;
  }

  GcodeExporter.prototype.write = function(s) {
    this.gcode += s;
  }

  // write a string and then a newline
  GcodeExporter.prototype.writeLn = function(s) {
    this.write(s + newline);
  }

  GcodeExporter.prototype.writeNewline = function() {
    this.write(newline);
  }

  // write a semicolon and then the comment text
  GcodeExporter.prototype.writeComment = function(c) {
    this.writeLn("; " + c);
  }

  GcodeExporter.prototype.writeHeader = function() {
    this.writeComment("FILENAME: " + this.filename + "." + this.extension);
    this.writeComment("GENERATED WITH MESHY");
  }

  GcodeExporter.prototype.writeAbsolutePositionionMode = function() {
    this.writeLn("M82");
  }

  GcodeExporter.prototype.writeHeatExtruder = function(temperature) {
    this.writeLn("M109 S" + temperature);
  }

  // movement functions

  // travel to a point using the default travel speed
  GcodeExporter.prototype.writeTravel = function(pt) {
    this._writeMoveXYZEF("G0", pt, undefined, this.travelSpeed);
  }

  // move to a point, optionally extruding and accelerating to the given speed
  GcodeExporter.prototype.writePrint = function(pt, e, fps) {
    this._writeMoveXYZEF("G1", pt, e, perSec2PerMin(fps));
  }

  // set only speed
  GcodeExporter.prototype.writeSpeed = function(speed) {
    var f = perSec2PerMin(speed);
    this.writeLn("G1 F" + f);

    this.f = f;
  }

  GcodeExporter.prototype.writeExtrusion = function(e, fps) {
    var cmd = "G1" + this._makeEParam(e);
    this.e = e;

    if (fps !== undefined) {
      var fpm = perSec2PerMin(fps);
      cmd += " F" + fpm;
      this.f = fpm;
    }

    this.writeLn(cmd);
  }

  GcodeExporter.prototype.writeExtruderPosition = function(e) {
    this.writeLn("G92 " + e);
    this.e = e;
  }

  GcodeExporter.prototype.writePrimingSequence = function(primeExtrusion) {
    // move extruder to endstops
    this.writeLn("G28");
    this.position.set(0, 0, 0);

    // if given a length of filament to extrude for a prime blob, move the
    // extruder up and extrude that much
    if (primeExtrusion) {
      this.writeTravel(this.position.clone().setZ(primeExtrusion * 5));
      this.writeExtruderPosition(0);
      this.writeExtrusion(primeExtrusion, 200);
      this.writeExtruderPosition(0);
    }
  }



  // internal writing functions

  GcodeExporter.prototype._makeXParam = function(value) {
    return " X" + value.toFixed(this.coordPrecision);
  }

  GcodeExporter.prototype._makeYParam = function(value) {
    return " Y" + value.toFixed(this.coordPrecision);
  }

  GcodeExporter.prototype._makeZParam = function(value) {
    return " Z" + value.toFixed(this.coordPrecision);
  }

  GcodeExporter.prototype._makeEParam = function(value) {
    return " E" + (+value.toFixed(this.extruderPrecision));
  }

  // write move with the given params
  GcodeExporter.prototype._writeMoveXYZEF = function(code, pt, e, f) {
    var cmd = code;

    if (pt !== undefined) {
      if (pt.x !== this.position.x) cmd += this._makeXParam(pt.x);
      if (pt.y !== this.position.y) cmd += this._makeYParam(pt.y);
      if (pt.z !== this.position.z) cmd += this._makeZParam(pt.z);

      this.position.copy(pt);
    }

    if (e !== undefined) {
      // e normalized to the given precision
      var en = +e.toFixed(this.extruderPrecision);

      if (en !== this.e) {
        cmd += " E" + en;
        this.e = en;
      }
    }

    if (f !== undefined && f !== this.f) {
      cmd += " F" + f;
      this.f = f;
    }

    this.writeLn(cmd);
  }

  GcodeExporter.prototype.saveToFile = function() {
    var blob = new Blob([this.gcode], { type: 'text/plain' });
    var fname = this.filename + "." + this.extension;

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

  return GcodeExporter;

})();
