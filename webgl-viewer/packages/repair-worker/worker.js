self.addEventListener('message', function(e) {
    console.log("worker");
    const blob = e.data.blob;
    if (blob === undefined) {
        console.log("Unknown message from html");
        return;
    }
    check_repair(blob);
});

self.importScripts("filecheck.js");

let last_file_name;

function check_repair(blob) {

    var filename = blob.name;
    const repair_filename = "repair.stl";

    if (last_file_name !== undefined) {
        console.log("unlinking file");
        Module.FS_unlink(last_file_name);
    }
    last_file_name = filename;

    var fr = new FileReader();
    fr.readAsArrayBuffer(blob);

    fr.onload = function (){
        var data = new Uint8Array(fr.result); // base64 to Uint8 for emscripten

        Module.FS_createDataFile(".", filename, data, true, true);

        console.time("js_c_r");
        Module.ccall("js_check_repair", // c function name
                undefined, // return
                ["string", "string"], // param
                [filename, repair_filename]
        );
        console.timeEnd("js_c_r");

        const report_str = Module.FS_readFile("report.txt", {encoding:'utf8'});

        const report_json = JSON.parse(report_str);

        let repair_blob;

        if (report_json.is_good_repair) {
            const ply_binary = Module.FS_readFile("repair.stl");
            repair_blob = new Blob([ply_binary], {type: 'application/sla'});
        }

        if (repair_blob !== undefined)
            self.postMessage({"report": report_str, "blob": repair_blob, "name": filename});
        else
            self.postMessage({"report": report_str, "name": filename});
    }; // fr.onload
}
