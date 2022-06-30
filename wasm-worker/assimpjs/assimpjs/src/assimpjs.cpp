#include "assimpjs.hpp"

#include <assimp/Importer.hpp>
#include <assimp/Exporter.hpp>
#include <assimp/scene.h>
#include <assimp/postprocess.h>

#include <stdio.h>
#include <iostream>

static const aiScene* ImportFileListByMainFile (Assimp::Importer& importer, const File& file)
{
	try {
		const aiScene* scene = importer.ReadFile (file.path,
			aiProcess_Triangulate |
			aiProcess_GenUVCoords |
			aiProcess_JoinIdenticalVertices |
			aiProcess_SortByPType);
		return scene;
	} catch (...) {
		return nullptr;
	}
	return nullptr;
}

static std::string GetFileNameFromFormat (const std::string& format)
{
	std::string fileName = "result";
	if (format == "assjson") {
		fileName += ".json";
	} else if (format == "gltf" || format == "gltf2") {
		fileName += ".gltf";
	} else if (format == "glb" || format == "glb2") {
		fileName += ".glb";
	}
	return fileName;
}

static bool ExportScene (const aiScene* scene, const std::string& format, Result& result)
{
	if (scene == nullptr) {
		result.errorCode = ErrorCode::ImportError;
		return false;
	}

	Assimp::Exporter exporter;
	FileListIOSystemWriteAdapter* exportIOSystem = new FileListIOSystemWriteAdapter (result.fileList);
	exporter.SetIOHandler (exportIOSystem);

	Assimp::ExportProperties exportProperties;
	exportProperties.SetPropertyBool ("JSON_SKIP_WHITESPACES", true);
	std::string fileName = GetFileNameFromFormat (format);
	aiReturn exportResult = exporter.Export (scene, format.c_str (), fileName.c_str (), 0u, &exportProperties);
	if (exportResult != aiReturn_SUCCESS) {
		result.errorCode = ErrorCode::ExportError;
		return false;
	}

	result.errorCode = ErrorCode::NoError;
	return true;
}

Result ConvertFile (const File& file, const std::string& format, const FileLoader& loader)
{
	Assimp::Importer importer;
	importer.SetIOHandler (new DelayLoadedIOSystemReadAdapter (file, loader));
	const aiScene* scene = ImportFileListByMainFile (importer, file);

	Result result;
	ExportScene (scene, format, result);
	return result;
}

Result ConvertFileList (const FileList& fileList, const std::string& format)
{
	if (fileList.FileCount () == 0) {
		return Result (ErrorCode::NoFilesFound);
	}

	Assimp::Importer importer;
	importer.SetIOHandler (new FileListIOSystemReadAdapter (fileList));

	const aiScene* scene = nullptr;
	for (size_t fileIndex = 0; fileIndex < fileList.FileCount (); fileIndex++) {
		const File& file = fileList.GetFile (fileIndex);
		scene = ImportFileListByMainFile (importer, file);
		if (scene != nullptr) {
			break;
		}
	}

	Result result;
	ExportScene (scene, format, result);
	return result;
}

#ifdef EMSCRIPTEN

Result ConvertFileEmscripten (
	const std::string& name,
	const std::string& format,
	const emscripten::val& content,
	const emscripten::val& existsFunc,
	const emscripten::val& loadFunc)
{
	class FileLoaderEmscripten : public FileLoader
	{
	public:
		FileLoaderEmscripten (const emscripten::val& existsFunc, const emscripten::val& loadFunc) :
			existsFunc (existsFunc),
			loadFunc (loadFunc)
		{
		}

		virtual bool Exists (const char* pFile) const override
		{
			if (existsFunc.isUndefined () || existsFunc.isNull ()) {
				return false;
			}
			std::string fileName = GetFileName (pFile);
			emscripten::val exists = existsFunc (fileName);
			return exists.as<bool> ();
		}

		virtual Buffer Load (const char* pFile) const override
		{
			if (loadFunc.isUndefined () || loadFunc.isNull ()) {
				return {};
			}
			std::string fileName = GetFileName (pFile);
			emscripten::val fileBuffer = loadFunc (fileName);
			return emscripten::vecFromJSArray<std::uint8_t> (fileBuffer);
		}

	private:
		const emscripten::val& existsFunc;
		const emscripten::val& loadFunc;
	};

	Buffer buffer = emscripten::vecFromJSArray<std::uint8_t> (content);
	File file (name, buffer);
	FileLoaderEmscripten loader (existsFunc, loadFunc);
	return ConvertFile (file, format, loader);
}

EMSCRIPTEN_BINDINGS (assimpjs)
{
	emscripten::class_<File> ("File")
		.constructor<> ()
		.function ("GetPath", &File::GetPath)
		.function ("GetContent", &File::GetContentEmscripten)
	;

	emscripten::class_<FileList> ("FileList")
		.constructor<> ()
		.function ("AddFile", &FileList::AddFileEmscripten)
	;

	emscripten::class_<Result> ("Result")
		.constructor<> ()
		.function ("IsSuccess", &Result::IsSuccess)
		.function ("GetErrorCode", &Result::GetErrorCode)
		.function ("FileCount", &Result::FileCount)
		.function ("GetFile", &Result::GetFile)
	;

	emscripten::function<Result, const std::string&, const std::string&, const emscripten::val&, const emscripten::val&, const emscripten::val&> ("ConvertFile", &ConvertFileEmscripten);
	emscripten::function<Result, const FileList&, const std::string&> ("ConvertFileList", &ConvertFileList);
}

#endif
