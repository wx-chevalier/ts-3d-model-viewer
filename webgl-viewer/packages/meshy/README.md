# `meshy`

`meshy` is my browser-based tool for performing measurements, transformations, visualizations, repair, and slicing on polygonal meshes, intended to make life easier for 3D printing folks. This post presents a comprehensive guide to all current features of the tool.

> Everything is under development, including: slicer improvements and additional features (better G-code exporter, more infill types), a better repair algorithm, UI improvements, more import formats.

# Requirements

A computer with a GPU and a browser capable of running WebGL, with Javascript enabled. Tested and works in the latest releases of Chrome and Firefox on Ubuntu and Windows. Appears to work in Opera, though it's wise to turn off mouse gestures if panning with RMB.

# General use

The user can upload a mesh. At any given time, the tool can contain one mesh (the mesh can be comprised of multiple islands, but the geometry must all come from one file). The user can perform standard transformations (translations, rotations, scaling, floor, center, mirror), use any of `meshy`'s calculation, measurement, and repair tools, slice the mesh, export the mesh, and change some viewport settings. The user can delete the mesh and then upload another.

# Interface and controls

The main viewport uses mouse and keyboard controls:

* LMB to rotate the camera
* scroll wheel to zoom
* MMB/RMB to pan
* `ctrl+i` to import a mesh
* `f` to center the camera on the mesh
* `g` toggles the gizmo
* `c` toggles the center-of-mass indicator
* `w` toggles wireframe
* `b` toggles build volume visibility
* `ctrl+z` to undo
* `ctrl+y` or `ctrl+shift+z` to redo
* `esc` to turn off the cursor (used for measurements and setting the mesh base)

The information box on the top left indicates computed quantities.

The dat.GUI box on the top right contains the user-interactive components.

The axis widget indicates the camera orientation. The outward-facing vector from a face of the cube points along the axis shown on the face.

The printout area next to the axis widget indicates status changes, events, and warnings.

# Gizmo

![gizmo](/img/screenshots/gizmo.png)

The gizmo is anchored at the current position of the mesh. Toggle its visibility with `g`.

The gizmo can scale, rotate, and translate the mesh. The colored handles indicate axis-oriented transformations; the white handles indicate transformation in the viewing plane:

* the white rotation handle rotates around a vector normal to the viewing plane
* the white chevrons translate in the viewing plane, though the mesh will be constrained to make contact with the build plate if the `Edit -> Snap to floor` box is checked
* the white sphere scales uniformly

`ctrl` will force transformations to happen in increments (15 degrees for rotations, 1 unit for translations, powers of 2 for scaling).

Regarding world space vs. object space: scaling occurs in object space, so the scaling handles will rotate to match the object-space axes. General scaling in world space is disallowed. The rotation handles, however, will not rotate to facilitate intuitive rotation on world axes.

# Import

![import](/img/screenshots/import.png)

Supported file formats are OBJ and STL (binary and ASCII). There appears to be a rough upper limit of 50-80MB on the upload size, which is in the neighborhood of what you'd use for 3D printing. I've been able to load meshes with around 1-2 million polygons. It depends on your browser and computer. If the page hangs, the file's too big.

`meshy` uses Three.js importers.

# Import Settings

![import_settings](/img/screenshots/import_settings.png)

## Import units

Common file formats don't specify units, while `meshy` uses millimeters as its internal units. Use this field to specify the units of one unit of length in the imported file, which will then be converted to millimeters.

## Autocenter

If checked, automatically center the mesh and floor it to the build plate.

# Export

![export](/img/screenshots/export.png)

The user can specify a filename and export as either OBJ or STL.

## Export units

Units of the export mesh: the world-space millimeter coords are scaled to match the export units.

# Settings

![settings](/img/screenshots/settings.png)

## Little endian

Affects how the exporter writes files.

## Vertex precision

Generally determines the conversion factor between floating-point and fixed-point coordinates and specifies the number of digits in the float values exported in ASCII files.

# Display

![display](/img/screenshots/display.png)

## Display precision

The number of decimal places shown in the infobox and number controllers.

