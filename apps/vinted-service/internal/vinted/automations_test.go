package vinted

import (
	"errors"
	"testing"
)

func TestAutomaticMutationsNeverRetryUnauthorizedOrLostResponse(t *testing.T) {
	for _, kind := range []string{"offer", "message"} {
		for _, outcome := range []fakeHTTPResult{{status: 401, body: `{}`}, {status: 429, body: `{}`}, {status: 500, body: `{}`}, {err: errors.New("response lost")}} {
			t.Run(kind, func(t *testing.T) {
				client, transport := testClient(fakeHTTPResult{status: 200, body: `{"conversation":{"id":10,"transaction":{"id":20}}}`}, outcome)
				client.warmedUp = true
				client.session.RefreshToken = "synthetic-refresh"
				var err error
				if kind == "offer" {
					err = client.SendAutomaticOffer(1, 2, "10.00", "EUR")
				} else {
					err = client.SendAutomaticMessage(1, 2, "Hi")
				}
				if err == nil {
					t.Fatal("failed mutation reported success")
				}
				if len(transport.requests) != 2 {
					t.Fatalf("mutation retried: %d requests", len(transport.requests))
				}
			})
		}
	}
}

func TestAutomaticMutationsStopAfterConversationFailure(t *testing.T) {
	for _, kind := range []string{"offer", "message"} {
		client, transport := testClient(fakeHTTPResult{status: 403, body: `{}`})
		client.warmedUp = true
		if kind == "offer" {
			_ = client.SendAutomaticOffer(1, 2, "10.00", "EUR")
		} else {
			_ = client.SendAutomaticMessage(1, 2, "Hi")
		}
		if len(transport.requests) != 1 {
			t.Fatal("continued after conversation failure")
		}
	}
}

func TestAutomaticMutationsSuccessfulPayloads(t *testing.T) {
	for _, kind := range []string{"offer", "message"} {
		client, transport := testClient(fakeHTTPResult{status: 200, body: `{"conversation":{"id":10,"transaction":{"id":20}}}`}, fakeHTTPResult{status: 200, body: `{}`})
		client.warmedUp = true
		var err error
		if kind == "offer" {
			err = client.SendAutomaticOffer(1, 2, "10.00", "EUR")
		} else {
			err = client.SendAutomaticMessage(1, 2, "Hi")
		}
		if err != nil || len(transport.requests) != 2 {
			t.Fatalf("success err=%v requests=%d", err, len(transport.requests))
		}
	}
}

func TestAutomaticMutationsStopWhenWarmupFails(t *testing.T) {
	for _, kind := range []string{"offer", "message"} {
		client, transport := testClient(fakeHTTPResult{err: errors.New("warmup unavailable")})
		var err error
		if kind == "offer" {
			err = client.SendAutomaticOffer(1, 2, "10.00", "EUR")
		} else {
			err = client.SendAutomaticMessage(1, 2, "Hi")
		}
		if err == nil {
			t.Fatal("warmup failure ignored")
		}
		for _, req := range transport.requests {
			if req.Method == "POST" {
				t.Fatal("mutated after warmup failure")
			}
		}
	}
}
