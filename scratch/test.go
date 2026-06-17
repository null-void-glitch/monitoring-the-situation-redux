package main

import (
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: Could not load .env file, using environment variables")
	}

	// Get Cloudflare token from environment
	cfToken := os.Getenv("CF_RADAR_TOKEN")
	if cfToken == "" {
		fmt.Println("Error: CF_RADAR_TOKEN not set in .env or environment")
		return
	}

	req, _ := http.NewRequest("GET", "https://api.cloudflare.com/client/v4/radar/annotations/outages?dateRange=1d", nil)
	req.Header.Set("Authorization", "Bearer "+cfToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	fmt.Println(string(b))
}
