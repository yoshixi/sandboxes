package main

import "fmt"

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config=oapi_config.yaml ./doc/openapi.yaml
func main() {
	fmt.Print("hello")
}
