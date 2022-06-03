var FFI = require('ffi'),
    ref = require('ref'),
    os = require('os');


var voidPtr = ref.refType(ref.types.void);

exports.CONSTANTS = {
};

var libFile;
if (os.platform() == "darwin") {
    libFile = 'step2stl.so.dylib';
} else if (os.platform() == "linux") {
    libFile = 'step2stl.so';
}

exports.step2stl = new FFI.Library(libFile, {
    step2stl: [ref.types.int32, [
        ref.types.CString,
        ref.types.CString,
    ]],
});

