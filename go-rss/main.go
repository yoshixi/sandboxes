package main

import (
	"fmt"
	"io"
	"net/http"

	"github.com/mmcdole/gofeed"
)

func main() {
	fp := gofeed.NewParser()
	feed, _ := fp.ParseURL("https://news.ycombinator.com/rss")
	fmt.Println(feed.Title)

	url := "https://news.google.com/rss/articles/CBMiXWh0dHBzOi8vd3d3LmJsb29tYmVyZy5jb20vbmV3cy92aWRlb3MvMjAyNC0wMS0yMC9ibG9vbWJlcmctbWFya2V0cy10aGUtY2xvc2UtMDEtMTktMjAyNC12aWRlb9IBAA?oc=5"

	// Create an HTTP client with a CheckRedirect function
	// to handle redirects manually.
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Return http.ErrUseLastResponse to tell the client to not follow the redirect
			return http.ErrUseLastResponse
		},
	}

	// Perform the initial request
	resp, err := client.Get(url)
	if err != nil {
		fmt.Println("Error making the request:", err)
		return
	}
	defer resp.Body.Close()

	// Check if a redirect is happening
	if resp.StatusCode == http.StatusMovedPermanently || resp.StatusCode == http.StatusFound ||
		resp.StatusCode == http.StatusSeeOther || resp.StatusCode == http.StatusTemporaryRedirect {

		// Get the redirect URL from the header
		redirectURL := resp.Header.Get("Location")
		fmt.Println("Redirecting to:", redirectURL)

		// Perform the request to the redirect URL
		resp, err = http.Get(redirectURL)
		if err != nil {
			fmt.Println("Error following the redirect:", err)
			return
		}
		defer resp.Body.Close()
	}

	// Read and print the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading the response body:", err)
		return
	}
	fmt.Println("Response from redirected site:")
	fmt.Println(string(body))
}
