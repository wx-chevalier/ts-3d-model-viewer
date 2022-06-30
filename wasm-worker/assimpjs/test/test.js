var fs = require ('fs');
var path = require ('path');
var assert = require ('assert');

var config = 'Release'
if (process.env.TEST_CONFIG !== undefined) {
	config = process.env.TEST_CONFIG;
}
var assimpjs = require ('../build_wasm/' + config + '/assimpjs.js')();

var ajs = null;
before (async function () {
	if (ajs !== null) {
		return;
	}
	ajs = await assimpjs;
});

function GetTestFileLocation (fileName)
{
	return path.join (__dirname, '../assimp/test/models/' + fileName);
}

function LoadModel (files)
{
	let fileList = new ajs.FileList ();
	for (let i = 0; i < files.length; i++) {
		let filePath = GetTestFileLocation (files[i]);
		fileList.AddFile (filePath, fs.readFileSync (filePath))
	}
	return ajs.ConvertFileList (fileList, 'assjson');
}

function IsError (files)
{
	let result = LoadModel (files);
	return !result.IsSuccess ();
}

function IsSuccess (files)
{
	let result = LoadModel (files);
	return result.IsSuccess ();
}

describe ('Importer', function () {

it ('Empty file list', function () {
	assert (IsError ([]));
});

it ('Not importable file', function () {
	assert (IsError (['3DS/test.png']));
});

it ('Independent order', function () {
	assert (IsSuccess (['OBJ/cube_usemtl.obj', 'OBJ/cube_usemtl.mtl']));
	assert (IsSuccess (['OBJ/cube_usemtl.mtl', 'OBJ/cube_usemtl.obj']));
});

it ('Delay load', function () {
	let result = ajs.ConvertFile (
		'OBJ/cube_usemtl.obj',
		'assjson',
		fs.readFileSync (GetTestFileLocation ('OBJ/cube_usemtl.obj')),
		function (fileName) {
			return fs.existsSync (GetTestFileLocation ('OBJ/' + fileName));
		},
		function (fileName) {
			return fs.readFileSync (GetTestFileLocation ('OBJ/' + fileName));
		}
	);
	assert (result.IsSuccess ());
	assert (result.FileCount () == 1);
	let jsonFile = result.GetFile (0);
	let jsonString = new TextDecoder ().decode (jsonFile.GetContent ());
	let scene = JSON.parse (jsonString);
	assert.deepStrictEqual (scene.materials[1].properties[4].value, [1, 1, 1]);
});

it ('glTF export', function () {
	let files = ['OBJ/cube_usemtl.obj', 'OBJ/cube_usemtl.mtl'];
	let fileList = new ajs.FileList ();
	for (let i = 0; i < files.length; i++) {
		let filePath = GetTestFileLocation (files[i]);
		fileList.AddFile (filePath, fs.readFileSync (filePath))
	}
	{
		let result = ajs.ConvertFileList (fileList, 'gltf2');
		assert (result.IsSuccess ());
		assert.equal (result.FileCount (), 2);
		assert.equal (result.GetFile (0).GetPath (), 'result.gltf');
		assert.equal (result.GetFile (1).GetPath (), 'result.bin');
	}
	{
		let result = ajs.ConvertFileList (fileList, 'glb2');
		assert (result.IsSuccess ());
		assert.equal (result.FileCount (), 1);
		assert.equal (result.GetFile (0).GetPath (), 'result.glb');
	}
});

it ('3D', function () {
	assert (IsSuccess (['3D/box.uc', '3D/box_a.3d', '3D/box_d.3d']));
});

it ('3DS', function () {
	assert (IsSuccess (['3DS/test1.3ds']));
	assert (IsSuccess (['3DS/fels.3ds']));
	assert (IsSuccess (['3DS/cubes_with_alpha.3DS']));
	assert (IsSuccess (['3DS/cube_with_specular_texture.3DS']));
	assert (IsSuccess (['3DS/cube_with_diffuse_texture.3DS']));
	assert (IsSuccess (['3DS/RotatingCube.3DS']));
});

it ('3MF', function () {
	assert (IsSuccess (['3MF/box.3mf']));
});

it ('AC', function () {
	assert (IsSuccess (['AC/SphereWithLight.ac']));
	assert (IsSuccess (['AC/SphereWithLight_UTF8BOM.ac']));
});

it ('AMF', function () {
	assert (IsSuccess (['AMF/test_with_mat.amf']));
	assert (IsSuccess (['AMF/test1.amf']));
	assert (IsSuccess (['AMF/test2.amf']));
	assert (IsSuccess (['AMF/test3.amf']));
	assert (IsSuccess (['AMF/test4.amf']));
	assert (IsSuccess (['AMF/test5.amf']));
	assert (IsSuccess (['AMF/test6.amf']));
	assert (IsSuccess (['AMF/test7.amf']));
	assert (IsSuccess (['AMF/test8.amf']));
	assert (IsSuccess (['AMF/test9.amf']));
});

it ('ASE', function () {
	assert (IsSuccess (['ASE/ThreeCubesGreen.ASE']));
	assert (IsSuccess (['ASE/RotatingCube.ASE']));
	assert (IsSuccess (['ASE/CameraRollAnim.ase']));
	assert (IsSuccess (['ASE/CameraRollAnimWithChildObject.ase']));
});

it ('B3D', function () {
	assert (IsSuccess (['B3D/WusonBlitz.b3d']));
});

it ('BLEND', function () {
	assert (IsSuccess (['BLEND/box.blend']));
	assert (IsSuccess (['BLEND/AreaLight_269.blend']));
});

it ('BVH', function () {
	assert (IsSuccess (['BVH/Boxing_Toes.bvh']));
});

it ('COB', function () {
	assert (IsSuccess (['COB/molecule.cob']));
	assert (IsSuccess (['COB/dwarf.cob']));
});

it ('COLLADA', function () {
	assert (IsSuccess (['COLLADA/duck.dae']));
	assert (IsSuccess (['COLLADA/duck.zae']));
	assert (IsSuccess (['COLLADA/COLLADA.dae']));
	assert (IsSuccess (['COLLADA/COLLADA_triangulate.dae']));
	assert (IsSuccess (['COLLADA/ConcavePolygon.dae']));
	assert (IsSuccess (['COLLADA/cube_tristrips.dae']));
	assert (IsSuccess (['COLLADA/cube_emptyTags.dae']));
	assert (IsSuccess (['COLLADA/cube_triangulate.dae']));
	assert (IsSuccess (['COLLADA/earthCylindrical.DAE']));
	assert (IsSuccess (['COLLADA/human.zae']));
	assert (IsSuccess (['COLLADA/lights.dae']));
	assert (IsSuccess (['COLLADA/sphere.dae']));
	assert (IsSuccess (['COLLADA/sphere_triangulate.dae']));
	assert (IsSuccess (['COLLADA/teapot_instancenodes.DAE']));
	assert (IsSuccess (['COLLADA/teapots.DAE']));
});

it ('CSM', function () {
	assert (IsSuccess (['CSM/ThomasFechten.csm']));
});

it ('DXF', function () {
	assert (IsSuccess (['DXF/PinkEggFromLW.dxf']));
	assert (IsSuccess (['DXF/wuson.dxf']));
});

it ('FBX', function () {
	assert (IsSuccess (['FBX/box.fbx']));
	assert (IsSuccess (['FBX/cubes_nonames.fbx']));
	assert (IsSuccess (['FBX/cubes_with_names.fbx']));
	assert (IsSuccess (['FBX/global_settings.fbx']));
	assert (IsSuccess (['FBX/spider.fbx']));
	assert (IsSuccess (['FBX/phong_cube.fbx']));
	assert (IsSuccess (['FBX/embedded_ascii/box.FBX']));
	assert (IsSuccess (['FBX/embedded_ascii/box_embedded_texture_fragmented.fbx']));
});

it ('glTF', function () {
	assert (IsSuccess (['glTF/BoxTextured-glTF/BoxTextured.gltf', 'glTF/BoxTextured-glTF/BoxTextured.bin']));
	assert (IsSuccess (['glTF/BoxTextured-glTF-Embedded/BoxTextured.gltf']));
	assert (IsSuccess (['glTF/CesiumMilkTruck/CesiumMilkTruck.gltf', 'glTF/CesiumMilkTruck/CesiumMilkTruck.bin']));
});

it ('glTF2', function () {
	assert (IsSuccess (['glTF2/BoxTextured-glTF/BoxTextured.gltf', 'glTF2/BoxTextured-glTF/BoxTextured0.bin']));
	assert (IsSuccess (['glTF2/BoxTextured-glTF-Binary/BoxTextured.glb']));
	assert (IsSuccess (['glTF2/2CylinderEngine-glTF-Binary/2CylinderEngine.glb']));
});

it ('HMP', function () {
	assert (IsSuccess (['HMP/terrain.hmp']));
});

it ('IFC', function () {
	// IFC importer is disabled
	assert (IsError (['IFC/AC14-FZK-Haus.ifc']));
});

it ('IRR', function () {
	// IRR importer is disabled
	assert (IsError (['IRR/box.irr']));
});

it ('IRRMesh', function () {
	// IRRMESH importer is disabled
	assert (IsError (['IRRMesh/spider.irrmesh']));
});

it ('LWO', function () {
	assert (IsSuccess (['LWO/LWO2/hierarchy.lwo']));
	assert (IsSuccess (['LWO/LWO2/nonplanar_polygon.lwo']));
	assert (IsSuccess (['LWO/LWO2/sphere_with_gradient.lwo']));
	assert (IsSuccess (['LWO/LWO2/sphere_with_mat_gloss_10pc.lwo']));
	assert (IsSuccess (['LWO/LWO2/transparency.lwo']));
	assert (IsSuccess (['LWO/LWO2/uvtest.lwo']));
	assert (IsSuccess (['LWO/LXOB_Modo/sphereWithVertMap.lxo']));

	assert (IsError (['LWO/LWOB/sphere_with_mat_gloss_10pc.lwo']));
});

it ('LWS', function () {
	assert (IsSuccess (['LWS/move_x.lws']));
	assert (IsSuccess (['LWS/simple_cube.lwo']));
});

it ('M3D', function () {
	// M3D importer is disabled
	assert (IsError (['M3D/cube_usemtl.m3d']));
});

it ('MD2', function () {
	assert (IsSuccess (['MD2/faerie.md2']));
	assert (IsSuccess (['MD2/sydney.md2']));
});

it ('MD5', function () {
	assert (IsSuccess (['MD5/SimpleCube.md5mesh']));
});

it ('MDC', function () {
	assert (IsSuccess (['MDC/spider.mdc']));
});

// it ('MDL', function () {
// 	// TODO: timeout
// 	assert (IsError (['MDL/MDL (HL1)/man.mdl']));
// 	assert (IsSuccess (['MDL/MDL3 (3DGS A4)/minigun.MDL']));
// 	assert (IsSuccess (['MDL/MDL5 (3DGS A5)/minigun_mdl5.mdl']));
// 	assert (IsSuccess (['MDL/MDL7 (3DGS A7)/Sphere_DiffPinkBlueSpec_Alpha90.mdl']));
// });

it ('MS3D', function () {
	assert (IsSuccess (['MS3D/twospheres.ms3d']));
	assert (IsSuccess (['MS3D/twospheres_withmats.ms3d']));
	assert (IsSuccess (['MS3D/Wuson.ms3d']));
});

it ('NFF', function () {
	assert (IsSuccess (['NFF/NFF/cylinder.nff']));
	assert (IsSuccess (['NFF/NFF/hexahedron.nff']));
	assert (IsSuccess (['NFF/NFF/spheres.nff']));
});

it ('OBJ', function () {
	assert (IsSuccess (['OBJ/box.obj']));
	assert (IsSuccess (['OBJ/box_longline.obj']));
	assert (IsSuccess (['OBJ/box_mat_with_spaces.obj']));
	assert (IsSuccess (['OBJ/spider.obj']));
	assert (IsSuccess (['OBJ/cube_usemtl.obj']));
	assert (IsSuccess (['OBJ/cube_usemtl.obj', 'OBJ/cube_usemtl.mtl']));
});

it ('OFF', function () {
	assert (IsSuccess (['OFF/Cube.off']));
	assert (IsSuccess (['OFF/Wuson.off']));
});

it ('Ogre', function () {
	assert (IsSuccess (['Ogre/TheThing/Mesh.mesh.xml', 'Ogre/TheThing/BlockMat.material']));
});

it ('OpenGEX', function () {
	assert (IsSuccess (['OpenGEX/Example.ogex']));
	assert (IsSuccess (['OpenGEX/camera.ogex']));
});

it ('PLY', function () {
	assert (IsSuccess (['PLY/cube.ply']));
	assert (IsSuccess (['PLY/cube_binary.ply']));
	assert (IsSuccess (['PLY/cube_uv.ply']));
	assert (IsSuccess (['PLY/Wuson.ply']));
});

it ('Q3D', function () {
	assert (IsSuccess (['Q3D/earth.q3o']));
	assert (IsSuccess (['Q3D/E-AT-AT.q3o']));
	assert (IsSuccess (['Q3D/WusonOrange.q3o']));
	assert (IsSuccess (['Q3D/WusonOrange.q3s']));
});

it ('RAW', function () {
	// RAW importer is disabled
	assert (IsError (['RAW/WithColor.raw']));
});

it ('SIB', function () {
	assert (IsSuccess (['SIB/heffalump.sib']));
});

it ('SMD', function () {
	assert (IsSuccess (['SMD/triangle.smd']));
	assert (IsSuccess (['SMD/holy_grailref.smd']));
	assert (IsSuccess (['SMD/WusonSMD.smd']));
});

it ('STL', function () {
	assert (IsSuccess (['STL/Spider_ascii.stl']));
	assert (IsSuccess (['STL/Spider_binary.stl']));
	assert (IsSuccess (['STL/sphereWithHole.stl']));
	assert (IsSuccess (['STL/3DSMaxExport.STL']));
	assert (IsSuccess (['STL/Wuson.stl']));
});

it ('TER', function () {
	// TER importer is disabled
	assert (IsError (['TER/RealisticTerrain.ter']));
});

it ('X', function () {
	assert (IsSuccess (['X/test_cube_text.x']));
	assert (IsSuccess (['X/test_cube_compressed.x']));
	assert (IsSuccess (['X/test_cube_binary.x']));
});

it ('X3D', function () {
	// X3D importer is disabled
	assert (IsError (['X3D/ComputerKeyboard.x3d']));
});

it ('XGL', function () {
	assert (IsSuccess (['XGL/cubes_with_alpha.zgl']));
	assert (IsSuccess (['XGL/sample_official.xgl']));
	assert (IsSuccess (['XGL/Wuson.zgl']));
});

});
