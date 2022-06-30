#define CATCH_CONFIG_MAIN

#include "catch.hpp"
#include "fileCheck.hpp"

std::string meshPath = "./unittest/meshes/";
checkResult_t results, repair_results;
repairRecord_t repair_record;
const auto repaired_path = meshPath+"repaired.stl";
const auto report_path = meshPath+"out.json";

TEST_CASE( "test successful loadMesh", "[file_check]" ) {
    MyMesh mesh;
    bool is_successful = loadMesh(mesh, meshPath+"perfect.stl");

    REQUIRE( is_successful == true );
}

TEST_CASE( "test successful loadMesh obj", "[file_check]" ) {
    MyMesh mesh;
    bool is_successful = loadMesh(mesh, meshPath+"perfect.obj");

    REQUIRE( is_successful == true );
}

TEST_CASE( "test not successful loadMesh", "[file_check]" ) {
    MyMesh mesh;
    bool is_successful = loadMesh(mesh, meshPath+"notexists.stl");

    REQUIRE( is_successful == false );
}

TEST_CASE( "test NoDegeneratedFace", "[file_check]" ) {
    MyMesh noDegenratedFacesMesh;
    loadMesh(noDegenratedFacesMesh, meshPath+"perfect.stl");
    REQUIRE(
        NumDegenratedFaces(noDegenratedFacesMesh) == 0
    );
}

TEST_CASE( "test DengeratedFaces", "[file_check]" ) {
    MyMesh DegenratedFacesMesh;
    loadMesh(DegenratedFacesMesh, meshPath+"degeneratedFaces.stl");
    REQUIRE(
        NumDegenratedFaces(DegenratedFacesMesh) == 2
    );
}

TEST_CASE( "test NoDuplicateFaces", "[file_check]" ) {
    MyMesh noDuplicateFacesMesh;
    loadMesh(noDuplicateFacesMesh, meshPath+"perfect.stl");
    REQUIRE( NumDuplicateFaces(noDuplicateFacesMesh) == 0 );
}

TEST_CASE( "test DuplicateFaces", "[file_check]" ) {
    MyMesh DuplicateFacesMesh;
    loadMesh(DuplicateFacesMesh, meshPath+"duplicateFaces.stl");
    REQUIRE( NumDuplicateFaces(DuplicateFacesMesh) == 1 );
}

TEST_CASE( "test WaterTight", "[file_check]" ) {
    MyMesh waterTightMesh;
    loadMesh(waterTightMesh, meshPath+"perfect.stl");
    REQUIRE( IsWaterTight(waterTightMesh) == true );
}

TEST_CASE( "test Not WaterTight", "[file_check]" ) {
    MyMesh notWaterTightMesh;
    loadMesh(notWaterTightMesh, meshPath+"notWatertight.stl");

    REQUIRE( IsWaterTight(notWaterTightMesh) == false );
}

TEST_CASE( "test Coherently Oriented", "[file_check]" ) {
    MyMesh coherentlyOrientedMesh;
    loadMesh(coherentlyOrientedMesh, meshPath+"perfect.stl");
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(coherentlyOrientedMesh);

    REQUIRE( IsCoherentlyOrientedMesh(coherentlyOrientedMesh) == true );
}

TEST_CASE( "test not Coherently Oriented", "[file_check]" ) {
    MyMesh notCoherentlyOrientedMesh;
    loadMesh(notCoherentlyOrientedMesh, meshPath+"notCoherentlyOriented.stl");
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(notCoherentlyOrientedMesh);

    REQUIRE( IsCoherentlyOrientedMesh(notCoherentlyOrientedMesh) == false );
}

TEST_CASE( "test Positive Volume", "[file_check]" ) {
    MyMesh positiveVolumeMesh;
    loadMesh(positiveVolumeMesh, meshPath+"perfect.stl");

    REQUIRE( IsPositiveVolume(positiveVolumeMesh) == true );
}

TEST_CASE( "test not Positive Volume", "[file_check]" ) {
    MyMesh notPositiveVolumeMesh;
    loadMesh(notPositiveVolumeMesh, meshPath+"notPositiveVolume.stl");

    REQUIRE( IsPositiveVolume(notPositiveVolumeMesh) == false );
}

TEST_CASE( "test no intersecting faces", "[file_check]" ) {
    MyMesh noIntersectingFacesMesh;
    loadMesh(noIntersectingFacesMesh, meshPath+"perfect.stl");
    REQUIRE( NumIntersectingFaces(noIntersectingFacesMesh) == 0 );
}

