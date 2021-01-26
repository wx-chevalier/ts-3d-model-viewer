package color

import (
	"math"
)

func GenerateGradient(numColors int, steps int) []Color {
	// Evenly space colors
	distribution := distributeColors(numColors, steps)
	colors := make([]Color, numColors)
	for i := 0; i < numColors; i++ {
		colors[i] = NewRandomColor()
	}
	// Interpolate between colors
	outputBuffer := make([]Color, 0, steps)
	for index := 0; index < numColors; index++ {
		if index >= numColors-1 {
			size := steps - distribution[index]
			interpolation := NewColorInterpolation(colors[index-1], colors[index])
			buffer := generateSingleGradient(interpolation, size)
			outputBuffer = append(outputBuffer, buffer...)
			break
		}
		currentStep := distribution[index]
		nextStep := distribution[index+1]
		size := nextStep - currentStep
		interpolation := NewColorInterpolation(colors[index], colors[index+1])
		buffer := generateSingleGradient(interpolation, size)
		outputBuffer = append(outputBuffer, buffer...)
	}
	// Create output
	return outputBuffer
}

func distributeColors(numColors int, steps int) []int {
	diff := int(math.Ceil(float64(steps) / float64(numColors)))
	output := make([]int, numColors)
	for i := 0; i < numColors; i++ {
		output[i] = diff * i
	}
	return output
}

func generateSingleGradient(c ColorInterpolation, numSteps int) []Color {
	output := make([]Color, numSteps)
	for i := 0; i < numSteps; i++ {
		percent := float32(i) / float32(numSteps)
		output[i] = c.Interpolate(percent)
	}
	return output
}
