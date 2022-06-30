let fs = require ('fs');
const assimpjs = require ('../dist/assimpjs.js')();

assimpjs.then ((ajs) => {
    // convert model
    let result = ajs.ConvertFile (
        // file name
        'cube_with_materials.obj',
        // file format
        'assjson',
        // file content as arraybuffer
        fs.readFileSync ('testfiles/cube_with_materials.obj'),
        // check if file exists by name
        function (fileName) {
            return fs.existsSync ('testfiles/' + fileName);
        },
        // get file content as arraybuffer by name
        function (fileName) {
            return fs.readFileSync ('testfiles/' + fileName);
        }
    );
    
    // check if the conversion succeeded
    if (!result.IsSuccess () || result.FileCount () == 0) {
        console.log (result.GetErrorCode ());
        return;
    }

    // get the result file, and convert to string
    let resultFile = result.GetFile (0);
    let jsonContent = new TextDecoder ().decode (resultFile.GetContent ());

    // parse the result json
    let resultJson = JSON.parse (jsonContent);

    console.log (resultJson);
});
