package docker

import (
	"archive/tar"
	"bytes"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Control message prefix for resize commands
const resizePrefix = '\x01'

// containerExec handles WebSocket connection for container exec
func (p *Plugin) containerExec(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container ID required"})
		return
	}

	// Verify container exists and is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}

	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		p.Log().Error("WebSocket upgrade failed", "error", err)
		return
	}
	defer conn.Close()

	// Parse initial terminal size from query parameters
	cols, _ := strconv.Atoi(c.DefaultQuery("cols", "80"))
	rows, _ := strconv.Atoi(c.DefaultQuery("rows", "24"))
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	// Get shell command (default to /bin/sh for compatibility)
	shell := c.DefaultQuery("shell", "/bin/sh")

	// Create exec session in container
	execSession, err := p.service.CreateExecSession(c.Request.Context(), containerID, shell, cols, rows)
	if err != nil {
		p.Log().Error("Failed to create exec session", "error", err)
		conn.WriteMessage(websocket.TextMessage, []byte("Failed to create session: "+err.Error()))
		return
	}
	defer p.service.CloseExecSession(execSession.ID)

	// Channel to signal connection close
	done := make(chan struct{})

	// Read from container and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			select {
			case <-done:
				return
			default:
				n, err := execSession.Reader.Read(buf)
				if err != nil {
					if err != io.EOF {
						p.Log().Debug("Exec read error", "error", err)
					}
					return
				}
				if err := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					p.Log().Debug("WebSocket write error", "error", err)
					return
				}
			}
		}
	}()

	// Read from WebSocket and write to container
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				p.Log().Debug("WebSocket read error", "error", err)
			}
			close(done)
			return
		}

		// Check for resize message (starts with \x01)
		if len(msg) > 0 && msg[0] == resizePrefix {
			// Parse resize message: \x01<cols>;<rows>
			resizeData := string(msg[1:])
			parts := strings.Split(resizeData, ";")
			if len(parts) == 2 {
				newCols, err1 := strconv.Atoi(parts[0])
				newRows, err2 := strconv.Atoi(parts[1])
				if err1 == nil && err2 == nil && newCols > 0 && newRows > 0 {
					if err := p.service.ResizeExecSession(c.Request.Context(), execSession.ID, newCols, newRows); err != nil {
						p.Log().Debug("Failed to resize exec", "error", err)
					}
				}
			}
			continue
		}

		// Regular input - write to container
		if _, err := execSession.Conn.Write(msg); err != nil {
			p.Log().Debug("Exec write error", "error", err)
			close(done)
			return
		}
	}
}

// getInfo returns Docker daemon info
func (p *Plugin) getInfo(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	info, err := p.service.GetInfo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": info})
}

// listContainers returns all containers
func (p *Plugin) listContainers(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	all := c.Query("all") == "true"
	grouped := c.Query("grouped") == "true"
	
	if grouped {
		groupedData, err := p.service.ListContainersGrouped(c.Request.Context(), all)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": groupedData})
		return
	}

	containers, err := p.service.ListContainers(c.Request.Context(), all)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": containers})
}

