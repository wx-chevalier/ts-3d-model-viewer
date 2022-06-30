package models

import (
	"bytes"
	"fmt"
	"math/rand"

	"github.com/bobcob7/wasm-stl-viewer/color"
	"gitlab.com/russoj88/stl/stl"
)

func NewSTL(buffer []byte) (output STL, err error) {
	// Parse STL file
	bufferReader := bytes.NewReader(buffer)
	solid, err := stl.From(bufferReader)
	if err != nil {
		return
	}
	fmt.Printf("Parsed in %d Triangles\n", solid.TriangleCount)
	// Generate random color gradient
	numColors := (rand.Int() % 5) + 2
	colors := color.GenerateGradient(numColors, int(solid.TriangleCount))
	var index uint32 = 0
	// Make Vertice array
	for i, triangle := range solid.Triangles {

		colorR := colors[i].Red
		colorG := colors[i].Green
		colorB := colors[i].Blue
		output.vertices = append(output.vertices, triangle.Vertices[0].X)
		output.vertices = append(output.vertices, triangle.Vertices[0].Y)
		output.vertices = append(output.vertices, triangle.Vertices[0].Z)
		output.indices = append(output.indices, index)
		output.colors = append(output.colors, colorR)
		output.colors = append(output.colors, colorG)
		output.colors = append(output.colors, colorB)
		index++
		output.vertices = append(output.vertices, triangle.Vertices[1].X)
		output.vertices = append(output.vertices, triangle.Vertices[1].Y)
		output.vertices = append(output.vertices, triangle.Vertices[1].Z)
		output.indices = append(output.indices, index)
		output.colors = append(output.colors, colorR)
		output.colors = append(output.colors, colorG)
		output.colors = append(output.colors, colorB)
		index++
		output.vertices = append(output.vertices, triangle.Vertices[2].X)
		output.vertices = append(output.vertices, triangle.Vertices[2].Y)
		output.vertices = append(output.vertices, triangle.Vertices[2].Z)
		output.indices = append(output.indices, index)
		output.colors = append(output.colors, colorR)
		output.colors = append(output.colors, colorG)
		output.colors = append(output.colors, colorB)
		index++
	}
	return
}

type STL struct {
	vertices []float32
	colors   []float32
	indices  []uint32
}

func (s STL) GetModel() ([]float32, []float32, []uint32) {
	return s.vertices, s.colors, s.indices
}
