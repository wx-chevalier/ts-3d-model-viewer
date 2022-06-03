var step2stl = require('./node-ffi.js');
var fs = require('fs');

exports.convert = function(readstream, writestream) {

    var ramdisk = require('node-ramdisk')
    var disk = ramdisk('my_ramdisk')

    // create a ram disk with 200 MB
    disk.create(200, function (err, mount) {
        if (err) {
            console.log(err);
        } else {
            console.log(mount);

            var stepfile = mount+"/step";
            var stlfile = mount+"/stl";

            // write the readstream to ramdisk
            var stepstream = fs.createWriteStream(stepfile);

            stepstream.on('finish', function() {
                // convert step in ramdisk to stl
                console.log("convert");
                step2stl.step2stl.step2stl(stepfile, stlfile);
                
                // read stl into writestream
                console.log("read stl");
                var stlstream = fs.createReadStream(stlfile);
                stlstream.on('end', function() {
                    console.log("delete");
                    disk.delete(mount);
                });
                stlstream.pipe(writestream);
            });
            readstream.pipe(stepstream);
        }
    });
    
};
