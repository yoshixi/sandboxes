//go:build go1.22

// Package server provides primitives to interact with the openapi HTTP API.
//
// Code generated by github.com/oapi-codegen/oapi-codegen/v2 version v2.3.0 DO NOT EDIT.
package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/oapi-codegen/runtime"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

const (
	BearerAuthScopes = "bearerAuth.Scopes"
)

// Defines values for EventCreationDatabase.
const (
	GoogleSpreadsheet EventCreationDatabase = "GoogleSpreadsheet"
	OwnDB             EventCreationDatabase = "OwnDB"
)

// Event defines model for Event.
type Event struct {
	CreatedAt *time.Time `json:"createdAt,omitempty"`
	Database  *string    `json:"database,omitempty"`
	Id        *int       `json:"id,omitempty"`
	Name      *string    `json:"name,omitempty"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
}

// EventCreation defines model for EventCreation.
type EventCreation struct {
	Database EventCreationDatabase `json:"database"`
	Name     string                `json:"name"`
}

// EventCreationDatabase defines model for EventCreation.Database.
type EventCreationDatabase string

// UploadParticipantsMultipartBody defines parameters for UploadParticipants.
type UploadParticipantsMultipartBody struct {
	File *openapi_types.File `json:"file,omitempty"`
}

// CreateEventJSONRequestBody defines body for CreateEvent for application/json ContentType.
type CreateEventJSONRequestBody = EventCreation

// UploadParticipantsMultipartRequestBody defines body for UploadParticipants for multipart/form-data ContentType.
type UploadParticipantsMultipartRequestBody UploadParticipantsMultipartBody

// ServerInterface represents all server handlers.
type ServerInterface interface {
	// Create a new event
	// (POST /accounts/{accountId}/events)
	CreateEvent(w http.ResponseWriter, r *http.Request, accountId int)
	// Upload participants for an event
	// (POST /accounts/{accountId}/events/{eventId}/participants/upload)
	UploadParticipants(w http.ResponseWriter, r *http.Request, accountId int, eventId int)
	// Send invitations to event participants
	// (POST /accounts/{accountId}/events/{eventId}/sendInvitations)
	SendInvitations(w http.ResponseWriter, r *http.Request, accountId int, eventId int)
}

// ServerInterfaceWrapper converts contexts to parameters.
type ServerInterfaceWrapper struct {
	Handler            ServerInterface
	HandlerMiddlewares []MiddlewareFunc
	ErrorHandlerFunc   func(w http.ResponseWriter, r *http.Request, err error)
}

type MiddlewareFunc func(http.Handler) http.Handler

// CreateEvent operation middleware
func (siw *ServerInterfaceWrapper) CreateEvent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var err error

	// ------------- Path parameter "accountId" -------------
	var accountId int

	err = runtime.BindStyledParameterWithOptions("simple", "accountId", r.PathValue("accountId"), &accountId, runtime.BindStyledParameterOptions{ParamLocation: runtime.ParamLocationPath, Explode: false, Required: true})
	if err != nil {
		siw.ErrorHandlerFunc(w, r, &InvalidParamFormatError{ParamName: "accountId", Err: err})
		return
	}

	ctx = context.WithValue(ctx, BearerAuthScopes, []string{})

	handler := http.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		siw.Handler.CreateEvent(w, r, accountId)
	}))

	for _, middleware := range siw.HandlerMiddlewares {
		handler = middleware(handler)
	}

	handler.ServeHTTP(w, r.WithContext(ctx))
}

// UploadParticipants operation middleware
func (siw *ServerInterfaceWrapper) UploadParticipants(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var err error

	// ------------- Path parameter "accountId" -------------
	var accountId int

	err = runtime.BindStyledParameterWithOptions("simple", "accountId", r.PathValue("accountId"), &accountId, runtime.BindStyledParameterOptions{ParamLocation: runtime.ParamLocationPath, Explode: false, Required: true})
	if err != nil {
		siw.ErrorHandlerFunc(w, r, &InvalidParamFormatError{ParamName: "accountId", Err: err})
		return
	}

	// ------------- Path parameter "eventId" -------------
	var eventId int

	err = runtime.BindStyledParameterWithOptions("simple", "eventId", r.PathValue("eventId"), &eventId, runtime.BindStyledParameterOptions{ParamLocation: runtime.ParamLocationPath, Explode: false, Required: true})
	if err != nil {
		siw.ErrorHandlerFunc(w, r, &InvalidParamFormatError{ParamName: "eventId", Err: err})
		return
	}

	ctx = context.WithValue(ctx, BearerAuthScopes, []string{})

	handler := http.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		siw.Handler.UploadParticipants(w, r, accountId, eventId)
	}))

	for _, middleware := range siw.HandlerMiddlewares {
		handler = middleware(handler)
	}

	handler.ServeHTTP(w, r.WithContext(ctx))
}

// SendInvitations operation middleware
func (siw *ServerInterfaceWrapper) SendInvitations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var err error

	// ------------- Path parameter "accountId" -------------
	var accountId int

	err = runtime.BindStyledParameterWithOptions("simple", "accountId", r.PathValue("accountId"), &accountId, runtime.BindStyledParameterOptions{ParamLocation: runtime.ParamLocationPath, Explode: false, Required: true})
	if err != nil {
		siw.ErrorHandlerFunc(w, r, &InvalidParamFormatError{ParamName: "accountId", Err: err})
		return
	}

	// ------------- Path parameter "eventId" -------------
	var eventId int

	err = runtime.BindStyledParameterWithOptions("simple", "eventId", r.PathValue("eventId"), &eventId, runtime.BindStyledParameterOptions{ParamLocation: runtime.ParamLocationPath, Explode: false, Required: true})
	if err != nil {
		siw.ErrorHandlerFunc(w, r, &InvalidParamFormatError{ParamName: "eventId", Err: err})
		return
	}

	ctx = context.WithValue(ctx, BearerAuthScopes, []string{})

	handler := http.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		siw.Handler.SendInvitations(w, r, accountId, eventId)
	}))

	for _, middleware := range siw.HandlerMiddlewares {
		handler = middleware(handler)
	}

	handler.ServeHTTP(w, r.WithContext(ctx))
}

type UnescapedCookieParamError struct {
	ParamName string
	Err       error
}

func (e *UnescapedCookieParamError) Error() string {
	return fmt.Sprintf("error unescaping cookie parameter '%s'", e.ParamName)
}

func (e *UnescapedCookieParamError) Unwrap() error {
	return e.Err
}

type UnmarshalingParamError struct {
	ParamName string
	Err       error
}

func (e *UnmarshalingParamError) Error() string {
	return fmt.Sprintf("Error unmarshaling parameter %s as JSON: %s", e.ParamName, e.Err.Error())
}

func (e *UnmarshalingParamError) Unwrap() error {
	return e.Err
}

type RequiredParamError struct {
	ParamName string
}

func (e *RequiredParamError) Error() string {
	return fmt.Sprintf("Query argument %s is required, but not found", e.ParamName)
}

type RequiredHeaderError struct {
	ParamName string
	Err       error
}

func (e *RequiredHeaderError) Error() string {
	return fmt.Sprintf("Header parameter %s is required, but not found", e.ParamName)
}

func (e *RequiredHeaderError) Unwrap() error {
	return e.Err
}

type InvalidParamFormatError struct {
	ParamName string
	Err       error
}

func (e *InvalidParamFormatError) Error() string {
	return fmt.Sprintf("Invalid format for parameter %s: %s", e.ParamName, e.Err.Error())
}

func (e *InvalidParamFormatError) Unwrap() error {
	return e.Err
}

type TooManyValuesForParamError struct {
	ParamName string
	Count     int
}

func (e *TooManyValuesForParamError) Error() string {
	return fmt.Sprintf("Expected one value for %s, got %d", e.ParamName, e.Count)
}

// Handler creates http.Handler with routing matching OpenAPI spec.
func Handler(si ServerInterface) http.Handler {
	return HandlerWithOptions(si, StdHTTPServerOptions{})
}

type StdHTTPServerOptions struct {
	BaseURL          string
	BaseRouter       *http.ServeMux
	Middlewares      []MiddlewareFunc
	ErrorHandlerFunc func(w http.ResponseWriter, r *http.Request, err error)
}

// HandlerFromMux creates http.Handler with routing matching OpenAPI spec based on the provided mux.
func HandlerFromMux(si ServerInterface, m *http.ServeMux) http.Handler {
	return HandlerWithOptions(si, StdHTTPServerOptions{
		BaseRouter: m,
	})
}

func HandlerFromMuxWithBaseURL(si ServerInterface, m *http.ServeMux, baseURL string) http.Handler {
	return HandlerWithOptions(si, StdHTTPServerOptions{
		BaseURL:    baseURL,
		BaseRouter: m,
	})
}

// HandlerWithOptions creates http.Handler with additional options
func HandlerWithOptions(si ServerInterface, options StdHTTPServerOptions) http.Handler {
	m := options.BaseRouter

	if m == nil {
		m = http.NewServeMux()
	}
	if options.ErrorHandlerFunc == nil {
		options.ErrorHandlerFunc = func(w http.ResponseWriter, r *http.Request, err error) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
	}

	wrapper := ServerInterfaceWrapper{
		Handler:            si,
		HandlerMiddlewares: options.Middlewares,
		ErrorHandlerFunc:   options.ErrorHandlerFunc,
	}

	m.HandleFunc("POST "+options.BaseURL+"/accounts/{accountId}/events", wrapper.CreateEvent)
	m.HandleFunc("POST "+options.BaseURL+"/accounts/{accountId}/events/{eventId}/participants/upload", wrapper.UploadParticipants)
	m.HandleFunc("POST "+options.BaseURL+"/accounts/{accountId}/events/{eventId}/sendInvitations", wrapper.SendInvitations)

	return m
}