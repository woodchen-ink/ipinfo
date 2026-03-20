package router

import (
	"bytes"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	cacheControlImmutable = "public, max-age=31536000, immutable"
	cacheControlHTML      = "no-cache"
	cacheControlPayload   = "public, max-age=60, stale-while-revalidate=300"
	cacheControlStable    = "public, max-age=86400"
	cacheControlRobots    = "public, max-age=3600, stale-while-revalidate=86400"
	cacheControlAPI       = "no-store"
)

type staticAsset struct {
	absolutePath  string
	name          string
	contentType   string
	cacheControl  string
	lastModified  time.Time
	inMemoryBytes []byte
}

type staticSite struct {
	assets      map[string]*staticAsset
	indexHTML   *staticAsset
	notFound404 *staticAsset
}

func newStaticSite(webDir string) (*staticSite, error) {
	site := &staticSite{
		assets: make(map[string]*staticAsset),
	}

	if err := filepath.WalkDir(webDir, func(fullPath string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}

		info, err := entry.Info()
		if err != nil {
			return fmt.Errorf("read static file info %s: %w", fullPath, err)
		}

		relPath, err := filepath.Rel(webDir, fullPath)
		if err != nil {
			return fmt.Errorf("resolve relative path %s: %w", fullPath, err)
		}

		requestPath := requestPathFromRelative(relPath)
		asset := &staticAsset{
			absolutePath: fullPath,
			name:         filepath.Base(fullPath),
			contentType:  detectContentType(fullPath),
			cacheControl: cacheControlForStaticPath(requestPath),
			lastModified: info.ModTime(),
		}

		if shouldCacheInMemory(requestPath) {
			data, err := os.ReadFile(fullPath)
			if err != nil {
				return fmt.Errorf("cache static file %s: %w", fullPath, err)
			}
			asset.inMemoryBytes = data
		}

		site.assets[requestPath] = asset
		registerHTMLAliases(site.assets, requestPath, asset)

		if requestPath == "/" || requestPath == "/index.html" {
			site.indexHTML = asset
		}
		if requestPath == "/404.html" {
			site.notFound404 = asset
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if site.indexHTML == nil {
		return nil, fmt.Errorf("missing static export entrypoint: %s", filepath.Join(webDir, "index.html"))
	}

	return site, nil
}

func setupStaticSite(r *gin.Engine, webDir string) error {
	site, err := newStaticSite(webDir)
	if err != nil {
		return err
	}

	r.NoRoute(func(c *gin.Context) {
		requestPath := normalizeRequestPath(c.Request.URL.Path)
		if redirectPath := canonicalPathForRedirect(c.Request.URL.Path, requestPath); redirectPath != "" {
			c.Redirect(http.StatusPermanentRedirect, appendRawQuery(redirectPath, c.Request.URL.RawQuery))
			return
		}

		if asset := site.assets[requestPath]; asset != nil {
			serveStaticAsset(c, asset)
			return
		}

		if shouldFallbackToIndex(requestPath) {
			serveStaticAsset(c, site.indexHTML)
			return
		}

		if site.notFound404 != nil {
			serveStaticAssetWithStatus(c, site.notFound404, http.StatusNotFound)
			return
		}

		c.String(http.StatusNotFound, "404 page not found")
	})

	return nil
}

func serveStaticAsset(c *gin.Context, asset *staticAsset) {
	if asset == nil {
		c.String(http.StatusNotFound, "404 page not found")
		return
	}

	c.Header("Cache-Control", asset.cacheControl)
	if asset.contentType != "" {
		c.Header("Content-Type", asset.contentType)
	}

	if asset.inMemoryBytes != nil {
		http.ServeContent(
			c.Writer,
			c.Request,
			asset.name,
			asset.lastModified,
			bytes.NewReader(asset.inMemoryBytes),
		)
		return
	}

	http.ServeFile(c.Writer, c.Request, asset.absolutePath)
}

func serveStaticAssetWithStatus(c *gin.Context, asset *staticAsset, statusCode int) {
	if asset == nil {
		c.String(statusCode, http.StatusText(statusCode))
		return
	}

	c.Header("Cache-Control", asset.cacheControl)
	if asset.contentType != "" {
		c.Header("Content-Type", asset.contentType)
	}

	c.Status(statusCode)

	if asset.inMemoryBytes != nil {
		_, _ = c.Writer.Write(asset.inMemoryBytes)
		return
	}

	data, err := os.ReadFile(asset.absolutePath)
	if err != nil {
		c.String(http.StatusNotFound, "404 page not found")
		return
	}
	_, _ = c.Writer.Write(data)
}

func normalizeRequestPath(rawPath string) string {
	if rawPath == "" {
		return "/"
	}

	cleanPath := path.Clean("/" + rawPath)
	if cleanPath == "." {
		return "/"
	}
	return cleanPath
}

func canonicalPathForRedirect(rawPath, normalizedPath string) string {
	if rawPath == "" {
		return ""
	}

	if rawPath != "/" && strings.HasSuffix(rawPath, "/") && normalizedPath != "/" {
		return normalizedPath
	}

	if normalizedPath != rawPath && normalizedPath != "" {
		return normalizedPath
	}

	return ""
}

func appendRawQuery(requestPath, rawQuery string) string {
	if rawQuery == "" {
		return requestPath
	}
	return requestPath + "?" + rawQuery
}

func requestPathFromRelative(relPath string) string {
	slashPath := filepath.ToSlash(relPath)
	if slashPath == "index.html" {
		return "/index.html"
	}
	return "/" + slashPath
}

func registerHTMLAliases(assets map[string]*staticAsset, requestPath string, asset *staticAsset) {
	if path.Ext(requestPath) != ".html" {
		return
	}

	switch {
	case requestPath == "/index.html":
		assets["/"] = asset
	case strings.HasSuffix(requestPath, "/index.html"):
		trimmed := strings.TrimSuffix(requestPath, "/index.html")
		if trimmed == "" {
			trimmed = "/"
		}
		assets[trimmed] = asset
	default:
		assets[strings.TrimSuffix(requestPath, ".html")] = asset
	}
}

func shouldCacheInMemory(requestPath string) bool {
	switch path.Ext(requestPath) {
	case ".html", ".txt", ".xml", ".json":
		return true
	default:
		return requestPath == "/robots.txt"
	}
}

func detectContentType(fullPath string) string {
	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(fullPath)))
	if contentType != "" {
		return contentType
	}

	switch strings.ToLower(filepath.Ext(fullPath)) {
	case ".js":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	default:
		return ""
	}
}

func cacheControlForStaticPath(requestPath string) string {
	switch {
	case strings.HasPrefix(requestPath, "/_next/static/"):
		return cacheControlImmutable
	case requestPath == "/robots.txt" || requestPath == "/sitemap.xml":
		return cacheControlRobots
	case path.Ext(requestPath) == ".txt":
		return cacheControlPayload
	case path.Ext(requestPath) == ".html":
		return cacheControlHTML
	case isStablePublicAsset(requestPath):
		return cacheControlStable
	default:
		return cacheControlHTML
	}
}

func isStablePublicAsset(requestPath string) bool {
	switch strings.ToLower(path.Ext(requestPath)) {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf":
		return true
	default:
		return false
	}
}

func shouldFallbackToIndex(requestPath string) bool {
	if requestPath == "/" {
		return true
	}

	ext := strings.ToLower(path.Ext(requestPath))
	if ext == "" {
		return true
	}

	switch ext {
	case ".html", ".txt", ".xml", ".json", ".js", ".css", ".map", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf":
		return false
	default:
		return true
	}
}