// getContainer returns container details
func (p *Plugin) getContainer(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	id := c.Param("id")
	container, err := p.service.GetContainer(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": container})
}

// createContainer creates a new container
func (p *Plugin) createContainer(c *gin.Context) {
	var req CreateContainerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	id, err := p.service.CreateContainer(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

// startContainer starts a container
func (p *Plugin) startContainer(c *gin.Context) {
	id := c.Param("id")
	if err := p.service.StartContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Container started"})
}

// stopContainer stops a container
func (p *Plugin) stopContainer(c *gin.Context) {
	id := c.Param("id")
	if err := p.service.StopContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Container stopped"})
}

// restartContainer restarts a container
func (p *Plugin) restartContainer(c *gin.Context) {
	id := c.Param("id")
	if err := p.service.RestartContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Container restarted"})
}

// removeContainer removes a container
func (p *Plugin) removeContainer(c *gin.Context) {
	id := c.Param("id")
	force := c.Query("force") == "true"
	if err := p.service.RemoveContainer(c.Request.Context(), id, force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Container removed"})
}

// containerLogs returns container logs
func (p *Plugin) containerLogs(c *gin.Context) {
	id := c.Param("id")
	
	// Parse query parameters
	tail := 500
	if t := c.Query("tail"); t != "" {
		if parsed, err := strconv.Atoi(t); err == nil && parsed > 0 {
			tail = parsed
		}
	}
	
	var since *time.Time
	if s := c.Query("since"); s != "" {
		if parsed, err := time.Parse(time.RFC3339, s); err == nil {
			since = &parsed
		}
	}
	
	timestamps := c.Query("timestamps") == "true"
	
	logs, err := p.service.GetContainerLogs(c.Request.Context(), id, tail, since, timestamps)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": logs})
}

// containerLogsStream handles WebSocket connection for streaming container logs
func (p *Plugin) containerLogsStream(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container ID required"})
		return
	}

	// Verify container exists
	_, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		p.Log().Error("WebSocket upgrade failed", "error", err)
		return
	}
	defer conn.Close()

	// Parse parameters
	tail, _ := strconv.Atoi(c.DefaultQuery("tail", "100"))
	if tail <= 0 {
		tail = 100
	}
	timestamps := c.Query("timestamps") == "true"

	// Get log stream
	logReader, err := p.service.StreamContainerLogs(c.Request.Context(), containerID, tail, timestamps)
	if err != nil {
		p.Log().Error("Failed to stream logs", "error", err)
		conn.WriteJSON(gin.H{"error": err.Error()})
		return
	}
	defer logReader.Close()

	// Channel to signal connection close
	done := make(chan struct{})

	// Handle client disconnect
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				close(done)
				return
			}
		}
	}()

	// Stream logs to client
	// Docker logs have an 8-byte header for each frame
	header := make([]byte, 8)
	
	for {
		select {
		case <-done:
			return
		case <-c.Request.Context().Done():
			return
		default:
			_, err := io.ReadFull(logReader, header)
			if err != nil {
				if err != io.EOF {
					p.Log().Debug("Log read error", "error", err)
				}
				return
			}

			streamType := header[0]
			frameSize := int(header[4])<<24 | int(header[5])<<16 | int(header[6])<<8 | int(header[7])

			if frameSize <= 0 || frameSize > 1024*1024 {
				continue
			}

			frame := make([]byte, frameSize)
			_, err = io.ReadFull(logReader, frame)
			if err != nil {
				return
			}

			content := string(frame)
			stream := "stdout"
			if streamType == 2 {
				stream = "stderr"
			}

			// Split by newlines and send each line
			for _, line := range strings.Split(strings.TrimRight(content, "\n"), "\n") {
				if line == "" {
					continue
				}

				logLine := gin.H{
					"stream":  stream,
					"content": line,
				}

				// Extract timestamp if present
				if timestamps && len(line) > 31 {
					if line[4] == '-' && line[7] == '-' && line[10] == 'T' {
						spaceIdx := strings.Index(line, " ")
						if spaceIdx > 0 && spaceIdx < 35 {
							logLine["time"] = line[:spaceIdx]
							logLine["content"] = line[spaceIdx+1:]
						}
					}
				}

				if err := conn.WriteJSON(logLine); err != nil {
					p.Log().Debug("WebSocket write error", "error", err)
					return
				}
			}
		}
	}
}