TEST_CASE( "test intersecting faces", "[file_check]" ) {
    MyMesh IntersectingFacesMesh;
    loadMesh(IntersectingFacesMesh, meshPath+"intersectingFaces.stl");
    REQUIRE( NumIntersectingFaces(IntersectingFacesMesh) > 0);
}

TEST_CASE( "test mesh boundary", "[file_check]" ) {
    MyMesh Mesh;
    loadMesh(Mesh, meshPath+"perfect.stl");
    Boundary(Mesh, results);

    REQUIRE( results.xmin == (float) -1.0 );
    REQUIRE( results.xmax == (float)  1.0 );
    REQUIRE( results.ymin == (float) -1.0 );
    REQUIRE( results.ymax == (float)  1.0 );
    REQUIRE( results.zmin == (float) -1.0 );
    REQUIRE( results.zmax == (float)  1.0 );
}

TEST_CASE( "test mesh area", "[file_check]" ) {
    MyMesh Mesh;
    loadMesh(Mesh, meshPath+"perfect.stl");
    REQUIRE(Area(Mesh) == (float) 24.);
}

TEST_CASE( "test mesh volume", "[file_check]" ) {
    MyMesh Mesh;
    loadMesh(Mesh, meshPath+"perfect.stl");
    REQUIRE(Volume(Mesh) == (float) 8.);
}

TEST_CASE( "test if non manifold edges exists no count hole", "[file_check]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"3dpia-frontplate.stl";

    loadMesh(mesh, filepath);
    results = file_check(mesh);

    REQUIRE(results.n_non_manifold_edges > 0); // this file has more than 0 non manifold edges
    // if it has non manifold edges, count hole cannot be runned
    REQUIRE(results.n_holes == -1);
}

TEST_CASE( "test shell", "[file_check]" ) {
    MyMesh mesh;
    loadMesh(mesh, meshPath+"perfect.stl");
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for IsSingleShell
    REQUIRE( NumShell(mesh) == 1 );
}

TEST_CASE( "test multiple shells", "[file_check]" ) {
    MyMesh mesh;
    loadMesh(mesh, meshPath+"twoCubes.stl");
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for IsSingleShell
    REQUIRE( NumShell(mesh) == 2);
}

TEST_CASE( "test flip", "[file_repair]" ) {
    MyMesh Mesh;
    auto filepath = meshPath+"notPositiveVolume.stl";
    loadMesh(Mesh, filepath);

    REQUIRE( IsPositiveVolume(Mesh) == false );
    bool doesFlip = DoesFlipNormalOutside(Mesh, true, true, false);
    REQUIRE( doesFlip == true );
    REQUIRE( IsPositiveVolume(Mesh) == true );
}

TEST_CASE( "test not flip", "[file_repair]" ) {
    MyMesh Mesh;
    auto filepath = meshPath+"perfect.stl";
    bool doesFlip = DoesFlipNormalOutside(Mesh, true, true, true);
    REQUIRE( doesFlip == false );
}

TEST_CASE( "test MakeCoherentlyOriented ", "[file_repair]" ) {
    MyMesh Mesh;
    auto filepath = meshPath+"notCoherentlyOriented.stl";
    loadMesh(Mesh, filepath);
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(Mesh);

    REQUIRE( IsCoherentlyOrientedMesh(Mesh) == false );
    bool doesFlip = DoesMakeCoherentlyOriented(Mesh, true, false);
    REQUIRE( doesFlip == true );
    REQUIRE( IsCoherentlyOrientedMesh(Mesh) == true );
}

TEST_CASE( "test not MakeCoherentlyOriented", "[file_repair]" ) {
    MyMesh Mesh;
    auto filepath = meshPath+"perfect.stl";
    bool doesFlip = DoesMakeCoherentlyOriented(Mesh, true, true);
    REQUIRE( doesFlip == false );
}


TEST_CASE( "test no file repair", "[file_repair]" ) {
    std::cout << " test no file repair" << std::endl;
    MyMesh mesh;
    auto filepath = meshPath+"perfect.stl";
    loadMesh(mesh, filepath);
    results = file_check(mesh);

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.does_fix_coherently_oriented == 0); // no fix coherently oriented
    REQUIRE(repair_record.does_fix_positive_volume == 0); // no fix negative volume
    REQUIRE(repair_record.n_non_manif_f_removed == 0); // no fix for remove non manifold
    REQUIRE(repair_record.n_hole_filled == 0); // no fix hole
    REQUIRE(repair_record.is_good_repair == 1); // good repair
    REQUIRE(results.is_good_mesh == 1); // good mesh
}

