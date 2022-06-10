#include "fileCheck.hpp"

void Boundary(MyMesh & mesh, checkResult_t& r) {
    vcg::tri::UpdateBounding<MyMesh>::Box(mesh);
    r.xmin = mesh.bbox.min.X();
    r.xmax = mesh.bbox.max.X();
    r.ymin = mesh.bbox.min.Y();
    r.ymax = mesh.bbox.max.Y();
    r.zmin = mesh.bbox.min.Z();
    r.zmax = mesh.bbox.max.Z();
}

unsigned int NumDegenratedFaces(MyMesh & mesh) { // change mesh in-place
    const int beforeNumFaces = mesh.FN();

    bool RemoveDegenerateFlag=true;
    Clean_t::RemoveDuplicateVertex(mesh, RemoveDegenerateFlag); // remove degenerateFace, removeDegenerateEdge, RemoveDuplicateEdge

    const int afterNumFaces = mesh.FN();

    return beforeNumFaces - afterNumFaces;
}

unsigned int NumDuplicateFaces(MyMesh & mesh) { // change mesh in-place
    const int beforeNumFaces = mesh.FN();

    Clean_t::RemoveDuplicateFace(mesh); // remove degenerateFace, removeDegenerateEdge, RemoveDuplicateEdge

    const int afterNumFaces = mesh.FN();

    return beforeNumFaces - afterNumFaces;
}

unsigned int NumIntersectingFaces(MyMesh & mesh) { // change mesh in-place

    std::vector<MyFace *> IntersectingFaces;
    Clean_t::SelfIntersections(mesh, IntersectingFaces);

    return IntersectingFaces.size();

    // FILE * fp;
    // int counter = 1;
    // fp = fopen("./intersecting.obj", "w+");
    // for (auto const& face: IntersectingFaces) {
        // auto v0 = face->cV(0)->cP();
        // auto v1 = face->cV(1)->cP();
        // auto v2 = face->cV(2)->cP();
        // fprintf(fp, "v %f %f %f \n", v0[0], v0[1], v0[2]);
        // fprintf(fp, "v %f %f %f \n", v1[0], v1[1], v1[2]);
        // fprintf(fp, "v %f %f %f \n", v2[0], v2[1], v2[2]);
        // fprintf(fp, "f %i %i %i \n", counter, counter+1, counter+2);
        // // fprintf(fp, "\n");
        // counter += 3;
    // }
}

bool IsWaterTight(MyMesh & mesh) {
    return Clean_t::IsWaterTight(mesh);
}


bool IsCoherentlyOrientedMesh(MyMesh & mesh) {
    return Clean_t::IsCoherentlyOrientedMesh(mesh);
}

float Volume(MyMesh & mesh) {
    vcg::tri::Inertia<MyMesh> Ib(mesh);
    return Ib.Mass();
}

bool IsPositiveVolume(MyMesh & mesh) {
    return Volume(mesh) > 0. ;
}

float Area(MyMesh & mesh) {
    float area = 0;
    for(auto fi = mesh.face.begin(); fi!=mesh.face.end();++fi)
        if(!fi->IsD())
            area += DoubleArea(*fi)/2;
    return area;
}

unsigned int NumShell(MyMesh & mesh) {
    return Clean_t::CountConnectedComponents(mesh);
}

bool IsGoodMesh(checkResult_t r) {
    assert(r.version == 4);

    bool isWaterTight = r.is_watertight;
    bool isCoherentlyOriented = r.is_coherently_oriented;
    bool isPositiveVolume = r.is_positive_volume;

    if (isWaterTight and isCoherentlyOriented and isPositiveVolume) {
        return true;
    } else {
        return false;
    }
}


// std::vector<std::vector<vcg::Point3<float>>> CountHoles(MyMesh & m)
int CountHoles(MyMesh & m)
{
    vcg::tri::UpdateFlags<MyMesh>::FaceClearV(m);
    // std::vector<std::vector<vcg::Point3<float>>> vpss;

    int loopNum=0;
    for(auto fi=m.face.begin(); fi!=m.face.end();++fi) if(!fi->IsD())
    {
        for(int j=0;j<3;++j)
        {
            if(!fi->IsV() && vcg::face::IsBorder(*fi,j))
            {
                vcg::face::Pos<MyFace> startPos(&*fi,j);
                vcg::face::Pos<MyFace> curPos=startPos;

                std::vector<vcg::Point3<float>> vps;

                do
                {
                    auto curFace = curPos.F();
                    curPos.NextB();
                    curPos.F()->SetV();
                    /*
                    auto face = curPos.F();
                    auto edgeIndex = curPos.E();
                    if (edgeIndex == 0) {
                        vps.push_back(face->cV(0)->cP());
                        vps.push_back(face->cV(1)->cP());
                    } else if (edgeIndex == 1) {
                        vps.push_back(face->cV(1)->cP());
                        vps.push_back(face->cV(2)->cP());
                    } else {
                        assert(edgeIndex == 2);
                        vps.push_back(face->cV(2)->cP());
                        vps.push_back(face->cV(0)->cP());
                    }
                    */
                }
                while(curPos!=startPos);
                // vpss.push_back(vps);
                ++loopNum;
            }
        }
    }
    return loopNum;
    // return vpss;
}

