package router

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestStaticSiteRoutesAndHeaders(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	webDir := t.TempDir()
	writeStaticFile(t, webDir, "index.html", "<html>home</html>")
	writeStaticFile(t, webDir, "404.html", "<html>missing</html>")
	writeStaticFile(t, webDir, "docs.html", "<html>docs</html>")
	writeStaticFile(t, webDir, "docs.txt", "docs payload")
	writeStaticFile(t, webDir, "robots.txt", "User-agent: *")
	writeStaticFile(t, webDir, filepath.Join("_next", "static", "chunks", "app.js"), "console.log('ok')")
	writeStaticFile(t, webDir, "logo.png", "png")

	engine := gin.New()
	if err := setupStaticSite(engine, webDir); err != nil {
		t.Fatalf("setup static site: %v", err)
	}

	tests := []struct {
		name        string
		path        string
		status      int
		location    string
		cacheHeader string
		body        string
	}{
		{
			name:        "root html alias",
			path:        "/",
			status:      http.StatusOK,
			cacheHeader: cacheControlHTML,
			body:        "<html>home</html>",
		},
		{
			name:        "docs alias",
			path:        "/docs",
			status:      http.StatusOK,
			cacheHeader: cacheControlHTML,
			body:        "<html>docs</html>",
		},
		{
			name:     "trailing slash redirect",
			path:     "/docs/",
			status:   http.StatusPermanentRedirect,
			location: "/docs",
		},
		{
			name:        "rsc payload short cache",
			path:        "/docs.txt",
			status:      http.StatusOK,
			cacheHeader: cacheControlPayload,
			body:        "docs payload",
		},
		{
			name:        "immutable next asset",
			path:        "/_next/static/chunks/app.js",
			status:      http.StatusOK,
			cacheHeader: cacheControlImmutable,
			body:        "console.log('ok')",
		},
		{
			name:        "stable public asset",
			path:        "/logo.png",
			status:      http.StatusOK,
			cacheHeader: cacheControlStable,
			body:        "png",
		},
		{
			name:        "spa fallback only for extensionless routes",
			path:        "/1.1.1.1",
			status:      http.StatusOK,
			cacheHeader: cacheControlHTML,
			body:        "<html>home</html>",
		},
		{
			name:   "unknown asset gets 404",
			path:   "/missing.js",
			status: http.StatusNotFound,
			body:   "<html>missing</html>",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, tc.path, nil)
			engine.ServeHTTP(recorder, request)

			if recorder.Code != tc.status {
				t.Fatalf("expected status %d, got %d", tc.status, recorder.Code)
			}
			if tc.location != "" {
				if recorder.Header().Get("Location") != tc.location {
					t.Fatalf("expected redirect to %s, got %s", tc.location, recorder.Header().Get("Location"))
				}
			}
			if tc.cacheHeader != "" {
				if recorder.Header().Get("Cache-Control") != tc.cacheHeader {
					t.Fatalf("expected Cache-Control %q, got %q", tc.cacheHeader, recorder.Header().Get("Cache-Control"))
				}
			}
			if tc.body != "" {
				if recorder.Body.String() != tc.body {
					t.Fatalf("expected body %q, got %q", tc.body, recorder.Body.String())
				}
			}
		})
	}
}

func TestServeContentReturnsNotModifiedForCachedHTML(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	webDir := t.TempDir()
	writeStaticFile(t, webDir, "index.html", "<html>home</html>")

	engine := gin.New()
	if err := setupStaticSite(engine, webDir); err != nil {
		t.Fatalf("setup static site: %v", err)
	}

	site, err := newStaticSite(webDir)
	if err != nil {
		t.Fatalf("new static site: %v", err)
	}
	if site.indexHTML == nil {
		t.Fatal("expected cached index asset")
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set("If-Modified-Since", site.indexHTML.lastModified.UTC().Format(http.TimeFormat))
	engine.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotModified {
		t.Fatalf("expected status %d, got %d", http.StatusNotModified, recorder.Code)
	}
}

func writeStaticFile(t *testing.T, webDir, relativePath, contents string) {
	t.Helper()

	fullPath := filepath.Join(webDir, relativePath)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("mkdir static dir: %v", err)
	}
	if err := os.WriteFile(fullPath, []byte(contents), 0o644); err != nil {
		t.Fatalf("write static file: %v", err)
	}
	now := time.Now().UTC().Add(-time.Second)
	if err := os.Chtimes(fullPath, now, now); err != nil {
		t.Fatalf("chtimes static file: %v", err)
	}
}
