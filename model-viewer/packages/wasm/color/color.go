package color

import (
	"math/rand"
)

type Color struct {
	Red   float32
	Green float32
	Blue  float32
}

func NewRandomColor() Color {
	return Color{
		rand.Float32(),
		rand.Float32(),
		rand.Float32(),
	}
}

func (c Color) Subtract(d Color) Color {
	return Color{
		c.Red - d.Red,
		c.Green - d.Green,
		c.Blue - d.Blue,
	}
}

func (c Color) Add(d Color) Color {
	return Color{
		c.Red + d.Red,
		c.Green + d.Green,
		c.Blue + d.Blue,
	}
}

func (c Color) MultiplyFloat(x float32) Color {
	return Color{
		c.Red * x,
		c.Green * x,
		c.Blue * x,
	}
}
