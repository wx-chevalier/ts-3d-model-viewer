var fs = require("fs"),             // load STLs from filesystem
    request = require("request"),   // load STLs from urls
    THREE = require("three"),     
    Canvas = require("canvas"),
    _ = require("lodash");

// Assign this to global so that the subsequent modules can extend it:
global.THREE = THREE;
require("./threejs-extras/Projector.js");
require("./threejs-extras/CanvasRenderer.js");
require("./threejs-extras/STLLoader.js");

function StlThumbnailer(options){
    // we need a url or a filePath to get started
    var url = options.url, 
        filePath = options.filePath,
        that=this,
        jobs;
    if (    (typeof url !== "string" && typeof filePath !== "string") || 
            (typeof url === "string" && typeof filePath === "string") 
        ) {
            throw new Error("StlThumbnailer must be initialized with either a url or filePath, but not both.");
        }

    this._stlData = null;

    // Thumbnail jobs were requested at init time. Validate, then hang on until the STL is loaded.
    if (_.isArray(options.requestThumbnails)) {
        jobs = _.map(options.requestThumbnails,function(thumb){
            return that.validateThumbnailRequest(thumb); 
        })
    }

    function process(stlData){
        that._stlData = stlData;
        return that.processJobs(jobs);
    }

    if (url) {
        return this.loadFromUrl(url)
            .then(process);
    } else {
        return this.loadFromFile(filePath)
            .then(process);
    }
}

StlThumbnailer.prototype.processJobs = function(jobs){
    // Return a promise of all the thumbnails
    var that = this,
        thumbnails = _.map(jobs,function(job){
            return that.processThumbnail(job);
        });
        
    return Promise.all(thumbnails);
}

StlThumbnailer.prototype.loadFromUrl = function(url){
    var requestSettings = {
            url: url,
            encoding: null, // Required for binary STLs
            method: "GET"
        };
    
    return new Promise(function(resolve,reject){
        request(requestSettings, function (error, response, stlData) {
            if (!error && response.statusCode == 200) {
                // STL Data is available!
                resolve(stlData);
            } else {
                if (error) reject(error);
                else reject("Unable to retrieve " + url);
            }
        })
    });
}

StlThumbnailer.prototype.loadFromFile = function(path){
    return new Promise(function(resolve,reject){
        fs.readFile(path, function (error, stlData) {
            if (!error && stlData) {
                resolve(stlData);
            } else {
                if (error) reject(error);
                else reject("Unable to load "+path);
            }
        });
    });
}

StlThumbnailer.prototype.validateThumbnailRequest = function(thumbnail){
    if (typeof thumbnail.width !== "number") throw new Error("Please specify a thumbnail width");
    if (typeof thumbnail.height !== "number") throw new Error("Please specify a thumbnail width");

    var defaults = this.getDefaults();

    return _.extend(_.clone(defaults),thumbnail);
}

StlThumbnailer.prototype.getDefaults = function(){
    return {
        cameraAngle: [10,50,100],         // optional: specify the angle of the view for thumbnailing. This is the camera's position vector, the opposite of the direction the camera is looking.
        showMinorEdges: true,             // optional: show all edges lightly, even ones on ~flat faces
        metallicOpacity: 0,               // optional: some models, particularly those with non-flat surfaces or very high-poly models will look good with this environment map
        enhanceMajorEdges: true,          // optional: major edges will appear more boldly than minor edges
        shadeNormalsOpacity: 0.4,         // optional: faces will be shaded lightly by their normal direction
        backgroundColor: 0xffffff,        // optional: background color (RGB) for the rendered image
        baseOpacity: 0.7,                 // optional: translucency of the base material that lets you see through it
        baseColor: 0xffffff,              // optional: base color
        baseLineweight: 0.7,              // optional: lineweights will scale to image size, but this serves as a base for that scaling. Larger numbers = heavier lineweights
        lineColor: 0x000000               // optional: color of the linework
    };
}

