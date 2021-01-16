# step2stl

Example program of how to convert ISO 10303 STEP files (AP203 and AP 214) to STL using OpenCascade

## Dependencies

You need OpenCascade.

### Ubuntu

On Ubuntu you can try to install opencascade from apt-get. This might
work:

```sh
$ sudo apt-get install libopencascade-foundation-6.5.0 \
libopencascade-modeling-6.5.0 libopencascade-ocaf-6.5.0 \
libopencascade-ocaf-lite-6.5.0 libopencascade-visualization-6.5.0 \
opencascade-draw
```

我们也可以使用 Docker 镜像：

```
$ docker pull cadquery/oce
```

### Compiling OpenCascade from source:

To compile from source (on OSX make sure to use gcc, not clang):

```
git clone https://github.com/tpaviot/oce.git
git checkout 13965711913c4590549de562e55c922fb0889d24
cd ..
cd oce
mkdir build
cd build
cmake ..
sudo make install
```

## Compiling

You should be able to compile it on ubuntu or osx if you have
OpenCascade installed (Makefile included). The included Makefile
assumes the library paths as used by the source installation route. If
you install from apt, then you may need to remove `local/` from some
of the paths.

## Running

Once you have compiled it,
just use it as:

```
./step2stl STEPFILENAME STLFILENAME
```

## Using in node.js

Run `make lib` to create the dynamic library and ffi file for use in node.js.
