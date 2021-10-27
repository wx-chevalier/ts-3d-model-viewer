package color

func NewColorInterpolation(a Color, b Color) ColorInterpolation {
	return ColorInterpolation{
		a,
		b,
		a.Subtract(b),
	}
}

type ColorInterpolation struct {
	startColor Color
	endColor   Color
	deltaColor Color
}

func (c ColorInterpolation) Interpolate(percent float32) Color {
	scaled := c.deltaColor.MultiplyFloat(percent)
	return c.startColor.Add(scaled)
}
