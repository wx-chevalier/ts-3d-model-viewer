#include "result.hpp"

Result::Result () :
	Result (ErrorCode::UnknownError)
{
}

Result::Result (ErrorCode error) :
	errorCode (error),
	fileList ()
{
}

bool Result::IsSuccess () const
{
	return errorCode == ErrorCode::NoError;
}

std::string Result::GetErrorCode () const
{
	switch (errorCode) {
		case ErrorCode::NoError:
			return "no_error";
		case ErrorCode::NoFilesFound:
			return "no_files_found";
		case ErrorCode::ImportError:
			return "import_error";
		case ErrorCode::ExportError:
			return "export_error";
		case ErrorCode::UnknownError:
			return "unknown_error";
	}

	return "unknown_error";
}

size_t Result::FileCount () const
{
	return fileList.FileCount ();
}

const File& Result::GetFile (size_t index) const
{
	return fileList.GetFile (index);
}
