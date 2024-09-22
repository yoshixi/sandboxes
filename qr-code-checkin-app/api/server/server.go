package server

import (
	"fmt"
	"net/http"
)

var _ ServerInterface = (*Server)(nil)

// type ServerInterface interface {
// 	// Create a new event
// 	// (POST /accounts/{accountId}/events)
// 	CreateEvent(w http.ResponseWriter, r *http.Request, accountId int)
// 	// Upload participants for an event
// 	// (POST /accounts/{accountId}/events/{eventId}/participants/upload)
// 	UploadParticipants(w http.ResponseWriter, r *http.Request, accountId int, eventId int)
// 	// Send invitations to event participants
// 	// (POST /accounts/{accountId}/events/{eventId}/sendInvitations)
// 	SendInvitations(w http.ResponseWriter, r *http.Request, accountId int, eventId int)
// }

type Server struct{}

func NewServer() *Server {
	return &Server{}
}

func (s *Server) CreateEvent(w http.ResponseWriter, r *http.Request, accountId int) {
	fmt.Fprintf(w, "CreateEvent")
}

func (s *Server) UploadParticipants(w http.ResponseWriter, r *http.Request, accountId int, eventId int) {
	fmt.Fprintf(w, "UploadParticipants")
}

func (s *Server) SendInvitations(w http.ResponseWriter, r *http.Request, accountId int, eventId int) {
	fmt.Fprintf(w, "SendInvitations")
}