// TODO: vpss is a hack, this is not a VCG way
/*
void repair_hole(
        MyMesh & mesh, std::vector<std::vector<vcg::Point3<float>>> vpss
    ) {
    std::cout<<"in repair hole " << vpss.size() <<std::endl;
    for (auto& vps : vpss) {
        if (vps.size() >= 6) {

            const int num_edges = vps.size()/2;

            vcg::Point3<float> center(0, 0, 0);
            for (auto& n : vps) center += n;

            center[0] /= vps.size();
            center[1] /= vps.size();
            center[2] /= vps.size();

            for (int count=0;count<num_edges;count++) {
                vcg::tri::Allocator<MyMesh>::AddFace(
                    mesh, vps[count*2 + 1], vps[count*2], center);
                std::cout<<"add faces"<<std::endl;
            }
        }
    }
}
*/

bool callback(int percent, const char *str) {
    std::cout << "str: " << str << " " << percent << "%\r\n";
    return true;
}

// holesize is compared with < in the hole.h, since we are limiting the max Volume we can relax the hole size a little
int repair_hole(MyMesh & mesh, int holeSize = 100) {
    std::cout << "------------------hole repairing before face count " << mesh.FN() << "\n";
    // auto hole_count = vcg::tri::Hole<MyMesh>::EarCuttingFill<vcg::tri::SelfIntersectionEar<MyMesh> >(mesh,holeSize,false,callback);
    // auto hole_count = vcg::tri::Hole<MyMesh>::EarCuttingFill<vcg::tri::SelfIntersectionEar<MyMesh> >(mesh,holeSize,false,callback);
    vcg::tri::UpdateBounding<MyMesh>::Box(mesh);
    const float maxDimLimit = 0.01 * max(max(mesh.bbox.DimX(), mesh.bbox.DimY()), mesh.bbox.DimZ());
    auto hole_count = vcg::tri::Hole<MyMesh>::EarCuttingIntersectionFill<vcg::tri::SelfIntersectionEar<MyMesh>>(mesh,holeSize,maxDimLimit,false,callback);

    vcg::tri::UpdateFlags<MyMesh>::FaceBorderFromFF(mesh);
    assert(vcg::tri::Clean<MyMesh>::IsFFAdjacencyConsistent(mesh));

    std::cout << "--------number of holes repaired " << hole_count << "\n";
    std::cout << "-------- after number of faces" << mesh.FN() << "\n";
    return hole_count;
}

bool loadMesh(MyMesh & mesh, const std::string filepath) {
    auto t1 = std::chrono::high_resolution_clock::now();
    int a = 2; // TODO: understand what this is

    std::string extension = util::extension_lower(filepath);
    // std::string extension = "ply";

    if (extension == "stl") {
        if(vcg::tri::io::ImporterSTL<MyMesh>::Open(mesh, filepath.c_str(),  a))
        {
            printf("Error reading file  %s\n", filepath.c_str());
            return false;
        }
    } else if (extension == "obj") {
        typedef vcg::tri::io::ImporterOBJ<MyMesh> ImporterOBJ;

        auto error_code = ImporterOBJ::Open(mesh, filepath.c_str(),  a);
        auto error_message = ImporterOBJ::ErrorMsg(error_code);
        auto error_critical = ImporterOBJ::ErrorCritical(error_code);

        if (error_code!=0 && !error_critical) { // even error code critical error
            printf("Reading file  %s with Non Critical Error %s\n", filepath.c_str(), error_message);
        } else if (error_critical) { // odd error code critical error
            printf("Error reading file  %s with Critical Error %s\n", filepath.c_str(), error_message);
            return false;
        }
    } else if (extension == "ply") {
        if(vcg::tri::io::ImporterPLY<MyMesh>::Open(mesh, filepath.c_str(),  a))
        {
            // printf("Error reading file  %s\n", filepath.c_str());
            // return false; // TODO: understand this
        }
    } else {
        return false;
    }

    bool RemoveDegenerateFlag=false;
    Clean_t::RemoveDuplicateVertex(mesh, RemoveDegenerateFlag);

    auto t2 = std::chrono::high_resolution_clock::now();
    std::cout << "loadMesh() took "
        << std::chrono::duration_cast<std::chrono::milliseconds>(t2-t1).count()
        << " milliseconds\n";
    return true;
}

