#ifndef RESULT_HPP
#define RESULT_HPP

#include "filelist.hpp"

enum class ErrorCode : int
{
	NoError = 0,
	NoFilesFound = 1,
	ImportError = 2,
	ExportError = 3,
	UnknownError = 4
};

class Result
{
public:
	Result ();
	Result (ErrorCode error);

	bool				IsSuccess () const;
	std::string			GetErrorCode () const;

	size_t				FileCount () const;
	const File&			GetFile (size_t index) const;

	ErrorCode			errorCode;
	FileList			fileList;
};

#endif
