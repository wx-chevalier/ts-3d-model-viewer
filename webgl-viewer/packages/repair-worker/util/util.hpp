#ifndef UTIL_HPP
#define UTIL_HPP

#include <string>
#include <algorithm>
#include <fstream>

namespace util{
    const std::string extension_lower(std::string filepath);
    bool exists(std::string filepath);
}


#endif
