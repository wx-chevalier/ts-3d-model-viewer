package models

type Model interface {
	GetModel() ([]float32, []float32, []uint16)
}
