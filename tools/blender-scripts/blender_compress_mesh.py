# Blender Python script for converting a mesh to GLB with Draco compression.
# Tested on Blender 2.82
# Usage:
#   Blender --background --factory-startup --addons io_scene_gltf2 --python blender_compress_mesh.py -- -i ./big.stl -o ./big
from os import path
from contextlib import redirect_stdout
from sys import argv
import argparse
import io
import bpy
import bpy_types
import datetime


def file_name(filepath):
    return path.split(filepath)[1]


def dir_path(filepath):
    return path.split(filepath)[0]


def file_suffix(filepath):
    return path.splitext(file_name(filepath))[1]


def import_func_wrapper(func, filepath):
    func(filepath=filepath)


def import_mesh(filepath):
    import_func = {
        '.obj': bpy.ops.import_scene.obj,
        '.ply': bpy.ops.import_mesh.ply,
        '.stl': bpy.ops.import_mesh.stl,
        '.wrl': bpy.ops.import_scene.x3d,
        '.x3d': bpy.ops.import_scene.x3d,
        '.glb': bpy.ops.import_scene.gltf,
        '.gltf': bpy.ops.import_scene.gltf
    }

    stdout = io.StringIO()
    with redirect_stdout(stdout):
        import_func_wrapper(
            import_func[file_suffix(filepath)], filepath=filepath)
        stdout.seek(0)
        return stdout.read()


def get_args():
    parser = argparse.ArgumentParser(
        description='Blender mesh file to GLB conversion tool')

    # get all script args
    _, all_arguments = parser.parse_known_args()
    double_dash_index = all_arguments.index('--')
    script_args = all_arguments[double_dash_index + 1:]

    # add parser rules
    parser.add_argument(
        '-r', '--ratio', help="Ratio of reduction, Example: 0.5 mean half number of faces ", default=0.5)
    parser.add_argument('-i', '--input', help='mesh file to be converted')
    parser.add_argument('-o', '--output', help='output GLB file')
    parsed_script_args, _ = parser.parse_known_args(script_args)
    return parsed_script_args


args = get_args()

if (args.input and args.output):
    ifile = args.input
    ofile = args.output

    err_msg = ''
    try:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()
        if len(bpy.data.objects) == 0:
            print("{} | start import", datetime.datetime.now().time())
            stdout = import_mesh(ifile)
            if len(bpy.data.objects) != 0:
                for obj in bpy.data.objects:
                    if type(obj.data) == bpy_types.Mesh:

                        bpy.context.view_layer.objects.active = obj

                        print("{} | start decimate, {} has {} verts, {} edges, {} polys".format(
                            datetime.datetime.now().time(), obj.name, len(
                                obj.data.vertices), len(obj.data.edges), len(obj.data.polygons)))
                        modifierName = 'DecimateMod'
                        decimateRatio = float(args.ratio)
                        modifier = obj.modifiers.new(modifierName, 'DECIMATE')
                        modifier.ratio = decimateRatio
                        modifier.use_collapse_triangulate = True
                        bpy.ops.object.modifier_apply(modifier=modifierName)
                        print("{} | {} has {} verts, {} edges, {} polys after decimation".format(
                            datetime.datetime.now().time(),
                            obj.name, len(obj.data.vertices), len(obj.data.edges), len(obj.data.polygons)))

                bpy.ops.object.convert(target='MESH')

                bpy.ops.object.origin_set()
                bpy.ops.export_scene.gltf(
                    filepath=ofile, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=5)
            else:
                # likely invalid file error, not an easy way to capture this from Blender
                err_msg = stdout.replace("\n", "; ")
        else:
            err_msg = 'Error deleting Blender scene objects'
    except Exception as e:
        err_msg = str(e).replace("\n", "; ")
else:
    err_msg = 'Command line arguments not supplied or inappropriate'

if err_msg:
    raise ValueError(err_msg)
else:
    print('Successfully converted')
