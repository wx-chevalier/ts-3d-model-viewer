// STEP Read Methods
#include <STEPControl_Reader.hxx>
#include <TopoDS_Shape.hxx>
// STL Read & Write Methods
#include <StlAPI_Writer.hxx>
#include <BRepMesh_IncrementalMesh.hxx>

#include <iostream>

int step2stl(char *in, char *out) {

  // Read from STEP
  STEPControl_Reader reader;
  IFSelect_ReturnStatus stat = reader.ReadFile(in);

  Standard_Integer NbRoots = reader.NbRootsForTransfer();
  Standard_Integer NbTrans = reader.TransferRoots();
  TopoDS_Shape Original_Solid = reader.OneShape();

  // Write to STL
  StlAPI_Writer stlWriter = StlAPI_Writer();
  //stlWriter.SetCoefficient(0.0001);
  stlWriter.ASCIIMode() = Standard_False;

  BRepMesh_IncrementalMesh Mesh( Original_Solid, 0.01 );

  Mesh.Perform();

  stlWriter.Write( Original_Solid, out);

  return 0;
}


Standard_Integer main (int argc, char *argv[]) {
  if (argc != 3) {
      std::cerr << "Usage: " << argv[0] << " file.step file.stl" << std::endl;
      return 1;
  }

  return step2stl(argv[1], argv[2]);
}