TEST_CASE( "test fix volume and coherent oriented", "[file_repair]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"notCoherentlyOriented.stl";
    loadMesh(mesh, filepath);
    results = file_check(mesh);
    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.does_fix_coherently_oriented == true); // fix for coherently oriented
    REQUIRE(repair_record.does_fix_positive_volume == true); // fix for negative volume
    REQUIRE(repair_record.n_non_manif_f_removed == 0); // no fix for remove non manifold
    REQUIRE(repair_record.n_hole_filled == 0); // no fix for hole
    REQUIRE(repair_record.is_good_repair == 1); // good repair
    REQUIRE(results.is_good_mesh == 0); // bad mesh
}

TEST_CASE( "test only fix positive volume", "[file_repair]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"notPositiveVolume.stl";
    loadMesh(mesh, filepath);
    results = file_check(mesh);

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.does_fix_coherently_oriented == 0); // no fix for coherently oriented
    REQUIRE(repair_record.does_fix_positive_volume == 1); // fix for negative volume
    REQUIRE(repair_record.n_non_manif_f_removed == 0); // no fix for remove non manifold
    REQUIRE(repair_record.n_hole_filled == 0); // no fix for hole
    REQUIRE(repair_record.is_good_repair == 1); // good repair
    REQUIRE(results.is_good_mesh == 0); // bad mesh
}

TEST_CASE( "test only fix coherently oriented", "[file_repair]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"mostly_notCoherentlyOriented.stl";
    loadMesh(mesh, filepath);
    results = file_check(mesh);

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.does_fix_coherently_oriented == 1); // fix for coherenltly oriented
    REQUIRE(repair_record.does_fix_positive_volume == 0); // fix for negative volume
    REQUIRE(repair_record.n_non_manif_f_removed == 0); // no fix for remove non manifold
    REQUIRE(repair_record.n_hole_filled == 0); // no fix for hole
    REQUIRE(repair_record.is_good_repair == 1); // good repair
    REQUIRE(results.is_good_mesh == 0); // bad mesh
}

// for some reason there is error running test IsSingleShell function
TEST_CASE( "test single shell", "[file_repair]" ) {
    MyMesh mesh;
    int numConnectedComponents;

    auto filepath = meshPath+"perfect.stl";
    loadMesh(mesh, filepath);

    results = file_check(mesh);
    REQUIRE(results.n_shells == 1); // one shell

    filepath = meshPath+"twoCubes.stl";
    loadMesh(mesh, filepath);

    results = file_check(mesh);
    REQUIRE(results.n_shells == 2); // one shell
}

TEST_CASE( "test repair for hole", "[file_repair]" ) {

    MyMesh mesh;
    auto filepath = meshPath+"2MissingFacesSphereWithLargeCube.stl";

    loadMesh(mesh, filepath);
    results = file_check(mesh);
    REQUIRE( IsWaterTight(mesh) == false );

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.does_fix_coherently_oriented == 0); // no fix for coherently oriented
    REQUIRE(repair_record.does_fix_positive_volume == 0); // fix for negative volume
    REQUIRE(repair_record.n_non_manif_f_removed == 0); // no fix for remove non manifold
    REQUIRE(repair_record.n_hole_filled == 1); // no fix for hole
    REQUIRE(repair_record.is_good_repair == 1); // good repair
    REQUIRE(results.is_good_mesh == 0); // bad mesh

    vcg::tri::io::ExporterSTL<MyMesh>::Save(mesh, repaired_path.c_str());
    MyMesh repaired_mesh;
    loadMesh(repaired_mesh, repaired_path);
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for isWaterTight
    REQUIRE( IsWaterTight(repaired_mesh) == true );
}

TEST_CASE( "test repair for non manifold", "[file_repair]" ) {

    MyMesh mesh;
    auto filepath = meshPath+"nonManifoldFaces.stl";

    loadMesh(mesh, filepath);

    results = file_check(mesh);
    REQUIRE( IsWaterTight(mesh) == false );

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.does_fix_coherently_oriented == 0); // no fix for coherently oriented
    REQUIRE(repair_record.does_fix_positive_volume == 0); // fix for negative volume
    REQUIRE(repair_record.n_non_manif_f_removed == 3); // remove 3 non manifold faces
    REQUIRE(repair_record.n_hole_filled == 0); // no fix for hole
    REQUIRE(repair_record.is_good_repair == 1); // good repair
    REQUIRE(results.is_good_mesh == 0); // bad mesh

    vcg::tri::io::ExporterSTL<MyMesh>::Save(mesh, repaired_path.c_str());
    MyMesh repaired_mesh;
    loadMesh(repaired_mesh, repaired_path);
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for isWaterTight
    REQUIRE( IsWaterTight(repaired_mesh) == true );
}

