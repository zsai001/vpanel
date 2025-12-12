package services

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/vpanel/server/internal/config"
	"github.com/vpanel/server/pkg/logger"
	"gorm.io/gorm"
)

// FileService handles file operations
type FileService struct {
	db       *gorm.DB
	config   *config.Config
	log      *logger.Logger
	rootPath string
}

// NewFileService creates a new file service
func NewFileService(db *gorm.DB, cfg *config.Config, log *logger.Logger) *FileService {
	return &FileService{
		db:       db,
		config:   cfg,
		log:      log,
		rootPath: "/", // Can be restricted for security
	}
}

// FileInfo represents file information
type FileInfo struct {
	Name        string      `json:"name"`
	Path        string      `json:"path"`
	IsDir       bool        `json:"is_dir"`
	Size        int64       `json:"size"`
	Mode        os.FileMode `json:"mode"`
	ModeString  string      `json:"mode_string"`
	ModTime     time.Time   `json:"mod_time"`
	Owner       string      `json:"owner"`
	Group       string      `json:"group"`
	IsSymlink   bool        `json:"is_symlink"`
	SymlinkPath string      `json:"symlink_path,omitempty"`
	Extension   string      `json:"extension,omitempty"`
}

// ListDir lists directory contents
func (s *FileService) ListDir(path string) ([]FileInfo, error) {
	fullPath := s.resolvePath(path)

	// Security check
	if !s.isPathAllowed(fullPath) {
		return nil, ErrPathNotAllowed
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	files := make([]FileInfo, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fi := FileInfo{
			Name:       info.Name(),
			Path:       filepath.Join(path, info.Name()),
			IsDir:      info.IsDir(),
			Size:       info.Size(),
			Mode:       info.Mode(),
			ModeString: info.Mode().String(),
			ModTime:    info.ModTime(),
		}

		// Check if symlink
		if info.Mode()&os.ModeSymlink != 0 {
			fi.IsSymlink = true
			target, _ := os.Readlink(filepath.Join(fullPath, info.Name()))
			fi.SymlinkPath = target
		}

		// Get extension
		if !info.IsDir() {
			fi.Extension = strings.TrimPrefix(filepath.Ext(info.Name()), ".")
		}

		files = append(files, fi)
	}

	// Sort: directories first, then by name
	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name)
	})

	return files, nil
}

// ReadFile reads file content
func (s *FileService) ReadFile(path string) ([]byte, error) {
	fullPath := s.resolvePath(path)

	if !s.isPathAllowed(fullPath) {
		return nil, ErrPathNotAllowed
	}

	// Check file size
	info, err := os.Stat(fullPath)
	if err != nil {
		return nil, err
	}

	if info.IsDir() {
		return nil, ErrIsDirectory
	}

	// Limit file size to 10MB
	if info.Size() > 10*1024*1024 {
		return nil, ErrFileTooLarge
	}

	return os.ReadFile(fullPath)
}

// WriteFile writes content to file
func (s *FileService) WriteFile(path string, content []byte) error {
	fullPath := s.resolvePath(path)

	if !s.isPathAllowed(fullPath) {
		return ErrPathNotAllowed
	}

	// Ensure parent directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0644)
}

// CreateDir creates a directory
func (s *FileService) CreateDir(path string) error {
	fullPath := s.resolvePath(path)

	if !s.isPathAllowed(fullPath) {
		return ErrPathNotAllowed
	}

	return os.MkdirAll(fullPath, 0755)
}

// Rename renames/moves a file or directory
func (s *FileService) Rename(oldPath, newPath string) error {
	fullOldPath := s.resolvePath(oldPath)
	fullNewPath := s.resolvePath(newPath)

	if !s.isPathAllowed(fullOldPath) || !s.isPathAllowed(fullNewPath) {
		return ErrPathNotAllowed
	}

	return os.Rename(fullOldPath, fullNewPath)
}

// Copy copies a file or directory
func (s *FileService) Copy(srcPath, dstPath string) error {
	fullSrcPath := s.resolvePath(srcPath)
	fullDstPath := s.resolvePath(dstPath)

	if !s.isPathAllowed(fullSrcPath) || !s.isPathAllowed(fullDstPath) {
		return ErrPathNotAllowed
	}

	info, err := os.Stat(fullSrcPath)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return s.copyDir(fullSrcPath, fullDstPath)
	}
	return s.copyFile(fullSrcPath, fullDstPath)
}