## Toggles

* gizmo
* axis widget
* wireframe
* center of mass indicator

## Background color

In my experience, this is best left alone.

## Material options

* mesh color
* mesh roughness
* mesh metalness
* wireframe color

## Build Volume

### Toggle volume

Toggles build volume visibility.

### Center origin

The coordinate system origin is typically in a corner of the build volume. Check this to put it in the center instead.

### Build volume dimensions

The dimensions of the build volume in millimeters.

# Edit

![edit](/img/screenshots/edit.png)

Functions that modify the mesh.

## Snap to floor

Checked if all transformations force the mesh to make contact with the build plate. True by default.

## Set base

Activates the pointer. Click on any part of the mesh to orient it in such a way that the target polygon faces downward. Helps orient the mesh in such a way that a flat base touches the floor. Can be turned off at any time with `esc`.

## Autocenter

Automatically center the mesh and floor it to the build plate.

## Translate

![translate](/img/screenshots/translate.png)

Self-explanatory.

## Rotate

![rotate](/img/screenshots/rotate.png)

Values are given in degrees, normalized to the `[0, 360)` range. Rotations are performed before translations.

This folder uses Euler angles in XYZ order relative to the mesh's original position in object space. Because Euler angles can yield unintuitive results, I recommend using the gizmo instead.

## Scale

Scaling is performed with respect to the current mesh position. Scaling happens before rotation. `meshy` has the following modes of scaling:

### Scale by factor

![scale_by_factor](/img/screenshots/scale_by_factor.png)

Scale the mesh by a given factor on the given axis.

### Scale to size

![scale_to_size](/img/screenshots/scale_to_size.png)

Scale the mesh uniformly such that it attains the correct size on the given axis.

### Scale to measurement

![scale_to_measurement](/img/screenshots/scale_to_measurement.png)

If a measurement is active, this folder will contain a selection box - use this to select one of the measured values. Change the value to scale the mesh such that the measurement now equals the given value.

### Scale to ring size

![scale_to_ring_size](/img/screenshots/scale_to_ring_size.png)

Start a circle measurement and mark a circle around the ring's inner periphery. Select a size and scale: `meshy` will scale the ring to have the correct inner diameter. The ring sizes and their respective measurements are given according to the US, Canada, and Mexico standard <a href="https://en.wikipedia.org/wiki/Ring_size">as specified on Wikipedia</a>.

*NB: the new diameter will be in millimeters.* E.g., size 9.5 corresponds to an inner diameter of 19.35mm, so the diameter will now measure 19.35mm. Make sure your printer/printing service is aware of this.

I advise ending the circle measurement after scaling because the pointer code does raycasting at every frame, which is computationally costly and can cause lag.

## Mirror

![mirror](/img/screenshots/mirror.png)

Mirror the mesh in object space.

## Floor

![floor](/img/screenshots/floor.png)

Translate the mesh along the given axis such that its lowest bound is at 0 on that axis.

## Center

![center](/img/screenshots/center.png)

Center the mesh in the current build volume.

## Flip normals

![flip_normals](/img/screenshots/flip_normals.png)

Self-explanatory.

# Measurement

![measurement](/img/screenshots/measurement.png)

Measurement is performed thusly:

* activate the desired measurement
* left-click the model to place markers
* once the necessary number of markers has been placed, the result of the measurement shows up in the infobox
* placing more markers performs the measurement again, replacing old markers on a FIFO (first in, first out) basis

`meshy` has the following modes of measurement:

## Length

Takes 2 markers; measures the Euclidean distance between the markers.

## Angle

Takes 3 markers; measures the angle between two segments formed between them in degrees.

## Circle

Takes 3 markers, which identify a circle in 3-space; measures radius, diameter, circumference, and area.

## Cross-section

Takes 1 marker; measures the cross-section in the plane normal (perpendicular) to the given axis. Calculates total area, contour length, and the bounding box.

Note that this measurement is deactivated by rotating but can be safely scaled and translated.

## Local cross-section

