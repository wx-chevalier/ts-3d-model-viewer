package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"runtime"
)

func main() {
	indexData, err := ioutil.ReadFile("index.html")
	if err != nil {
		log.Fatalf("Could not read index file: %s\n", err)
	}

	wasmExecLocation := runtime.GOROOT() + "/misc/wasm/wasm_exec.js"
	wasmExecData, err := ioutil.ReadFile(wasmExecLocation)
	if err != nil {
		log.Fatalf("Could not read wasm_exec file: %s\n", err)
	}

	wasmData, err := ioutil.ReadFile("bundle.wasm")
	if err != nil {
		log.Fatalf("Could not read wasm file: %s\n", err)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write(indexData)
	})

	http.HandleFunc("/wasm_exec.js", func(w http.ResponseWriter, r *http.Request) {
		w.Write(wasmExecData)
	})

	http.HandleFunc("/bundle.wasm", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/wasm")
		w.WriteHeader(http.StatusOK)
		w.Write(wasmData)
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
