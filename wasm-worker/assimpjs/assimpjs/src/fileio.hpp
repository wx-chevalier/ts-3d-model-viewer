#ifndef FILEIO_HPP
#define FILEIO_HPP

#include <assimp/IOStream.hpp>
#include <assimp/IOSystem.hpp>

#include "filelist.hpp"

class FileLoader
{
public:
	FileLoader ();
	virtual ~FileLoader ();

	virtual bool	Exists (const char* pFile) const = 0;
	virtual Buffer	Load (const char* pFile) const = 0;
};

class BufferIOStreamReadAdapter : public Assimp::IOStream
{
public:
	BufferIOStreamReadAdapter (const Buffer* buffer);
	virtual ~BufferIOStreamReadAdapter ();

	virtual size_t		Read (void* pvBuffer, size_t pSize, size_t pCount) override;
	virtual size_t		Write (const void* pvBuffer, size_t pSize, size_t pCount) override;

	virtual aiReturn	Seek (size_t pOffset, aiOrigin pOrigin) override;
	virtual size_t		Tell () const override;

	virtual size_t		FileSize () const override;
	virtual void		Flush () override;

protected:
	const Buffer*		buffer;
	size_t				position;
};

class BufferIOStreamWriteAdapter : public Assimp::IOStream
{
public:
	BufferIOStreamWriteAdapter (Buffer* buffer);
	virtual ~BufferIOStreamWriteAdapter ();

	virtual size_t		Read (void* pvBuffer, size_t pSize, size_t pCount) override;
	virtual size_t		Write (const void* pvBuffer, size_t pSize, size_t pCount) override;

	virtual aiReturn	Seek (size_t pOffset, aiOrigin pOrigin) override;
	virtual size_t		Tell () const override;

	virtual size_t		FileSize () const override;
	virtual void		Flush () override;

protected:
	Buffer*				buffer;
	size_t				position;
};

class OwnerBufferIOStreamReadAdapter : public BufferIOStreamReadAdapter
{
public:
	OwnerBufferIOStreamReadAdapter (const Buffer* buffer);
	virtual ~OwnerBufferIOStreamReadAdapter ();
};

class DelayLoadedIOSystemReadAdapter : public Assimp::IOSystem
{
public:
	DelayLoadedIOSystemReadAdapter (const File& file, const FileLoader& loader);
	virtual ~DelayLoadedIOSystemReadAdapter ();

	virtual bool				Exists (const char* pFile) const override;
	virtual Assimp::IOStream*	Open (const char* pFile, const char* pMode) override;
	virtual void				Close (Assimp::IOStream* pFile) override;

	virtual char				getOsSeparator () const override;

private:
	const File&					file;
	const FileLoader&			loader;
};

class FileListIOSystemReadAdapter : public Assimp::IOSystem
{
public:
	FileListIOSystemReadAdapter (const FileList& fileList);
	virtual ~FileListIOSystemReadAdapter ();

	virtual bool				Exists (const char* pFile) const override;
	virtual Assimp::IOStream*	Open (const char* pFile, const char* pMode) override;
	virtual void				Close (Assimp::IOStream* pFile) override;

	virtual char				getOsSeparator () const override;

private:
	const FileList&				fileList;
};

class FileListIOSystemWriteAdapter : public Assimp::IOSystem
{
public:
	FileListIOSystemWriteAdapter (FileList& fileList);
	virtual ~FileListIOSystemWriteAdapter ();

	virtual bool				Exists (const char* pFile) const override;
	virtual Assimp::IOStream*	Open (const char* pFile, const char* pMode) override;
	virtual void				Close (Assimp::IOStream* pFile) override;

	virtual char				getOsSeparator () const override;

private:
	FileList&					fileList;
};

#endif
