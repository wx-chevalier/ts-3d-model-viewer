# BUILD can be debug or release
BUILD := release

cxxflags.release := -O3

CC := g++
OUT_EXE := ./out/filecheck
CXXFLAGS += -std=c++11 -I ./vcglib/ -I ./vcglib/eigenlib/ -I . ${cxxflags.${BUILD}} -I ./util/

EM_OUT_JS := filecheck.js

UNITTEST_OUT_EXE := ./unittest/unittest_out/filecheck
EM_UNITTEST_OUT_HTML := ./unittest/unittest_out/filecheck.html

EM_EXTRA_FLAGS := -s DEMANGLE_SUPPORT=1

EM_CXXFLAGS := -s EXPORTED_FUNCTIONS='["_js_check_repair"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS_createDataFile", "FS_readFile", "FS_unlink"]' -s ALLOW_MEMORY_GROWTH=1

UNITTESTCXXFLAGS := -I ./unittest/catch \
					-D FILECHECK_TEST

EM_UNITTESTCXXFLAGS := -s DEMANGLE_SUPPORT=1 --embed-file ./unittest/meshes/@./unittest/meshes/

FILECHECK_CPP := vcglib/wrap/ply/plylib.cpp util/util.cpp fileCheck.cpp
UNITTEST_CPP := unittest/fileCheckUnittest.cpp

EMCC := em++
WASM := -s WASM=1

build:
	@echo BUILD=${BUILD}
	@echo CXXFLAGS=${CXXFLAGS}

	${CC} ${FILECHECK_CPP} ${CXXFLAGS} -o ${OUT_EXE}
	@echo run it like ${OUT_EXE} path/to/stl

test:
	${CC} ${FILECHECK_CPP} ${UNITTEST_CPP} ${CXXFLAGS} ${UNITTESTCXXFLAGS} -o ${UNITTEST_OUT_EXE}
	@echo test it like ${UNITTEST_OUT_EXE}

wasm:
	${EMCC} ${FILECHECK_CPP} ${CXXFLAGS} ${EM_CXXFLAGS} ${EM_EXTRA_FLAGS} -o ${EM_OUT_JS} ${WASM}

wasm_test:
	${EMCC} ${FILECHECK_CPP} ${UNITTEST_CPP} ${CXXFLAGS} ${UNITTESTCXXFLAGS} ${EM_UNITTESTCXXFLAGS} ${EM_EXTRA_FLAGS} -o ${EM_UNITTEST_OUT_HTML} ${WASM}

