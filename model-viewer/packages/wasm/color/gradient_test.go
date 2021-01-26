package color

import (
	"reflect"
	"testing"
)

func Test_distributeColors(t *testing.T) {
	type args struct {
		numColors int
		steps     int
	}
	tests := []struct {
		name string
		args args
		want []int
	}{
		{
			name: "3 Colors",
			args: args{
				numColors: 3,
				steps:     5,
			},
			want: []int{0, 2, 4},
		},
		{
			name: "Extra 1 Color",
			args: args{
				numColors: 3,
				steps:     7,
			},
			want: []int{0, 3, 6},
		},
		{
			name: "Extra 2 Colors",
			args: args{
				numColors: 3,
				steps:     8,
			},
			want: []int{0, 3, 6},
		},
		{
			name: "Extra 3 Colors",
			args: args{
				numColors: 3,
				steps:     9,
			},
			want: []int{0, 3, 6},
		},
		{
			name: "Extra 1 Color 10",
			args: args{
				numColors: 3,
				steps:     10,
			},
			want: []int{0, 4, 8},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := distributeColors(tt.args.numColors, tt.args.steps); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("distributeColors() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewRandomGradient(t *testing.T) {
	type args struct {
		numColors int
		steps     int
	}
	tests := []struct {
		name    string
		args    args
		wantLen int
		want    Gradient
	}{
		{
			name: "3 Colors",
			args: args{
				numColors: 3,
				steps:     5,
			},
			want: Gradient{[]Color{}},
		},
		{
			name: "Extra 2 Colors",
			args: args{
				numColors: 3,
				steps:     8,
			},
			want: Gradient{[]Color{}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewRandomGradient(tt.args.numColors, tt.args.steps)
			if len(got.colors) != tt.args.steps {
				t.Errorf("NewRandomGradient().Len = %d, want %d", len(got.colors), tt.args.steps)
			}
		})
	}
}
