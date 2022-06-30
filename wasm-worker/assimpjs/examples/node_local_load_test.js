let fs = require ('fs');
const assimpjs = require ('../dist/assimpjs.js')();

assimpjs.then ((ajs) => {
    // create new file list object
    let fileList = new ajs.FileList ();
    
    // add model files
    fileList.AddFile (
        'cube_with_materials.obj',
        fs.readFileSync ('testfiles/cube_with_materials.obj')
    );
    fileList.AddFile (
        'cube_with_materials.mtl',
        fs.readFileSync ('testfiles/cube_with_materials.mtl')
    );
    
    // convert file list to assimp json
    let result = ajs.ConvertFileList (fileList, 'assjson');

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
