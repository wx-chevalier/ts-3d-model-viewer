# 3D file viewer made for the web

This 3D viewer is purely made of javascript that runs locally on your browser. It allows you to load 45+ 3D model formats.

Demo : https://rufus31415.github.io/sandbox/3d-viewer

It is based on WebGL and WebAssembly technologies as well as the Unity 3D rendering engine and the Assimp library. It also relies on a lot of code I wrote myself.

This demo is entirely developed in React and bootstrapped with "Create React App". It allows you to load your own models as well as my demo models.

It has been tested with :
- Firefox on Windows
- Chrome on Windows
- Edge on Windows
- Safari on iOS (you should disable WebGL2.0 in experimental features)

If WebGL2.0 is not supported by your browser, the rendering is switched to WebGL1.0.

Unfortunately, I can't publish the code that decodes 3D formats because I had to buy several proprietary libraries I and can only distribute compiled binaries.

You can browse the list of supported formats on the right. The long text is often taken from Wikipedia. The 3D models come from the free models of Assimp or from models made by myself.

You can also load your own 3D models by browsing your disk or by pointing to a url. If one of your models doesn't load, could you email it to me at [rufus31415@gmail.com](mailto:rufus31415@gmail.com) for debug purposes ?

# Supported formats
Here are the supported formats :
- OnShape
- 3DS
- 3MF
- AC
- AMF
- ASE
- B3D
- BLENDER
- BVH
- C4D
- COB
- Collada
- CSM
- DXF
- FBX
- glb
- glTF
- HMP
- IFC
- IRR
- JT
- LWO
- LWS
- LXO
- M3D
- MD2
- MD3
- MD4
- MD5
- MDL
- MS3D
- NFF
- OBJ
- OFF
- OpenGEX
- PLY
- Q3D
- RAW
- SIB
- SMD
- STEP
- STL
- TER
- X
- X3D
- XGL

# What's next ?

Here are the features I would like to add:
- Animation support
- Extending the support of the STEP format
- Add format detection if no extension is specified
- Add export to certain formats to use it as a conversion tool
- Add the possibility to view the model in augmented reality on compatible platforms
- Make it possible to manipulate the camera and add several models, via javascript
- Obtain via javascript the tree structure of the model
- Improve the handling of external resources (texture files, image...)
- Add other formats (like Solidworks, Creo, Catia, ...)

I don't know yet if I will continue to develop this viewer to make it a separate product. It will depend on the craze around.

If that's the case, I could make it a separate React component that could be installed via NPM.

``` shell
npm install my-super-3d-viewer-react 
```

And the javascript code would looks like :

``` js
import Viewer from 'my-super-3d-viewer-react'

export default function App() {

    // path to my 3D file or binaries of my file
    const file = "https://ballcuber.github.io/assets/models/ballcuber.glb"

    const onViewerReady = () => {
        // Viewer is ready to use
    }

    const onViewerLoaded = () => {
        // The file has loaded successfully
    }

    const onViewerError = () => {
        // An error has occurred
    }

    return (
          <Viewer
            file={file}
            onReady = {onViewerReady}
            onLoaded = {onViewerLoaded}
            onError = {onViewerError}
          />
    );
}
```

Why not also isolate the loader to make it an extension to other 3D engines like Three.js.

Why not buy a Unity pro account to remove the watermak when loading.

I would also like to reduce the size of the build, it is currently ~8Mb.

I hope you'll like it, don't hesitate to ask me for improvements or ideas!