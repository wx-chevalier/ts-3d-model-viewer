/****************************************************************************
* VCGLib                                                            o o     *
* Visual and Computer Graphics Library                            o     o   *
*                                                                _   O  _   *
* Copyright(C) 2004-2016                                           \/)\/    *
* Visual Computing Lab                                            /\/|      *
* ISTI - Italian National Research Council                           |      *
*                                                                    \      *
* All rights reserved.                                                      *
*                                                                           *
* This program is free software; you can redistribute it and/or modify      *
* it under the terms of the GNU General Public License as published by      *
* the Free Software Foundation; either version 2 of the License, or         *
* (at your option) any later version.                                       *
*                                                                           *
* This program is distributed in the hope that it will be useful,           *
* but WITHOUT ANY WARRANTY; without even the implied warranty of            *
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the             *
* GNU General Public License (http://www.gnu.org/licenses/gpl.txt)          *
* for more details.                                                         *
*                                                                           *
****************************************************************************/

#include<vcg/space/triangle3.h>
#include<vcg/complex/complex.h>
#include<vcg/complex/algorithms/hole.h>
#include<vcg/complex/algorithms/local_optimization.h>
#include<vcg/complex/algorithms/local_optimization/tri_edge_flip.h>
#include<vcg/complex/algorithms/smooth.h>
#include<vcg/complex/algorithms/refine.h>

#include <fileCheck.hpp>

// input output
#include <wrap/io_trimesh/import_stl.h>
#include <wrap/io_trimesh/export_stl.h>

using namespace vcg;
using namespace std;

class _MyFace;
class _MyVertex;
struct _MyUsedTypes : public UsedTypes<	Use<_MyVertex>		::AsVertexType,
    Use<_MyFace>			::AsFaceType>{};

class _MyVertex  : public Vertex< _MyUsedTypes, vertex::Coord3f, vertex::BitFlags, vertex::Normal3f, vertex::Mark, vertex::Color4b >{};
class _MyFace    : public Face  < _MyUsedTypes, face::VertexRef,face::FFAdj, face::Mark, face::BitFlags, face::Normal3f> {};

class _MyMesh : public tri::TriMesh< vector<_MyVertex>, vector<_MyFace > >{};

//Delaunay
class MyDelaunayFlip: public vcg::tri::TriEdgeFlip< _MyMesh, MyDelaunayFlip > {
public:
    typedef  vcg::tri::TriEdgeFlip< _MyMesh,  MyDelaunayFlip > TEF;
    inline MyDelaunayFlip(  const TEF::PosType &p, int i,BaseParameterClass *pp) :TEF(p,i,pp){}
};

bool callback(int percent, const char *str) {
  cout << "str: " << str << " " << percent << "%\r";
  return true;
}

template <class MESH>
bool NormalTest(typename face::Pos<typename MESH::FaceType> pos)
{
    //giro intorno al vertice e controllo le normali
    typename MESH::ScalarType thr = 0.0f;
        typename MESH::CoordType NdP = vcg::TriangleNormal<typename MESH::FaceType>(*pos.f);
    typename MESH::CoordType tmp, oop, soglia = typename MESH::CoordType(thr,thr,thr);
    face::Pos<typename MESH::FaceType> aux=pos;
    do{
        aux.FlipF();
        aux.FlipE();
                oop = Abs(tmp - ::vcg::TriangleNormal<typename MESH::FaceType>(*pos.f));
        if(oop < soglia )return false;
    }while(aux != pos && !aux.IsBorder());

    return true;
}

bool loadMesh(_MyMesh & mesh, const std::string filepath) {
    int a = 2; // TODO: understand what this is
        if(vcg::tri::io::ImporterSTL<_MyMesh>::Open(mesh, filepath.c_str(),  a))
        {
                printf("Error reading file  %s\n", filepath.c_str());
                return false;
            }
    bool RemoveDegenerateFlag=false;
        vcg::tri::Clean<_MyMesh>::RemoveDuplicateVertex(mesh, RemoveDegenerateFlag);
}

