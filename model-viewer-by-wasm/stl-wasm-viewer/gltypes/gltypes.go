package gltypes

import (
	"errors"
	"syscall/js"
)

// GLTypes provides WebGL bindings.
type GLTypes struct {
	StaticDraw         js.Value
	ArrayBuffer        js.Value
	ElementArrayBuffer js.Value
	VertexShader       js.Value
	FragmentShader     js.Value
	Float              js.Value
	DepthTest          js.Value
	ColorBufferBit     js.Value
	DepthBufferBit     js.Value
	Triangles          js.Value
	UnsignedShort      js.Value
	UnsignedInt        js.Value
	LEqual             js.Value
	LineLoop           js.Value
}

// New grabs the WebGL bindings from a GL context.
func (types *GLTypes) New(gl js.Value) error {
	types.StaticDraw = gl.Get("STATIC_DRAW")
	types.ArrayBuffer = gl.Get("ARRAY_BUFFER")
	types.ElementArrayBuffer = gl.Get("ELEMENT_ARRAY_BUFFER")
	types.VertexShader = gl.Get("VERTEX_SHADER")
	types.FragmentShader = gl.Get("FRAGMENT_SHADER")
	types.Float = gl.Get("FLOAT")
	types.DepthTest = gl.Get("DEPTH_TEST")
	types.ColorBufferBit = gl.Get("COLOR_BUFFER_BIT")
	types.Triangles = gl.Get("TRIANGLES")
	types.UnsignedShort = gl.Get("UNSIGNED_SHORT")
	types.LEqual = gl.Get("LEQUAL")
	types.DepthBufferBit = gl.Get("DEPTH_BUFFER_BIT")
	types.LineLoop = gl.Get("LINE_LOOP")
	enabled := gl.Call("getExtension", "OES_element_index_uint")
	if !enabled.Truthy() {
		return errors.New("missing extension: OES_element_index_uint")
	}
	types.UnsignedInt = gl.Get("UNSIGNED_INT")
	return nil
}
