#ifndef FILECHECK_HPP
#define FILECHECK_HPP

// #include <vcg/complex/complex.h>
// #include <vcg/complex/algorithms/closest.h>
// #include <vcg/space/index/grid_static_ptr.h>
// #include <vcg/space/index/spatial_hashing.h>
// #include <vcg/complex/algorithms/update/normal.h>
#include <vcg/space/triangle3.h>

#include <vcg/complex/complex.h>
#include <vcg/complex/algorithms/clean.h>

#include <wrap/io_trimesh/import_obj.h>
#include <wrap/io_trimesh/import_stl.h>
#include <wrap/io_trimesh/export_stl.h>
#include <wrap/io_trimesh/import_ply.h>
#include <wrap/io_trimesh/export_ply.h>

#include <vcg/complex/algorithms/inertia.h>
#include <vcg/complex/algorithms/hole.h>

#include <iostream>
#include <sstream>
#include <fstream>
#include <array>
#include <stdio.h>
#include <stdlib.h>
#include <chrono>
#include <stdexcept>

#include "util.hpp"
#include "json.hpp"
using json_t=nlohmann::json;

class MyVertex; class MyFace; class MyEdge;
struct MyUsedTypes : public vcg::UsedTypes<vcg::Use<MyVertex>   ::AsVertexType,
                            vcg::Use<MyFace>     ::AsFaceType,
                            vcg::Use<MyEdge>     ::AsEdgeType>{};

class MyVertex  : public vcg::Vertex< MyUsedTypes,
    vcg::vertex::Coord3f,
    vcg::vertex::Normal3f,
    vcg::vertex::Mark,
    vcg::vertex::BitFlags  >{};

class MyFace    : public vcg::Face< MyUsedTypes,
    vcg::face::FFAdj,
    vcg::face::Normal3f,
    vcg::face::VertexRef,
    vcg::face::Mark,
    vcg::face::BitFlags > {};

class MyEdge: public vcg::Edge< MyUsedTypes,
    vcg::edge::VertexRef > {};

class MyMesh    : public vcg::tri::TriMesh< std::vector<MyVertex>, std::vector<MyFace> , std::vector<MyEdge> > {};

typedef vcg::tri::Clean<MyMesh> Clean_t;


bool loadMesh(MyMesh & mesh, const std::string filepath);
bool exportMesh(MyMesh & mesh, const std::string exportPath);

float Volume(MyMesh & mesh);
float Area(MyMesh & mesh);

unsigned int NumDegenratedFaces(MyMesh & mesh);
unsigned int NumDuplicateFaces(MyMesh & mesh);
unsigned int NumIntersectingFaces(MyMesh & mesh);

bool IsWaterTight(MyMesh & mesh);
bool IsCoherentlyOrientedMesh(MyMesh & mesh);
bool IsPositiveVolume(MyMesh & mesh);
unsigned int NumShell(MyMesh & mesh);
bool IsGoodMesh(int* results);

class checkResult_t {

    public:

    unsigned int version = 4; // 0 version number
    unsigned int n_faces; // 1 face number
    unsigned int n_vertices; // 2 vertices number
    unsigned int n_degen_faces; // 3 number of degenerated faces
    unsigned int n_duplicate_faces; // 4 number of duplicate faces
    bool is_watertight; // 5 is watertight
    bool is_coherently_oriented; // 6 is coherently oriented
    bool is_positive_volume; // 7 is positive volume
    unsigned int n_intersecting_faces; // 8 number of intersecting faces
    unsigned int n_shells; // 9 number of connected components
    unsigned int n_non_manifold_edges; //10 number of non manifold edges
    unsigned int n_holes; //11 number of holes
    bool is_good_mesh; //11 good or bad

    // file stat
    float xmin; float xmax;
    float ymin; float ymax;
    float zmin; float zmax;
    float area; float volume;

    std::string prefix;

