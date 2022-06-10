#include "util.hpp"

#ifdef FILECHECK_TEST
#include "catch.hpp"
#endif

namespace util{

const std::string extension_lower(std::string filepath) {
    std::string extension(filepath.substr(filepath.find_last_of('.') + 1));
    std::transform(extension.begin(), extension.end(), extension.begin(), ::tolower);
    return extension;
}

bool exists(std::string filepath) {
    std::ifstream f(filepath.c_str());
    return f.good();
}

#ifdef FILECHECK_TEST
TEST_CASE( "test extension lower", "[util]" ) {
    REQUIRE( extension_lower("./test/test.stl") == "stl" );
    REQUIRE( extension_lower("./test/test.STL") == "stl" );
    REQUIRE( extension_lower("def.OBJ") == "obj" );
    REQUIRE( extension_lower("def..obj") == "obj" );
}
#endif

}