Takes 3 markers that denote a path around a particular part of the mesh. The 3 markers subtend a plane that cuts some number of contours through the mesh; `meshy` infers which of these contours is closest to the markers and selects that one. Calculates the same values as the regular axis-aligned cross-section.

# Mesh Thickness

![mesh_thickness](/img/screenshots/mesh_thickness.png)

Visualizes approximate mesh thickness below the specified threshold. This is done by casting a ray along each face's negative normal and measuring the distance it travels before hitting the inside of the mesh.

Any part of the mesh that's below the threshold `t` is shown in red, interpolated linearly from full white to full red over the `[t, 0]` interval.

(NB: consulting the original paper that prompted this method - "Consistent Mesh Partitioning and Skeletonisation using the Shape Diameter Function" - one will see that the SDF is canonically calculated by casting 30 rays in a wide cone; however, I settled for only casting one ray because this is already quite expensive to do in a non-parallel way. One ray provides a poor approximation, but it should nonetheless give a fair idea of where the mesh is thin.)

Possible alternatives to this method, which I may implement eventually:

1. use the full SDF (30 rays in a 120-degree cone) over a randomly picked set of faces, then interpolate the SDF over the remaining surface, and
2. remesh the model to a much lower resolution such that the polygon distribution is more or less even (presumably via the octree) and details are preserved, then do the full SDF over the new model's faces; this seems to vaguely describe Shapeways's internal algorithm and makes a lot of sense to me.

# Repair

![repair](/img/screenshots/repair.png)

Patches holes surrounded by loops of edges that each border one triangle. This is not undoable.

This algorithm may throw errors (or just fail to patch something). Do let me know via email (0x00019913@gmail.com) or <a href="https://github.com/0x00019913/meshy">on the repo</a> and send me the model in question.

For a broad overview of how it works, see "A robust hole-filling algorithm for triangular mesh", Zhao, Gao, Lin, 2007.

TODO: improve the algorithm. One potential improvement would be to skip the incremental outside-in filling method and instead just connect triangles to fill the hole minimally. Also, use a half-edge data structure instead of an adjacency map.

# Supports & Slicing

![supports_slicing](/img/screenshots/supports_slicing.png)

Three basic parameters are relevant to both:

## Layer height

Height of one slice of the mesh in millimeters.

## Line width

Width of the print line in millimeters. Determines the minimal resolvable feature size and the rate of material extrusion.

## Up axis

Support generation and slicing can be performed on any axis, though the default is `z` and should probably be kept this way.

## Supports

![supports](/img/screenshots/supports.png)

Generate tree supports that attach to the mesh and the floor. Rotating or scaling the mesh removes the supports.

This is a modified implementation of "Clever Support: Efficient Support Structure Generation for Digital Fabrication" by J. Vanek, J. A. G. Galicia, B. Benes. The main difference is that I don't use the GPU to get the closest mesh connection point, instead using raycasting to detect conflicts and cheaper alternatives to those determined by the algorithm.

The supports themselves are built as a binary tree of contiguously joined cylindrical struts. Their thickness changes based on the volume they support to provide greater stability. The supports taper as they connect to the mesh to facilitate removal.

The following parameters are passed to the generator:

### Angle

Angle range in degrees that determines the set of faces that need support: if the angle between the down axis and a face's normal is less than this angle, it needs supports.

### Spacing factor

Determines the spatial frequency of the supports. Having fewer supports saves material; having more supports makes them harder to remove and may make the slicer lag.

### Radius

Base radius of the supports. This radius grows for struts that support more weight.

### Taper factor

Struts taper when connecting to the mesh to facilitate removal. The radius at the end is the strut's computed radius multiplied by this factor. Meshy produces a warning if the resulting radius is smaller than the minimum resolvable feature size, in which case parts of the supports may be omitted in slicing.

### Subdivs

Number of angular steps in every cylindrical strut. A higher subdiv number yields smoother struts.

### Radius function

Determines how strut radius increases based on the approximate volume of supports supported by a particular strut. The function can be `constant` or `sqrt`.