TEST_CASE( "test successful repair", "[file_repair]" ) {

    MyMesh mesh;
    auto filepath = meshPath+"2MissingFacesSphereWithLargeCube.stl";

    loadMesh(mesh, filepath);

    results = file_check(mesh);
    REQUIRE(results.is_good_mesh == 0); // bad mesh

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.is_good_repair == 1); // good repair
}

TEST_CASE( "test non-successful repair", "[file_repair]" ) {

    MyMesh mesh;
    auto filepath = meshPath+"MoreIntersectingFacesAfterRepair.stl";

    loadMesh(mesh, filepath);

    results = file_check(mesh);
    REQUIRE(results.is_good_mesh == 0); // bad mesh

    // file_repair(mesh, results, repair_record, repaired_path);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.is_good_repair == 0); // bad repair
}

TEST_CASE( "test repair hole with 4 edges", "[file_repair]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"2MissingFacesSphereWithLargeCube.stl";

    loadMesh(mesh, filepath);

    results = file_check(mesh);
    repair_record = file_repair_then_check(mesh, results, repaired_path);
    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.n_hole_filled == 1); // good repair
}

TEST_CASE( "test repair hole with more than 1 hole", "[file_repair]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"2HolesWithLargeCube.stl";

    loadMesh(mesh, filepath);

    results = file_check(mesh);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.n_hole_filled == 2); // good repair
}

TEST_CASE( "test not repair large hole", "[file_repair]" ) {
    MyMesh mesh;
    auto filepath = meshPath+"largeHole.stl";

    loadMesh(mesh, filepath);

    results = file_check(mesh);
    repair_record = file_repair_then_check(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);  // version 1
    REQUIRE(repair_record.n_hole_filled == 0); // good repair
}

TEST_CASE( "test exporter", "[util]" ) {
    MyMesh mesh;
    bool is_successful = loadMesh(mesh, meshPath+"perfect.stl");
    const auto export_stl_path = meshPath+"repaired.stl";
    const auto export_ply_path = meshPath+"repaired.ply";

    exportMesh(mesh, export_stl_path);
    REQUIRE(util::exists(export_stl_path) == true); // good repair

    exportMesh(mesh, export_ply_path);
    REQUIRE(util::exists(export_ply_path) == true); // good repair
}

TEST_CASE( "test final export json", "[overall]" ) {

    auto filepath = meshPath+"2HolesWithLargeCube.stl";
    check_repair_main(filepath, repaired_path, report_path);

    ifstream f(report_path);
    REQUIRE(f.good() == true); // check exists
    f.close();

    json_t json;
    std::ifstream i(report_path);
    i >> json;
    i.close();

    std::remove(report_path.c_str());

    const std::vector<std::string> keys= {
        "num_version",
        "num_face",
        "num_vertices",
        "num_degenerated_faces_removed",
        "num_duplicated_faces_removed",
        "is_watertight",
        "is_coherently_oriented",
        "is_positive_volume",
        "num_intersecting_faces",
        "num_shells",
        "num_non_manifold_edges",
        "num_holes",
        "is_good_mesh",
        "min_x",
        "max_x",
        "min_y",
        "max_y",
        "min_z",
        "max_z",
        "area",
        "volume",
        "repair_version",
        "does_make_coherent_orient",
        "does_flip_normal_outside",
        "num_rm_non_manif_faces",
        "num_hole_fix",
        "is_good_repair",
        "r_num_version",
        "r_num_face",
        "r_num_vertices",
        "r_num_degenerated_faces_removed",
        "r_num_duplicated_faces_removed",
        "r_is_watertight",
        "r_is_coherently_oriented",
        "r_is_positive_volume",
        "r_num_intersecting_faces",
        "r_num_shells",
        "r_num_non_manifold_edges",
        "r_num_holes",
        "r_is_good_mesh",
        "r_min_x",
        "r_max_x",
        "r_min_y",
        "r_max_y",
        "r_min_z",
        "r_max_z",
        "r_area",
        "r_volume",
    };

    for (auto key : keys) {
        REQUIRE(json.count(key) == 1);
    }

}
