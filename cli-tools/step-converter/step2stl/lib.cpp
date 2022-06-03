// STEP Read Methods
#include <STEPControl_Reader.hxx>
#include <TopoDS_Shape.hxx>
// STL Read & Write Methods
#include <StlAPI_Writer.hxx>

extern "C" int step2stl(char *in, char *out) {

  // Read from STEP
  STEPControl_Reader reader;
  IFSelect_ReturnStatus stat = reader.ReadFile(in);

  Standard_Integer NbRoots = reader.NbRootsForTransfer();
  Standard_Integer NbTrans = reader.TransferRoots();
  TopoDS_Shape Original_Solid = reader.OneShape();

  // Write to STL
  StlAPI_Writer stlWriter = StlAPI_Writer();
  // stlWriter.SetCoefficient(0.0001);
  stlWriter.ASCIIMode() = Standard_False;
  stlWriter.Write( Original_Solid, out);

  return 1;
}