bool exportMesh(MyMesh & mesh, const std::string exportPath) {
    const auto extension = util::extension_lower(exportPath);

    if (extension == "ply")
        vcg::tri::io::ExporterPLY<MyMesh>::Save(mesh, exportPath.c_str());
    else if (extension == "stl")
        vcg::tri::io::ExporterSTL<MyMesh>::Save(mesh, exportPath.c_str());
    else {
        throw std::runtime_error("Not Supported Export Type " + extension);
        return false;
    }

    return true;
}

bool reloadMesh(MyMesh& mesh) {
    const auto random_ply = std::to_string(std::rand()) + ".ply";
    exportMesh(mesh, random_ply); // ply
    loadMesh(mesh, random_ply);
    vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for isWaterTight

    std::remove(random_ply.c_str());
    return true;
}

checkResult_t file_check(MyMesh & m) {
    auto t1 = std::chrono::high_resolution_clock::now();
    checkResult_t r;

    r.version = 4; // set version number

    r.n_degen_faces = NumDegenratedFaces(m);
    r.n_duplicate_faces = NumDuplicateFaces(m);

    r.n_faces = m.FN();
    r.n_vertices = m.VN();

    Boundary(m, r);
    r.area = Area(m);
    r.volume = Volume(m);

    vcg::tri::UpdateTopology<MyMesh>::FaceFace(m); // require for isWaterTight

    r.is_watertight = IsWaterTight(m);

    r.is_coherently_oriented = IsCoherentlyOrientedMesh(m);

    r.is_positive_volume = IsPositiveVolume(m);

    r.n_intersecting_faces = NumIntersectingFaces(m);

    r.n_shells = NumShell(m);

    // non manifold edges in a mesh, e.g. the edges where there are more than 2 incident faces
    r.n_non_manifold_edges = Clean_t::CountNonManifoldEdgeFF(m);

    if (r.n_non_manifold_edges == 0) {
        auto numHoles = Clean_t::CountHoles(m);
        r.n_holes = numHoles;
    } else {
        r.n_holes = -1; // -1 indicates it cannot be runned
    }

    r.is_good_mesh = IsGoodMesh(r);

    auto t2 = std::chrono::high_resolution_clock::now();
    std::cout << "file_check() took "
        << std::chrono::duration_cast<std::chrono::milliseconds>(t2-t1).count()
        << " milliseconds\n";
    return r;
}

// repairResult_t repair_check(MyMesh& m) {
    // return (repairResult_t) file_check(m);
// }

bool DoesFlipNormalOutside(MyMesh & mesh, bool isWaterTight, bool isCoherentlyOriented, bool isPositiveVolume) {
    if (isWaterTight && isCoherentlyOriented && not isPositiveVolume) {
        Clean_t::FlipMesh(mesh);
        return true;
    } else {
        return false;
    }
}

bool DoesMakeCoherentlyOriented(MyMesh & mesh, bool isWaterTight, bool isCoherentlyOriented) {
    if (isWaterTight && not isCoherentlyOriented) {
        bool isOriented = true;
        bool isOrientable = true;
        Clean_t::OrientCoherentlyMesh(mesh, isOriented, isOrientable);
        return true;
    } else {
        return false;
    }
}