// containerStats returns container stats
func (p *Plugin) containerStats(c *gin.Context) {
	id := c.Param("id")
	stats, err := p.service.GetContainerStats(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

// listImages returns all images
func (p *Plugin) listImages(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	images, err := p.service.ListImages(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": images})
}

// pullImage pulls an image
func (p *Plugin) pullImage(c *gin.Context) {
	var req struct {
		Image string `json:"image" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if err := p.service.PullImage(c.Request.Context(), req.Image); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Image pulled"})
}

// removeImage removes an image
func (p *Plugin) removeImage(c *gin.Context) {
	id := c.Param("id")
	force := c.Query("force") == "true"
	if err := p.service.RemoveImage(c.Request.Context(), id, force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Image removed"})
}

// listNetworks returns all networks
func (p *Plugin) listNetworks(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	networks, err := p.service.ListNetworks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": networks})
}

// createNetwork creates a network
func (p *Plugin) createNetwork(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		Driver string `json:"driver"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if req.Driver == "" {
		req.Driver = "bridge"
	}

	id, err := p.service.CreateNetwork(c.Request.Context(), req.Name, req.Driver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

// removeNetwork removes a network
func (p *Plugin) removeNetwork(c *gin.Context) {
	id := c.Param("id")
	if err := p.service.RemoveNetwork(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Network removed"})
}

// listVolumes returns all volumes
func (p *Plugin) listVolumes(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	volumes, err := p.service.ListVolumes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": volumes})
}

// createVolume creates a volume
func (p *Plugin) createVolume(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	volume, err := p.service.CreateVolume(c.Request.Context(), req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": volume})
}

// removeVolume removes a volume
func (p *Plugin) removeVolume(c *gin.Context) {
	id := c.Param("id")
	force := c.Query("force") == "true"
	if err := p.service.RemoveVolume(c.Request.Context(), id, force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Volume removed"})
}

// Compose handlers

// listComposeProjects returns all compose projects (detected + registered)
func (p *Plugin) listComposeProjects(c *gin.Context) {
	if !p.service.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Docker daemon not connected",
		})
		return
	}

	projects, err := p.service.ListComposeProjects(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": projects})
}

// createComposeProject creates a compose project
func (p *Plugin) createComposeProject(c *gin.Context) {
	var project DockerComposeProject
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if err := p.service.CreateComposeProject(&project); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": project})
}

// removeComposeProject removes a compose project
func (p *Plugin) removeComposeProject(c *gin.Context) {
	id := c.Param("id")
	if err := p.service.RemoveComposeProject(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Project removed"})
}

// composeUp starts a compose project (placeholder)
func (p *Plugin) composeUp(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Compose up initiated"})
}

// composeDown stops a compose project (placeholder)
func (p *Plugin) composeDown(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Compose down initiated"})
}

// File browser handlers

// listContainerFiles lists files in a container directory
func (p *Plugin) listContainerFiles(c *gin.Context) {
	containerID := c.Param("id")
	path := c.DefaultQuery("path", "/")

	// Verify container is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}
	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	files, err := p.service.ListContainerFiles(c.Request.Context(), containerID, path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": files, "path": path})
}

// downloadContainerFile downloads a file from a container
func (p *Plugin) downloadContainerFile(c *gin.Context) {
	containerID := c.Param("id")
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Path required"})
		return
	}

	// Verify container is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}
	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	reader, stat, err := p.service.GetContainerFile(c.Request.Context(), containerID, path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer reader.Close()

	// Docker returns tar archive, extract the file
	tarReader := tar.NewReader(reader)
	header, err := tarReader.Next()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to read file"})
		return
	}

	// Set response headers
	filename := filepath.Base(path)
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Header("Content-Type", "application/octet-stream")
	if header.Size > 0 {
		c.Header("Content-Length", strconv.FormatInt(header.Size, 10))
	}

	// Stream file content
	io.Copy(c.Writer, tarReader)
	_ = stat // stat available if needed
}

// getContainerFileContent reads file content for viewing
func (p *Plugin) getContainerFileContent(c *gin.Context) {
	containerID := c.Param("id")
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Path required"})
		return
	}

	// Verify container is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}
	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	reader, _, err := p.service.GetContainerFile(c.Request.Context(), containerID, path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer reader.Close()

	// Docker returns tar archive, extract the file
	tarReader := tar.NewReader(reader)
	header, err := tarReader.Next()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to read file"})
		return
	}

	// Limit file size for viewing (max 1MB)
	maxSize := int64(1024 * 1024)
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "File too large to view (max 1MB)"})
		return
	}

	content, err := io.ReadAll(io.LimitReader(tarReader, maxSize))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to read file content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"content": string(content),
			"size":    header.Size,
			"name":    filepath.Base(path),
			"path":    path,
		},
	})
}

// uploadContainerFile uploads a file to a container
func (p *Plugin) uploadContainerFile(c *gin.Context) {
	containerID := c.Param("id")
	destPath := c.Query("path")
	if destPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Destination path required"})
		return
	}

	// Verify container is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}
	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to read uploaded file"})
		return
	}

	// Create tar archive
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)

	filename := header.Filename
	if filename == "" {
		filename = filepath.Base(destPath)
	}

	hdr := &tar.Header{
		Name: filename,
		Mode: 0644,
		Size: int64(len(content)),
	}
	if err := tw.WriteHeader(hdr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to create archive"})
		return
	}
	if _, err := tw.Write(content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to write archive"})
		return
	}
	tw.Close()

	// Upload to container
	if err := p.service.WriteContainerFile(c.Request.Context(), containerID, destPath, &buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "File uploaded"})
}

// deleteContainerFile deletes a file from a container
func (p *Plugin) deleteContainerFile(c *gin.Context) {
	containerID := c.Param("id")
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Path required"})
		return
	}

	// Safety check: don't allow deleting critical paths
	criticalPaths := []string{"/", "/bin", "/sbin", "/lib", "/lib64", "/usr", "/etc", "/var", "/root", "/home"}
	for _, cp := range criticalPaths {
		if path == cp {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Cannot delete critical system path"})
			return
		}
	}

	// Verify container is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}
	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	if err := p.service.DeleteContainerFile(c.Request.Context(), containerID, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "File deleted"})
}

// createContainerDirectory creates a directory in a container
func (p *Plugin) createContainerDirectory(c *gin.Context) {
	containerID := c.Param("id")
	
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Path required"})
		return
	}

	// Verify container is running
	container, err := p.service.GetContainer(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Container not found"})
		return
	}
	if container.State != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Container is not running"})
		return
	}

	if err := p.service.CreateContainerDirectory(c.Request.Context(), containerID, req.Path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Directory created"})
}