// Delete deletes a file or directory
func (s *FileService) Delete(path string) error {
	fullPath := s.resolvePath(path)

	if !s.isPathAllowed(fullPath) {
		return ErrPathNotAllowed
	}

	// Don't allow deleting root or critical paths
	if fullPath == "/" || fullPath == s.rootPath {
		return ErrPathNotAllowed
	}

	return os.RemoveAll(fullPath)
}

// GetFileInfo returns file information
func (s *FileService) GetFileInfo(path string) (*FileInfo, error) {
	fullPath := s.resolvePath(path)

	if !s.isPathAllowed(fullPath) {
		return nil, ErrPathNotAllowed
	}

	info, err := os.Stat(fullPath)
	if err != nil {
		return nil, err
	}

	fi := &FileInfo{
		Name:       info.Name(),
		Path:       path,
		IsDir:      info.IsDir(),
		Size:       info.Size(),
		Mode:       info.Mode(),
		ModeString: info.Mode().String(),
		ModTime:    info.ModTime(),
	}

	if !info.IsDir() {
		fi.Extension = strings.TrimPrefix(filepath.Ext(info.Name()), ".")
	}

	return fi, nil
}

// SetPermissions sets file permissions
func (s *FileService) SetPermissions(path string, mode os.FileMode) error {
	fullPath := s.resolvePath(path)

	if !s.isPathAllowed(fullPath) {
		return ErrPathNotAllowed
	}

	return os.Chmod(fullPath, mode)
}

// Search searches for files
func (s *FileService) Search(basePath, pattern string, maxResults int) ([]FileInfo, error) {
	fullPath := s.resolvePath(basePath)

	if !s.isPathAllowed(fullPath) {
		return nil, ErrPathNotAllowed
	}

	if maxResults <= 0 {
		maxResults = 100
	}

	results := make([]FileInfo, 0)
	pattern = strings.ToLower(pattern)

	err := filepath.Walk(fullPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}

		if len(results) >= maxResults {
			return filepath.SkipAll
		}

		if strings.Contains(strings.ToLower(info.Name()), pattern) {
			relPath, _ := filepath.Rel(fullPath, path)
			results = append(results, FileInfo{
				Name:       info.Name(),
				Path:       filepath.Join(basePath, relPath),
				IsDir:      info.IsDir(),
				Size:       info.Size(),
				Mode:       info.Mode(),
				ModeString: info.Mode().String(),
				ModTime:    info.ModTime(),
			})
		}

		return nil
	})

	return results, err
}

// Compress compresses files into an archive
func (s *FileService) Compress(paths []string, destPath string, format string) error {
	fullDestPath := s.resolvePath(destPath)

	if !s.isPathAllowed(fullDestPath) {
		return ErrPathNotAllowed
	}

	switch format {
	case "zip":
		return s.compressZip(paths, fullDestPath)
	case "tar.gz", "tgz":
		return s.compressTarGz(paths, fullDestPath)
	default:
		return s.compressZip(paths, fullDestPath)
	}
}

// Decompress extracts an archive
func (s *FileService) Decompress(archivePath, destPath string) error {
	fullArchivePath := s.resolvePath(archivePath)
	fullDestPath := s.resolvePath(destPath)

	if !s.isPathAllowed(fullArchivePath) || !s.isPathAllowed(fullDestPath) {
		return ErrPathNotAllowed
	}

	ext := strings.ToLower(filepath.Ext(archivePath))
	switch ext {
	case ".zip":
		return s.decompressZip(fullArchivePath, fullDestPath)
	case ".gz":
		if strings.HasSuffix(strings.ToLower(archivePath), ".tar.gz") {
			return s.decompressTarGz(fullArchivePath, fullDestPath)
		}
		return ErrUnsupportedFormat
	case ".tgz":
		return s.decompressTarGz(fullArchivePath, fullDestPath)
	default:
		return ErrUnsupportedFormat
	}
}

// Helper methods

func (s *FileService) resolvePath(path string) string {
	if filepath.IsAbs(path) {
		return filepath.Clean(path)
	}
	return filepath.Clean(filepath.Join(s.rootPath, path))
}

