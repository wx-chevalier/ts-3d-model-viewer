#ifndef FILELIST_HPP
#define FILELIST_HPP

#ifdef EMSCRIPTEN
#include <emscripten/bind.h>
#endif

#include <vector>
#include <string>

using Buffer = std::vector<std::uint8_t>;

class File
{
public:
	File ();
	File (const std::string& path, const Buffer& content);

	const std::string&	GetPath () const;

#ifdef EMSCRIPTEN
	emscripten::val		GetContentEmscripten () const;
#endif

	std::string			path;
	Buffer				content;
};

class FileList
{
public:
	FileList ();

	void			AddFile (const std::string& path, const Buffer& content);
	
	size_t			FileCount () const;
	File&			GetFile (size_t index);
	File*			GetFile (const std::string& path);
	const File&		GetFile (size_t index) const;
	const File*		GetFile (const std::string& path) const;

#ifdef EMSCRIPTEN
	void			AddFileEmscripten (const std::string& path, const emscripten::val& content);
#endif

private:
	std::vector<File>	files;
};

std::string GetFileName (const std::string& path);

#endif