The mass of the supports above a particular strut will be about proportional to their volume, which should be approximately proportional to their total length (assuming there isn't *too* much variation in radius). A particular support should presumably have cross-sectional area proportional to the volume supported, which goes as the square of the radius. So the radius should vary as the square root of the area, which varies as the total volume supported.

By default, the radius is calculated as `r + k * sqrt(w)`, where `r` is the base radius, `k` is an adjustable constant, and `w` is the "weight" of the supported struts (approximated as the total length). This asymptotically behaves as the square root but doesn't make the radius 0 at support "leaves".

### Function constant

The `k` term as described above. Increase this to increase support radius.

### Generate supports

Removes any supports present and generates new supports based on the given params.

### Remove supports

Remove any supports present.

## Slice

![slice](/img/screenshots/slice.png)

The basic slicing procedure follows the paper "An Optimal Algorithm for 3D Triangle Mesh Slicing" by Rodrigo Minetto, Neri Volpato, Jorge Stolfi, Rodrigo M. M. H. Gregori, and Murilo V. G. da Silva. The mesh is sliced into layers of uniform height (possible TODO: adaptive layer height?), with the layer height given by the `Supports & Slicing -> Layer height` controller.

Once the mesh has been sliced, the user can examine any layer, adjust slicing parameters, and export the resulting G-code.

The boolean operations used by the slicer are a generalized implementation of the algorithm in "A new algorithm for computing Boolean operations on polygons" by Francisco Martinez, Antonio Jesus Rueda, and Francisco Ramon Feito.

### Layer Settings

![layer_settings](/img/screenshots/layer_settings.png)

Options affecting individual layers of the sliced mesh.

#### Walls

Number of walls or "shells" separating the exterior from the interior. The width of each wall is equal to the line width, and the centerline of the outermost wall is inset by half a line width so that the print isn't inflated by that much.

#### Top layers

Call this value `t`.

The interior of each slice contour (delimited by the innermost wall) is filled with infill. If the infill is non-solid, some parts of a given layer may need to be solid nonetheless because some contour within the `t` layers above or the `t` layers below is exposed to the air. The slicer looks at the surrounding `2t` layers to determine which parts of the contour need to be solid.

This is only relevant if using sparse (i.e., non-solid) infill.

#### Optimize top layers

A shortcut that simplifies computation of top layers at a small cost in accuracy. Given the current layer `0` and the surrounding `2t` layers `[-t, t] \ 0`, consider a particular point `p` inside layer `0`. The point will need to have solid infill if it is not in one or more of the surrounding `2t` layers. However, because variation in the mesh will be approximately monotonic on the spatial scales in question, the conflict will typically arise in either the adjacent layer or the farthest layer, and the intermediate layers can be discarded with minimal risk. So we'll only consider the current layer `0` and layers `{-t, -1, 1, t}` if this box is checked.

#### Infill type

Possible options are `none`, `solid`, `grid`, and `lines`.

* If we're using no infill, some parts of the mesh will still have to be solid so that flat regions aren't exposed to air.
* Solid infill is self-explanatory.
* Grid infill fills each layer with two sets of parallel lines orthogonal to each other.
* Line infill fills each layer with parallel lines, whose direction alternates with layer index.

TODO: implement at least hex infill and maybe others.

#### Infill density

The infill is printed as some set of parallel, periodically spaced segments. If infill density is `d` and the line width is `w`, the period of the parallel lines will be `w / d`. E.g., if `d = 0.1`, the centerlines of adjacent infill lines will be `10w` millimeters apart.

Doesn't apply to solid infill because an infill density of `1` makes the infill solid anyway.

#### Infill overlap

Call this parameter `o` and line width `w`. With this, of each slice contour, the region available for infill ("infill contour") is the innermost wall inset inward by `(1 - o) * w`. So, if an infill line starts printing directly on this contour, its approximately circular end will overlap with the innermost wall by `o` times the line width.

This visibly affects the adhesion of solid top layers to the walls.

### Raft

![raft](/img/screenshots/raft.png)

The raft is composed of some number of raft base layers (thick, wide, widely spaced layers that go directly on the build plate) and raft top layers (relatively fine layers on top of the base layers).

#### Make raft

Uncheck this to skip making the raft and print directly on the build plate.

#### Raft base layers, height, width, density

The default is 1 raft base layer, higher and printed with a larger line width than the main line width. Base layers are printed less densely than other layers so that they don't adhere too strongly to the build plate.

#### Raft top layers, height, width, density

The default is 3 raft top layers, printed more finely and quickly than the base layers. The default is that they're printed as solid infill.

#### Offset

How far the lowest slice of the mesh should be inflated outward. The resulting contour forms the outline of the raft.

#### Air gap

A small gap between the highest point of the topmost raft top layer and the lowest point of the bottommost model layer. Default is half a line height. Makes it easier to detach the model from the raft.

#### Print perimeter

If checked, print walls surrounding the infill of which the raft is composed.

### G-code

![gcode](/img/screenshots/gcode.png)

Once the mesh is sliced, the user can export the G-code that prints it.

#### Filename, extension

The filename defaults to the name of the imported file. At the time of writing, `meshy` only allows the `gcode` file extension.

#### Temperature

The extruder is required to reach this temperature before printing starts.

#### Filament diameter

Given in millimeters. Determines the extrusion rate.

#### Prime extrusion

How much to extrude (mm) for the priming sequence.

#### Extrusion multiplier

Can be used to tweak under- or over-extrusion. Directly multiplies the computed extrusion values. Defaults to `1.0`.

#### Infill/wall speed

Speed (mm/s) at which the infill/walls are printed.

#### Raft base/top speed

Speed (mm/s) at which the raft base/top layers are printed.

#### Travel speed

Speed (mm/s) at which the extruder travels while not printing. This can be much higher than printing speed because there's no accuracy lost here.

Corresponds to the G-code `G0` command, while printing corresponds to the `G1` command.

#### Coord precision

Number of decimal places for writing spatial coordinates.

#### Extruder precision

Number of decimal places for writing extruder values. The differences in neighboring extrusion values tend to be fairly small, so a higher precision is required here than for spatial coords.

## Slice mode on

When slice mode is activated, the `Supports & Slicing` folder is replaced with the new slice folder since supports can't be generated while slice mode is on.

# Support & Slicing (slice mode on)

![supports_slicing_on](/img/screenshots/supports_slicing_on.png)

When slice mode is on, slicing-specific options appear while support controls are removed.

## Slice

Use this slider to set the current slice index. Indices `[0, n]` form the main mesh; indices below `0` form the raft.

## Mode

Two modes are available:

* Preview mode: slices off the mesh above the current level and displays the print contours in the slice plane.
* Full mode: displays all layers simultaneously. Requires calculation of all layers at once, so may be quite expensive.

## Display

![slice_display](/img/screenshots/slice_display.png)

* If preview mode:

### Show sliced mesh

If checked, the mesh is actually sliced above the current slice level. If not checked, a ghost of the mesh is shown.

* If full mode:

### Up to layer

If checked, only show all layers below and including the current layer. The `Slice` controller will determine the current layer. If not checked, `meshy` will show all layers simultaneously and the `Slice` controller will do nothing.

### Show infill

Show the infill in all layers. Because `meshy` displays geometry with unshaded lines, this tends to show nothing particularly interesting.

## Layer Settings, Raft, G-code

The same options are available here as when slice mode is off. The `Layer Settings` and `Raft` folders have an `Apply` button - use this to apply any updated parameters.

The `G-code` folder has a `Save G-code` button that generates and downloads a G-code file.

## Slice mode off

Turns off slice mode and returns support generation options.

# Undo

*Only the actions under the Edit folder and via the gizmo are undoable.* This is because 1. the memory limitations of the typical browser make a more robust undo stack not generally feasible and 2. the sequence of actions performed in `meshy` would, by and large, be minimal and easily replicated in case of a faux pas.

`ctrl+Z` triggers the undo.

# Redo

`ctrl+y` and `ctrl+shift+z` trigger the redo.

# Delete

This action is not undoable. It removes all mesh data from the current state, allowing the user to import another mesh.