func (s *FileService) isPathAllowed(path string) bool {
	// Basic security checks
	if path == "" {
		return false
	}

	// Prevent path traversal
	clean := filepath.Clean(path)
	if strings.Contains(clean, "..") {
		return false
	}

	// Add more restrictions as needed
	// For example, block access to sensitive directories
	blockedPaths := []string{
		"/etc/shadow",
		"/etc/passwd",
	}

	for _, blocked := range blockedPaths {
		if strings.HasPrefix(clean, blocked) {
			return false
		}
	}

	return true
}

func (s *FileService) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return err
	}

	// Copy permissions
	info, _ := os.Stat(src)
	return os.Chmod(dst, info.Mode())
}

func (s *FileService) copyDir(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := s.copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			if err := s.copyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *FileService) compressZip(paths []string, destPath string) error {
	zipFile, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	for _, path := range paths {
		fullPath := s.resolvePath(path)
		if !s.isPathAllowed(fullPath) {
			continue
		}

		err := filepath.Walk(fullPath, func(filePath string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			header, err := zip.FileInfoHeader(info)
			if err != nil {
				return err
			}

			relPath, _ := filepath.Rel(filepath.Dir(fullPath), filePath)
			header.Name = relPath

			if info.IsDir() {
				header.Name += "/"
			} else {
				header.Method = zip.Deflate
			}

			writer, err := zipWriter.CreateHeader(header)
			if err != nil {
				return err
			}

			if !info.IsDir() {
				file, err := os.Open(filePath)
				if err != nil {
					return err
				}
				defer file.Close()
				_, err = io.Copy(writer, file)
				return err
			}

			return nil
		})

		if err != nil {
			return err
		}
	}

	return nil
}

func (s *FileService) compressTarGz(paths []string, destPath string) error {
	file, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzWriter := gzip.NewWriter(file)
	defer gzWriter.Close()

	tarWriter := tar.NewWriter(gzWriter)
	defer tarWriter.Close()

	for _, path := range paths {
		fullPath := s.resolvePath(path)
		if !s.isPathAllowed(fullPath) {
			continue
		}

		err := filepath.Walk(fullPath, func(filePath string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			header, err := tar.FileInfoHeader(info, "")
			if err != nil {
				return err
			}

			relPath, _ := filepath.Rel(filepath.Dir(fullPath), filePath)
			header.Name = relPath

			if err := tarWriter.WriteHeader(header); err != nil {
				return err
			}

			if !info.IsDir() {
				file, err := os.Open(filePath)
				if err != nil {
					return err
				}
				defer file.Close()
				_, err = io.Copy(tarWriter, file)
				return err
			}

			return nil
		})

		if err != nil {
			return err
		}
	}

	return nil
}

func (s *FileService) decompressZip(archivePath, destPath string) error {
	reader, err := zip.OpenReader(archivePath)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		filePath := filepath.Join(destPath, file.Name)

		// Security check
		if !strings.HasPrefix(filePath, filepath.Clean(destPath)+string(os.PathSeparator)) {
			return ErrPathNotAllowed
		}

		if file.FileInfo().IsDir() {
			os.MkdirAll(filePath, file.Mode())
			continue
		}

		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			return err
		}

		dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			return err
		}

		srcFile, err := file.Open()
		if err != nil {
			dstFile.Close()
			return err
		}

		_, err = io.Copy(dstFile, srcFile)
		srcFile.Close()
		dstFile.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *FileService) decompressTarGz(archivePath, destPath string) error {
	file, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		filePath := filepath.Join(destPath, header.Name)

		// Security check
		if !strings.HasPrefix(filePath, filepath.Clean(destPath)+string(os.PathSeparator)) {
			return ErrPathNotAllowed
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(filePath, os.FileMode(header.Mode)); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
				return err
			}
			dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}
			if _, err := io.Copy(dstFile, tarReader); err != nil {
				dstFile.Close()
				return err
			}
			dstFile.Close()
		}
	}

	return nil
}

// Errors
var (
	ErrPathNotAllowed    = errors.New("path not allowed")
	ErrIsDirectory       = errors.New("path is a directory")
	ErrFileTooLarge      = errors.New("file is too large")
	ErrUnsupportedFormat = errors.New("unsupported archive format")
)