StlThumbnailer.prototype.processThumbnail = function(thumbnailSpec){
    // Return a promise of a canvas with the thumbnail
    var that = this;

    return new Promise(function(resolve,reject){
        try {
            // Very hacky to use the global here, but I need a few methods that aren't there yet and they include the width and height of the canvas
            global.document = {
                createElement: function (tag) {
                    if (tag === "img") {
                        return new Canvas.Image();
                    } else if (tag === "canvas") {
                        return new Canvas.createCanvas(width, height);
                    }
                },
                createElementNS: function(namespace,tag){
                    return this.createElement(tag);
                }
            };

            // Prepare the scene, renderer, and camera
            var width = thumbnailSpec.width,
                height = thumbnailSpec.height,
                camera = new THREE.PerspectiveCamera(30, width / height, 1, 1000),
                scene = new THREE.Scene(),
                renderer = new THREE.CanvasRenderer(),
                geometry = that.getGeometry();

            // Configure renderer
            renderer.setSize(width, height, false)
            renderer.setClearColor( 0xffffff, 1 );

            // Configure camera with user-set position, then move it in-or-out depending on
            // the size of the model that needs to display
            camera.position.x = thumbnailSpec.cameraAngle[0];
            camera.position.y = thumbnailSpec.cameraAngle[1];
            camera.position.z = thumbnailSpec.cameraAngle[2];
            camera.lookAt(new THREE.Vector3(0,0,0));

            // (re)Position the camera
            // See http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
            var fov = camera.fov * ( Math.PI / 180 ); 
            var distance = Math.abs( geometry.boundingSphere.radius / Math.sin( fov / 2 ) );
            var newPosition = camera.position.clone().normalize().multiplyScalar(distance);
            camera.position.set(newPosition.x,newPosition.y,newPosition.z);
            camera.needsUpdate = true;
            camera.updateProjectionMatrix();

            // Get materials according to requested characteristics of the output render
            // TODO: Blending Modes?
            if (thumbnailSpec.metallicOpacity > 0) scene.add( that.getMetallicMesh(geometry, thumbnailSpec.metallicOpacity) );
            if (thumbnailSpec.baseOpacity > 0)scene.add( that.getBasicMesh(geometry, thumbnailSpec.baseOpacity, thumbnailSpec.baseColor ) );
            if (thumbnailSpec.shadeNormalsOpacity > 0)scene.add( that.getNormalMesh(geometry, thumbnailSpec.shadeNormalsOpacity) );        
            if (thumbnailSpec.enhanceMajorEdges > 0)scene.add( that.getEdgeLine(geometry, thumbnailSpec.baseLineweight, thumbnailSpec.lineColor) );

            renderer.render(scene, camera);
            resolve(renderer.domElement);
        } catch (e) {
            reject(e);
        }
    });
}

StlThumbnailer.prototype.getMetallicMesh = function(geometry,opacity){
    var envMap = this.loadTexture("/textures/metal.jpg");
        envMap.mapping = THREE.SphericalReflectionMapping;
    var mat = new THREE.MeshLambertMaterial( { 
            envMap: envMap, 
            overdraw: 0.5,
            transparent: true,
            side: THREE.DoubleSide,
            opacity:opacity
        } );
    return new THREE.Mesh( geometry, mat );
}

StlThumbnailer.prototype.getBasicMesh = function(geometry,opacity,color){
    var material = new THREE.MeshBasicMaterial( {  
            overdraw: 0.1,
            side: THREE.DoubleSide,
            transparent:true,
            opacity:opacity,
            color:color 
        } );
    return new THREE.Mesh(geometry,material);
}

StlThumbnailer.prototype.getNormalMesh = function(geometry,opacity){
    var material = new THREE.MeshNormalMaterial( {
            overdraw: 0.2,
            side: THREE.DoubleSide,
            transparent:true,
            opacity:opacity 
        });
    return new THREE.Mesh(geometry,material);
}

StlThumbnailer.prototype.getEdgeLine = function(geometry,weight,color){
    var edges = new THREE.EdgesGeometry( geometry );
    return new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { 
                color: color,
                linewidth: weight,
                linecap: 'round',
                linejoin:  'round'
            })
    );
}

StlThumbnailer.prototype.loadTexture = function(path){
    // work-around for not being able to use new THREE.TextureLoader().load( 'textures/metal.jpg' ), which depends on XHR
    var texture = new THREE.Texture();
    var jpegPath = __dirname + path;
    var isJPEG = jpegPath.search( /\.(jpg|jpeg)$/ ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

    var textureImage = fs.readFileSync(jpegPath);
    var img = new Canvas.Image;
    img.src = textureImage;

    texture.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
    texture.image = img;
    texture.needsUpdate = true;

    return texture;
}

StlThumbnailer.prototype.getGeometry = function(){
    var loader = new THREE.STLLoader(),
        geometry = loader.parse(this._stlData);

    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    geometry.center();
    return geometry;
}

module.exports = StlThumbnailer;
