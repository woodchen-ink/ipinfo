package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveWebDirFindsExportFromServerWorkingDirectory(t *testing.T) {
	t.Helper()

	rootDir := t.TempDir()
	serverDir := filepath.Join(rootDir, "server")
	webOutDir := filepath.Join(rootDir, "web", "out")

	if err := os.MkdirAll(serverDir, 0o755); err != nil {
		t.Fatalf("mkdir server dir: %v", err)
	}
	if err := os.MkdirAll(webOutDir, 0o755); err != nil {
		t.Fatalf("mkdir web out dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(webOutDir, "index.html"), []byte("<html></html>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	defer func() {
		if chdirErr := os.Chdir(previousWD); chdirErr != nil {
			t.Fatalf("restore wd: %v", chdirErr)
		}
	}()

	if err := os.Chdir(serverDir); err != nil {
		t.Fatalf("chdir server dir: %v", err)
	}

	resolved := resolveWebDir("")
	expected, err := filepath.Abs(webOutDir)
	if err != nil {
		t.Fatalf("abs web out dir: %v", err)
	}

	if resolved != expected {
		t.Fatalf("expected resolved web dir %q, got %q", expected, resolved)
	}
}

func TestResolveWebDirFindsExportFromServerCmdWorkingDirectory(t *testing.T) {
	t.Helper()

	rootDir := t.TempDir()
	serverCmdDir := filepath.Join(rootDir, "server", "cmd", "server")
	webOutDir := filepath.Join(rootDir, "web", "out")

	if err := os.MkdirAll(serverCmdDir, 0o755); err != nil {
		t.Fatalf("mkdir server cmd dir: %v", err)
	}
	if err := os.MkdirAll(webOutDir, 0o755); err != nil {
		t.Fatalf("mkdir web out dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(webOutDir, "index.html"), []byte("<html></html>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	defer func() {
		if chdirErr := os.Chdir(previousWD); chdirErr != nil {
			t.Fatalf("restore wd: %v", chdirErr)
		}
	}()

	if err := os.Chdir(serverCmdDir); err != nil {
		t.Fatalf("chdir server cmd dir: %v", err)
	}

	resolved := resolveWebDir("")
	expected, err := filepath.Abs(webOutDir)
	if err != nil {
		t.Fatalf("abs web out dir: %v", err)
	}

	if resolved != expected {
		t.Fatalf("expected resolved web dir %q, got %q", expected, resolved)
	}
}

func TestResolveWebDirKeepsEmptyWhenNoValidFrontendDirExists(t *testing.T) {
	t.Helper()

	rootDir := t.TempDir()
	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	defer func() {
		if chdirErr := os.Chdir(previousWD); chdirErr != nil {
			t.Fatalf("restore wd: %v", chdirErr)
		}
	}()

	if err := os.Chdir(rootDir); err != nil {
		t.Fatalf("chdir root dir: %v", err)
	}

	if resolved := resolveWebDir(""); resolved != "" {
		t.Fatalf("expected empty web dir, got %q", resolved)
	}
}
