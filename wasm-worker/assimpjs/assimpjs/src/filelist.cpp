#include "filelist.hpp"

static std::string ToLowercase (const std::string& str)
{
	std::string res = str;
	for (char& c : res) {
		c = std::tolower (c);
	}
	return res;
}

File::File () :
	path (),
	content ()
{
}

File::File (const std::string& path, const Buffer& content) :
	path (path),
	content (content)
{
}

const std::string& File::GetPath () const
{
	return path;
}

#ifdef EMSCRIPTEN

emscripten::val File::GetContentEmscripten () const
{
	emscripten::val Uint8Array = emscripten::val::global ("Uint8Array");
	return Uint8Array.new_ (emscripten::typed_memory_view (content.size (), content.data ()));
}

#endif

FileList::FileList () :
	files ()
{
}

void FileList::AddFile (const std::string& path, const Buffer& content)
{
	files.push_back (File (path, content));
}

size_t FileList::FileCount () const
{
	return files.size ();
}

File& FileList::GetFile (size_t index)
{
	return files[index];
}

File* FileList::GetFile (const std::string& path)
{
	std::string fileName = GetFileName (path);
	for (File& file : files) {
		std::string currFileName = GetFileName (file.path);
		if (currFileName == fileName) {
			return &file;
		}
	}
	return nullptr;
}

const File& FileList::GetFile (size_t index) const
{
	return const_cast<FileList*> (this)->GetFile (index);
}

const File* FileList::GetFile (const std::string& path) const
{
	return const_cast<FileList*> (this)->GetFile (path);
}

#ifdef EMSCRIPTEN

void FileList::AddFileEmscripten (const std::string& path, const emscripten::val& content)
{
	Buffer contentArr = emscripten::vecFromJSArray<std::uint8_t> (content);
	AddFile (path, contentArr);
}

#endif

std::string GetFileName (const std::string& path)
{
	size_t lastSeparator = path.find_last_of ('/');
	if (lastSeparator == std::wstring::npos) {
		lastSeparator = path.find_last_of ('\\');
	}
	if (lastSeparator == std::wstring::npos) {
		return ToLowercase (path);
	}
	std::string fileName = path.substr (lastSeparator + 1, path.length () - lastSeparator - 1);
	return ToLowercase (fileName);
}