    void output_report(json_t& json) {
        assert(version == 4);
        json[prefix + "num_version"]=                    version;
        json[prefix + "num_face"]=                       n_faces;
        json[prefix + "num_vertices"]=                   n_vertices;
        json[prefix + "num_degenerated_faces_removed"]=  n_degen_faces;
        json[prefix + "num_duplicated_faces_removed"]=   n_duplicate_faces;
        json[prefix + "is_watertight"]=                  is_watertight;
        json[prefix + "is_coherently_oriented"]=         is_coherently_oriented;
        json[prefix + "is_positive_volume"]=             is_positive_volume;
        json[prefix + "num_intersecting_faces"]=         n_intersecting_faces;
        json[prefix + "num_shells"]=                     n_shells;
        json[prefix + "num_non_manifold_edges"]=         n_non_manifold_edges;
        json[prefix + "num_holes"]=                      n_holes;
        json[prefix + "is_good_mesh"]=                   is_good_mesh;
        json[prefix + "min_x"]=                          xmin;
        json[prefix + "max_x"]=                          xmax;
        json[prefix + "min_y"]=                          ymin;
        json[prefix + "max_y"]=                          ymax;
        json[prefix + "min_z"]=                          zmin;
        json[prefix + "max_z"]=                          zmax;
        json[prefix + "area"]=                           area;
        json[prefix + "volume"]=                         volume;
    }

    unsigned int getNFaces() {
        return n_faces;
    }

};

class repairRecord_t {

    public:

    unsigned int r_version = 1; // 0 repair version
    bool does_fix_coherently_oriented; // 1 fix CoherentlyOriented
    bool does_fix_positive_volume; // 2 fix not Positive Volume
    unsigned int n_non_manif_f_removed = 0; // 4 remove non manifold faces
    unsigned int n_hole_filled = 0; // 5 fix hole
    bool is_good_repair = false; // 6 is good repair

    void output_report(json_t& json) {
        assert(r_version == 1);
        json["repair_version"]           = r_version;
        json["does_make_coherent_orient"]= does_fix_coherently_oriented;
        json["does_flip_normal_outside"] = does_fix_positive_volume;
        json["num_rm_non_manif_faces"]   = n_non_manif_f_removed;
        json["num_hole_fix"]             = n_hole_filled;
        json["is_good_repair"]           = is_good_repair;
    }
};

// class repairResult_t: public checkResult_t, public repairRecord_t {
class repairResult_t: public checkResult_t, public repairRecord_t {
    public:
        repairResult_t(checkResult_t r, repairRecord_t rr) {
            // ----------------------- check result --------------------------
            checkResult_t::prefix = "r_";
            n_faces = r.n_faces;
            n_vertices = r.n_vertices;
            n_degen_faces=r.n_degen_faces;
            n_duplicate_faces=r.n_duplicate_faces;
            is_watertight=r.is_watertight;
            is_coherently_oriented=r.is_coherently_oriented;
            is_positive_volume=r.is_positive_volume;
            n_intersecting_faces=r.n_intersecting_faces;
            n_shells=r.n_shells;
            n_non_manifold_edges=r.n_non_manifold_edges;
            n_holes=r.n_holes;
            is_good_mesh=r.is_good_mesh;
            xmin = r.xmin; xmax = r.xmax;
            ymin = r.ymin; ymax = r.ymax;
            zmin = r.zmin; zmax = r.zmax;
            area = r.area; volume = r.volume;

            // ----------------------- report result --------------------------
            r_version = rr.r_version;
            does_fix_coherently_oriented = rr.does_fix_coherently_oriented;
            does_fix_positive_volume = rr.does_fix_positive_volume;
            n_non_manif_f_removed = rr.n_non_manif_f_removed;
            n_hole_filled = rr.n_hole_filled;
            is_good_repair = rr.is_good_repair;
        }

    void output_report(json_t& json) {
        checkResult_t::output_report(json);
        repairRecord_t::output_report(json);
    }
};

void Boundary(MyMesh & mesh, checkResult_t& boundary);

checkResult_t file_check(MyMesh & m);

extern "C" {
    void file_check(const std::string filepath, int* results);
}

bool DoesFlipNormalOutside(MyMesh & mesh,
    bool isWaterTight, bool isCoherentlyOriented, bool isPositiveVolume);
bool DoesMakeCoherentlyOriented(MyMesh & mesh,
    bool isWaterTight, bool isCoherentlyOriented);
// std::vector<std::vector<vcg::Point3<float>>> CountHoles(MyMesh & m);
int CountHoles(MyMesh & m);
int repair_hole(
    MyMesh & mesh, std::vector<std::vector<vcg::Point3<float>>> vpss
);

repairRecord_t file_repair(
    MyMesh & mesh, const checkResult_t check_r, const std::string repaired_path
);

repairResult_t file_repair_then_check(
    MyMesh & mesh, const checkResult_t check_r, const std::string repaired_path
);

int check_repair_main(
    const std::string filepath,
    const std::string repaired_path,
    const std::string report_path
);

#endif
