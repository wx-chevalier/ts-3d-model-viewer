
x = require('./node-step2stl.js');
fs = require('fs');

x.convert(fs.createReadStream("/Users/cfritz/work/ufab/data/STEP/simple_damper.stp"),
          fs.createWriteStream('/tmp/sd.stl'));
