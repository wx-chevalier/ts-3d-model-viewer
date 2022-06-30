#include "fileio.hpp"

#include <stdexcept>

static char GetOsSeparator ()
{
#ifndef _WIN32
	return '/';
#else
	return '\\';
#endif
}

static size_t ReadFromBuffer (const Buffer* buffer, size_t& position, void* pvBuffer, size_t pSize, size_t pCount)
{
	size_t remainingElemCount = (size_t) (std::floor ((buffer->size () - position) / pSize));
	size_t readableElemCount = std::min (remainingElemCount, pCount);
	if (readableElemCount == 0) {
		return 0;
	}
	memcpy (pvBuffer, buffer->data () + position, readableElemCount * pSize);
	position += readableElemCount * pSize;
	return readableElemCount;
}

static size_t WriteToBuffer (Buffer* buffer, size_t& position, const void* pvBuffer, size_t pSize, size_t pCount)
{
	size_t memSize = pSize * pCount;
	size_t newBufferSize = std::max (buffer->size (), position + memSize);
	if (newBufferSize > buffer->size ()) {
		buffer->resize (newBufferSize);
	}
	memcpy (buffer->data () + position, pvBuffer, memSize);
	position += memSize;
	return pCount;
}

static aiReturn SeekInBuffer (const Buffer* buffer, size_t& position, size_t pOffset, aiOrigin pOrigin)
{
	switch (pOrigin) {
		case aiOrigin_SET:
			position = pOffset;
			break;
		case aiOrigin_CUR:
			position += pOffset;
			break;
		case aiOrigin_END:
			position = buffer->size () - pOffset;
			break;
		default:
			break;
	}
	return aiReturn::aiReturn_SUCCESS;
}

FileLoader::FileLoader ()
{

}

FileLoader::~FileLoader ()
{

}

BufferIOStreamReadAdapter::BufferIOStreamReadAdapter (const Buffer* buffer) :
	buffer (buffer),
	position (0)
{
}

BufferIOStreamReadAdapter::~BufferIOStreamReadAdapter ()
{

}

size_t BufferIOStreamReadAdapter::Read (void* pvBuffer, size_t pSize, size_t pCount)
{
	return ReadFromBuffer (buffer, position, pvBuffer, pSize, pCount);
}

size_t BufferIOStreamReadAdapter::Write (const void* pvBuffer, size_t pSize, size_t pCount)
{
	throw std::logic_error ("not implemented");
}

aiReturn BufferIOStreamReadAdapter::Seek (size_t pOffset, aiOrigin pOrigin)
{
	return SeekInBuffer (buffer, position, pOffset, pOrigin);
}

size_t BufferIOStreamReadAdapter::Tell () const
{
	return position;
}

size_t BufferIOStreamReadAdapter::FileSize () const
{
	return buffer->size ();
}

void BufferIOStreamReadAdapter::Flush ()
{

}

BufferIOStreamWriteAdapter::BufferIOStreamWriteAdapter (Buffer* buffer) :
	buffer (buffer),
	position (0)
{
}

BufferIOStreamWriteAdapter::~BufferIOStreamWriteAdapter ()
{

}

size_t BufferIOStreamWriteAdapter::Read (void* pvBuffer, size_t pSize, size_t pCount)
{
	return ReadFromBuffer (buffer, position, pvBuffer, pSize, pCount);
}

size_t BufferIOStreamWriteAdapter::Write (const void* pvBuffer, size_t pSize, size_t pCount)
{
	return WriteToBuffer (buffer, position, pvBuffer, pSize, pCount);
}

aiReturn BufferIOStreamWriteAdapter::Seek (size_t pOffset, aiOrigin pOrigin)
{
	return SeekInBuffer (buffer, position, pOffset, pOrigin);
}

size_t BufferIOStreamWriteAdapter::Tell () const
{
	return position;
}

size_t BufferIOStreamWriteAdapter::FileSize () const
{
	return buffer->size ();
}

void BufferIOStreamWriteAdapter::Flush ()
{

}

OwnerBufferIOStreamReadAdapter::OwnerBufferIOStreamReadAdapter (const Buffer* buffer) :
	BufferIOStreamReadAdapter (buffer)
{
}

OwnerBufferIOStreamReadAdapter::~OwnerBufferIOStreamReadAdapter ()
{
	delete buffer;
}

DelayLoadedIOSystemReadAdapter::DelayLoadedIOSystemReadAdapter (const File& file, const FileLoader& loader) :
	file (file),
	loader (loader)
{
}

DelayLoadedIOSystemReadAdapter::~DelayLoadedIOSystemReadAdapter ()
{

}

bool DelayLoadedIOSystemReadAdapter::Exists (const char* pFile) const
{
	if (GetFileName (file.path) == GetFileName (pFile)) {
		return true;
	}
	return loader.Exists (pFile);
}

Assimp::IOStream* DelayLoadedIOSystemReadAdapter::Open (const char* pFile, const char* pMode)
{
	if (GetFileName (file.path) == GetFileName (pFile)) {
		return new BufferIOStreamReadAdapter (&file.content);
	}
	if (!loader.Exists (pFile)) {
		return nullptr;
	}
	Buffer buffer = loader.Load (pFile);
	Buffer* bufferPtr = new Buffer (buffer);
	return new OwnerBufferIOStreamReadAdapter (bufferPtr);
}

void DelayLoadedIOSystemReadAdapter::Close (Assimp::IOStream* pFile)
{
	delete pFile;
}

char DelayLoadedIOSystemReadAdapter::getOsSeparator () const
{
	return GetOsSeparator ();
}

FileListIOSystemReadAdapter::FileListIOSystemReadAdapter (const FileList& fileList) :
	fileList (fileList)
{
}

FileListIOSystemReadAdapter::~FileListIOSystemReadAdapter ()
{

}

bool FileListIOSystemReadAdapter::Exists (const char* pFile) const
{
	return fileList.GetFile (pFile) != nullptr;
}

Assimp::IOStream* FileListIOSystemReadAdapter::Open (const char* pFile, const char* pMode)
{
	const File* foundFile = fileList.GetFile (pFile);
	if (foundFile == nullptr) {
		return nullptr;
	}
	return new BufferIOStreamReadAdapter (&foundFile->content);
}

void FileListIOSystemReadAdapter::Close (Assimp::IOStream* pFile)
{
	delete pFile;
}

char FileListIOSystemReadAdapter::getOsSeparator () const
{
	return GetOsSeparator ();
}

FileListIOSystemWriteAdapter::FileListIOSystemWriteAdapter (FileList& fileList) :
	fileList (fileList)
{
}

FileListIOSystemWriteAdapter::~FileListIOSystemWriteAdapter ()
{

}

bool FileListIOSystemWriteAdapter::Exists (const char* pFile) const
{
	return fileList.GetFile (pFile) != nullptr;
}

Assimp::IOStream* FileListIOSystemWriteAdapter::Open (const char* pFile, const char* pMode)
{
	File* foundFile = fileList.GetFile (pFile);
	if (foundFile != nullptr) {
		return new BufferIOStreamWriteAdapter (&foundFile->content);
	}

	fileList.AddFile (pFile, {});
	File* newFile = fileList.GetFile (pFile);
	if (newFile != nullptr) {
		return new BufferIOStreamWriteAdapter (&newFile->content);
	}

	return nullptr;
}

void FileListIOSystemWriteAdapter::Close (Assimp::IOStream* pFile)
{
	delete pFile;
}

char FileListIOSystemWriteAdapter::getOsSeparator () const
{
	return GetOsSeparator ();
}