repairRecord_t file_repair(
        MyMesh & mesh, checkResult_t check_r, const std::string repaired_path
    ) {

    auto t1 = std::chrono::high_resolution_clock::now();
    repairRecord_t r;

    assert(check_r.version == 4); // version number needs to be 1

    bool isWaterTight = check_r.is_watertight;
    const int numNonManifoldEdge = check_r.n_non_manifold_edges;
    bool isCoherentlyOriented = check_r.is_coherently_oriented;

    if (!isWaterTight and numNonManifoldEdge > 0) {
        r.n_non_manif_f_removed = Clean_t::RemoveNonManifoldFace(mesh);

        // reload mesh
        reloadMesh(mesh);
        // exportMesh(mesh, repaired_path); // ply
        // MyMesh repaired_mesh;
        // loadMesh(mesh, repaired_path);
        // vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for isWaterTight

        isWaterTight = IsWaterTight(mesh);
        isCoherentlyOriented = IsCoherentlyOrientedMesh(mesh);
    } else {
        r.n_hole_filled = 0;
    }

    if (!isWaterTight) {
        int numHoles = repair_hole(mesh); // new repair hole
        if (numHoles > 0) {
            r.n_hole_filled = numHoles;
            Clean_t::RemoveDuplicateVertex(mesh, true);

            // reload mesh
            reloadMesh(mesh);
            // exportMesh(mesh, repaired_path); // ply
            // MyMesh repaired_mesh;
            // loadMesh(mesh, repaired_path);
            // vcg::tri::UpdateTopology<MyMesh>::FaceFace(mesh); // require for isWaterTight

            isWaterTight = IsWaterTight(mesh);
            isCoherentlyOriented = IsCoherentlyOrientedMesh(mesh);
        }
    } else {
        r.n_hole_filled = 0;
    }

    bool doesMakeCoherentlyOriented = DoesMakeCoherentlyOriented(mesh, isWaterTight, isCoherentlyOriented);
    r.does_fix_coherently_oriented = doesMakeCoherentlyOriented;

    isCoherentlyOriented = IsCoherentlyOrientedMesh(mesh);
    bool isPositiveVolume = IsPositiveVolume(mesh);

    if (doesMakeCoherentlyOriented) { // update volume because makeCoherentlyOriented will change the volume
        isPositiveVolume = IsPositiveVolume(mesh);
    }

    bool doesFlipNormalOutside = DoesFlipNormalOutside(mesh, isWaterTight, isCoherentlyOriented, isPositiveVolume);
    r.does_fix_positive_volume = doesFlipNormalOutside;

    auto t2 = std::chrono::high_resolution_clock::now();
    std::cout << "file_repair() took "
        << std::chrono::duration_cast<std::chrono::milliseconds>(t2-t1).count()
        << " milliseconds\n";

    reloadMesh(mesh); // mesh becomes the repaired mesh
    exportMesh(mesh, repaired_path);

    return r;
}

bool IsGoodRepair(checkResult_t results, repairResult_t repair_results) {
    assert(results.version == 4); // correct version
    if (not repair_results.is_good_mesh) // if it is not good mesh
        return false;
    if (results.n_shells != repair_results.n_shells) // require same number of shells
        return false;
    if (results.n_intersecting_faces != repair_results.n_intersecting_faces) // require same number of intersecting faces
        return false;
    return true;
}

repairResult_t file_repair_then_check(
        MyMesh & mesh, checkResult_t results, const std::string repaired_path
    ) {
    auto repair_record = file_repair(mesh, results, repaired_path);

    assert(repair_record.r_version == 1);

    repairResult_t repair_results(file_check(mesh), repair_record);

    repair_results.is_good_repair = IsGoodRepair(results, repair_results);

    return repair_results;
}

void file_check(const std::string filepath) {
    printf("reading file  %s\n",filepath.c_str());

    MyMesh mesh;
    int a = 2;
    if(vcg::tri::io::ImporterSTL<MyMesh>::Open(mesh, filepath.c_str(),  a))
    {
        printf("Error reading file  %s\n",filepath.c_str());
        exit(0);
    }
    file_check(mesh);
}

int check_repair_main(
        const std::string filepath,
        const std::string repaired_path,
        const std::string report_path
) {
    MyMesh mesh;
    bool successfulLoadMesh = loadMesh(mesh, filepath);

    if (not successfulLoadMesh) {
        return 1;
    }
    auto results = file_check(mesh);

    json_t json;
    results.output_report(json);

    if (not results.is_good_mesh) {
        repairResult_t repair_results = file_repair_then_check(mesh, results, repaired_path);
        repair_results.output_report(json);
    }

    std::ofstream file(report_path);
    file << json;
    file.close();
    return 0;
}

extern "C" {
    int js_check_repair(const char* filepath, const char* repaired_path) {
        std::string _filepath(filepath);
        std::string _repaired_path(repaired_path);
        return check_repair_main(_filepath, _repaired_path, "report.txt");
    }
}

// TODO: write test for this function
#ifndef FILECHECK_TEST
int main( int argc, char *argv[] )
{
    std::string filepath = "./unittest/meshes/perfect.stl";
    if (argc < 2) {
        printf("path to stl file not provided use default %s\n", filepath.c_str());
    } else {
        filepath = argv[1];
    }

    std::string repaired_path = "./out/repaired_perfect.stl";
    if (argc >= 3) {
        repaired_path = argv[2];
        // assert(extension_lower(repaired_path)  == "ply");
    } else {
        printf("repaired path is not given writing to %s\n", repaired_path.c_str());
    }

    if (filepath == repaired_path) {
        printf("DANGER! export filepath is the same with original filepath!\n");
        printf("file path %s repaired file path %s\n",
                filepath.c_str(),
                repaired_path.c_str());
        return 1;
    }


    std::string report_path;
    if (argc >= 4) {
        report_path = argv[3];
    } else {
        printf("report path is not given, writing to stdout\n");
    }

    return check_repair_main(filepath, repaired_path, report_path);
}
#endif
