#include <assimp/DefaultIOSystem.h>
#include <assimp/IOStream.hpp>

#include "assimpjs.hpp"

static File GetFile (const std::string& filePath)
{
	Assimp::DefaultIOSystem system;
	Assimp::IOStream* stream = system.Open (filePath.c_str (), "rb");
	if (stream == nullptr) {
		return File ();
	}
	size_t fileSize = stream->FileSize ();
	Buffer content (fileSize);
	stream->Read (&content[0], 1, fileSize);
	return File (filePath, content);
}

int main (int argc, const char* argv[])
{
	std::string folderPath = argv[0];
	size_t lastSeparator = folderPath.find_last_of ('\\');
	if (lastSeparator != std::string::npos) {
		folderPath = folderPath.substr (0, lastSeparator);
	}

	if (argc < 2) {
		return 1;
	}

	FileList fileList;
	for (size_t i = 1; i < argc; i++) {
		File file = GetFile (argv[i]);
		fileList.AddFile (file.path, file.content);
	}

	ConvertFileList (fileList, "gltf2");
	return 0;
}