int main(int argc,char ** argv){

    if(argc<5)
    {
        printf(
            "\n     HoleFilling (" __DATE__ ")\n"
            "Visual Computing Group I.S.T.I. C.N.R.\n"
      "Usage: trimesh_hole #algorithm #size filein.stl fileout.stl \n"
            "#algorithm: \n"
            " 1) Trivial Ear \n"
            " 2) Minimum weight Ear \n"
            " 3) Selfintersection Ear \n"
            " 4) Minimum weight \n"
            );
        exit(0);
    }

    int algorithm = atoi(argv[1]);
    int holeSize  = atoi(argv[2]);
    if(algorithm < 0 && algorithm > 4)
    {
    printf("Error in algorithm's selection %i\n",algorithm);
        exit(0);
    }

    _MyMesh m;

    int loadMask = 0;
    //if(tri::io::ImporterSTL<_MyMesh>::Open(m,argv[3], loadMask)!=0)
    //{
        //printf("Error reading file  %s\n",argv[2]);
        //exit(0);
    //}

    loadMesh(m, argv[3]);

    //update the face-face topology
    tri::UpdateTopology<_MyMesh>::FaceFace(m);
    tri::UpdateNormal<_MyMesh>::PerVertexPerFace(m);
    tri::UpdateFlags<_MyMesh>::FaceBorderFromFF(m);
  assert(tri::Clean<_MyMesh>::IsFFAdjacencyConsistent(m));

    //compute the average of face area
    float AVG,sumA=0.0f;
    int numA=0,indice;
    indice = m.face.size();
    _MyMesh::FaceIterator fi;
    for(fi=m.face.begin();fi!=m.face.end();++fi)
    {
            sumA += DoubleArea(*fi)/2;
            numA++;
            for(int ind =0;ind<3;++ind)
                fi->V(ind)->InitIMark();
    }
    AVG=sumA/numA;

  //tri::Hole<_MyMesh> holeFiller;
    switch(algorithm)
    {
  case 1:			tri::Hole<_MyMesh>::EarCuttingFill<tri::TrivialEar<_MyMesh> >(m,holeSize,false);                	        break;
  case 2:   	tri::Hole<_MyMesh>::EarCuttingFill<tri::MinimumWeightEar< _MyMesh> >(m,holeSize,false,callback);          break;
  case 3: 		tri::Hole<_MyMesh>::EarCuttingIntersectionFill<tri::SelfIntersectionEar< _MyMesh> >(m,holeSize,false);		break;
  case 4: 		tri::Hole<_MyMesh>::MinimumWeightFill(m,holeSize, false); tri::UpdateTopology<_MyMesh>::FaceFace(m);      break;
    }

    tri::UpdateFlags<_MyMesh>::FaceBorderFromFF(m);

  assert(tri::Clean<_MyMesh>::IsFFAdjacencyConsistent(m));

  printf("\nStart refinig...\n");

/*start refining */
    _MyMesh::VertexIterator vi;
    _MyMesh::FaceIterator f;
    std::vector<_MyMesh::FacePointer> vf;
    f =  m.face.begin();
    f += indice;
    for(; f != m.face.end();++f)
    {
        if(!f->IsD())
        {
            f->SetS();
        }
    }

    std::vector<_MyMesh::FacePointer *> FPP;
    std::vector<_MyMesh::FacePointer> added;
    std::vector<_MyMesh::FacePointer>::iterator vfit;
    int i=1;
    printf("\n");

    for(f =  m.face.begin();f!=m.face.end();++f) if(!(*f).IsD())
    {
        if( f->IsS() )
        {
            f->V(0)->IsW();
            f->V(1)->IsW();
            f->V(2)->IsW();
        }
        else
        {
            f->V(0)->ClearW();
            f->V(1)->ClearW();
            f->V(2)->ClearW();
        }
    }
    BaseParameterClass pp;
                vcg::LocalOptimization<_MyMesh> Fs(m,&pp);
                Fs.SetTargetMetric(0.0f);
                Fs.Init<MyDelaunayFlip >();
                Fs.DoOptimization();


    do
    {
        vf.clear();
        f =  m.face.begin();
        f += indice;
        for(; f != m.face.end();++f)
        {
            if(f->IsS())
            {
                bool test= true;
                for(int ind =0;ind<3;++ind)
                    f->V(ind)->InitIMark();
                test = (DoubleArea<_MyMesh::FaceType>(*f)/2) > AVG;
                if(test)
                {
                    vf.push_back(&(*f));
                }
            }
        }

        //info print
    printf("\r Refining [%d] - > %d",i,int(vf.size()));
        i++;

        FPP.clear();
        added.clear();

        for(vfit = vf.begin(); vfit!=vf.end();++vfit)
        {
            FPP.push_back(&(*vfit));
        }
        int toadd= vf.size();
        _MyMesh::FaceIterator f1,f2;
        f2 = tri::Allocator<_MyMesh>::AddFaces(m,(toadd*2),FPP);
        _MyMesh::VertexIterator vertp = tri::Allocator<_MyMesh>::AddVertices(m,toadd);
        std::vector<_MyMesh::FacePointer> added;
        added.reserve(toadd);
        vfit=vf.begin();

        for(int i = 0; i<toadd;++i,f2++,vertp++)
        {
            f1=f2;
            f2++;
            TriSplit<_MyMesh,CenterPointBarycenter<_MyMesh> >::Apply(vf[i],&(*f1),&(*f2),&(*vertp),CenterPointBarycenter<_MyMesh>() );
            f1->SetS();
            f2->SetS();
            for(int itr=0;itr<3;itr++)
            {
                f1->V(itr)->SetW();
                f2->V(itr)->SetW();
            }
            added.push_back( &(*f1) );
            added.push_back( &(*f2) );
        }

        BaseParameterClass pp;
        vcg::LocalOptimization<_MyMesh> FlippingSession(m,&pp);
        FlippingSession.SetTargetMetric(0.0f);
        FlippingSession.Init<MyDelaunayFlip >();
        FlippingSession.DoOptimization();

    }while(!vf.empty());

    vcg::LocalOptimization<_MyMesh> Fiss(m,&pp);
    Fiss.SetTargetMetric(0.0f);
    Fiss.Init<MyDelaunayFlip >();
    Fiss.DoOptimization();

/*end refining */

    tri::io::ExporterSTL<_MyMesh>::Save(m,"PreSmooth.stl",false);

    int UBIT = _MyMesh::VertexType::NewBitFlag();
    f =  m.face.begin();
    f += indice;
    for(; f != m.face.end();++f)
    {
        if(f->IsS())
        {
            for(int ind =0;ind<3;++ind){
                if(NormalTest<_MyMesh>(face::Pos<_MyMesh::FaceType>(&(*f),ind )))
                {
                    f->V(ind)->SetUserBit(UBIT);
                }
            }
            f->ClearS();
        }
    }

    for(vi=m.vert.begin();vi!=m.vert.end();++vi) if(!(*vi).IsD())
    {
        if( vi->IsUserBit(UBIT) )
        {
            (*vi).SetS();
            vi->ClearUserBit(UBIT);
        }
    }

    tri::Smooth<_MyMesh>::VertexCoordLaplacian(m,1,true);

    printf("\nCompleted. Saving....\n");

  tri::io::ExporterSTL<_MyMesh>::Save(m,argv[4],false);
    return 0;
}

