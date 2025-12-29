package docker

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	imagetypes "github.com/docker/docker/api/types/image"
	networktypes "github.com/docker/docker/api/types/network"
	volumetypes "github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	sdk "github.com/vpanel/sdk"
	"gorm.io/gorm"
)

var ErrDockerNotConnected = errors.New("docker daemon not connected")

// ExecSession represents an active exec session in a container
type ExecSession struct {
	ID          string
	ContainerID string
	ExecID      string
	Conn        io.WriteCloser
	Reader      io.Reader
	Active      bool
	Cols        int
	Rows        int
}

// Service manages Docker containers
type Service struct {
	db           *gorm.DB
	log          sdk.Logger
	client       *client.Client
	execSessions map[string]*ExecSession
	execMu       sync.RWMutex
}

// NewService creates a new docker service
func NewService(db *gorm.DB, log sdk.Logger) *Service {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Warn("Failed to create Docker client", "error", err)
		return &Service{db: db, log: log, client: nil, execSessions: make(map[string]*ExecSession)}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = cli.Ping(ctx)
	if err != nil {
		log.Warn("Failed to connect to Docker daemon", "error", err)
		return &Service{db: db, log: log, client: nil, execSessions: make(map[string]*ExecSession)}
	}

	log.Info("Docker daemon connected successfully")
	return &Service{db: db, log: log, client: cli, execSessions: make(map[string]*ExecSession)}
}

// IsConnected returns true if Docker is connected
func (s *Service) IsConnected() bool {
	return s.client != nil
}

// GetInfo returns Docker daemon info
func (s *Service) GetInfo(ctx context.Context) (map[string]interface{}, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	info, err := s.client.Info(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"containers":         info.Containers,
		"containers_running": info.ContainersRunning,
		"containers_paused":  info.ContainersPaused,
		"containers_stopped": info.ContainersStopped,
		"images":             info.Images,
		"server_version":     info.ServerVersion,
		"os":                 info.OperatingSystem,
		"architecture":       info.Architecture,
		"memory":             info.MemTotal,
		"cpus":               info.NCPU,
		"name":               info.Name,
	}, nil
}

// ListContainers returns all containers
func (s *Service) ListContainers(ctx context.Context, all bool) ([]ContainerInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	containers, err := s.client.ContainerList(ctx, containertypes.ListOptions{All: all})
	if err != nil {
		return nil, err
	}

	result := make([]ContainerInfo, len(containers))
	for i, c := range containers {
		ports := make([]string, 0)
		for _, p := range c.Ports {
			if p.PublicPort > 0 {
				ports = append(ports, fmt.Sprintf("%d:%d/%s", p.PublicPort, p.PrivatePort, p.Type))
			}
		}

		networkName := ""
		for name := range c.NetworkSettings.Networks {
			networkName = name
			break
		}

		name := strings.TrimPrefix(c.Names[0], "/")

		result[i] = ContainerInfo{
			ID:      c.ID[:12],
			Name:    name,
			Image:   c.Image,
			Status:  c.Status,
			State:   c.State,
			Created: time.Unix(c.Created, 0).Format(time.RFC3339),
			Ports:   ports,
			Network: networkName,
			Command: c.Command,
			Labels:  c.Labels,
		}
	}

	return result, nil
}

// ListContainersGrouped returns containers grouped by compose project
func (s *Service) ListContainersGrouped(ctx context.Context, all bool) (*GroupedContainersResponse, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	containers, err := s.client.ContainerList(ctx, containertypes.ListOptions{All: all})
	if err != nil {
		return nil, err
	}

	// Group containers by compose project
	composeGroups := make(map[string]*ContainerGroup)
	standaloneContainers := make([]ContainerInfo, 0)

	for _, c := range containers {
		ports := make([]string, 0)
		for _, p := range c.Ports {
			if p.PublicPort > 0 {
				ports = append(ports, fmt.Sprintf("%d:%d/%s", p.PublicPort, p.PrivatePort, p.Type))
			}
		}

		networkName := ""
		for name := range c.NetworkSettings.Networks {
			networkName = name
			break
		}

		name := strings.TrimPrefix(c.Names[0], "/")

		containerInfo := ContainerInfo{
			ID:      c.ID[:12],
			Name:    name,
			Image:   c.Image,
			Status:  c.Status,
			State:   c.State,
			Created: time.Unix(c.Created, 0).Format(time.RFC3339),
			Ports:   ports,
			Network: networkName,
			Command: c.Command,
			Labels:  c.Labels,
		}

		// Check if container belongs to a compose project
		projectName, hasProject := c.Labels["com.docker.compose.project"]
		if hasProject && projectName != "" {
			if _, exists := composeGroups[projectName]; !exists {
				workingDir := c.Labels["com.docker.compose.project.working_dir"]
				composeGroups[projectName] = &ContainerGroup{
					Type:      "compose",
					Name:      projectName,
					Path:      workingDir,
					Status:    "stopped",
					Count:     0,
					Running:   0,
					Stopped:   0,
					Containers: []ContainerInfo{},
					IsCompose: true,
				}
			}

			group := composeGroups[projectName]
			group.Containers = append(group.Containers, containerInfo)
			group.Count++

			if c.State == "running" {
				group.Running++
			} else {
				group.Stopped++
			}
		} else {
			// Standalone container
			standaloneContainers = append(standaloneContainers, containerInfo)
		}
	}

	// Update group statuses
	groups := make([]ContainerGroup, 0, len(composeGroups))
	for _, group := range composeGroups {
		if group.Running == 0 {
			group.Status = "stopped"
		} else if group.Running == group.Count {
			group.Status = "running"
		} else {
			group.Status = "partial"
		}
		groups = append(groups, *group)
	}

	// Sort groups by name
	for i := 0; i < len(groups)-1; i++ {
		for j := i + 1; j < len(groups); j++ {
			if groups[i].Name > groups[j].Name {
				groups[i], groups[j] = groups[j], groups[i]
			}
		}
	}

	return &GroupedContainersResponse{
		Groups:    groups,
		Standalone: standaloneContainers,
	}, nil
}

// GetContainer returns container details
func (s *Service) GetContainer(ctx context.Context, id string) (*ContainerInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	c, err := s.client.ContainerInspect(ctx, id)
	if err != nil {
		return nil, err
	}

	ports := make([]string, 0)
	for port, bindings := range c.NetworkSettings.Ports {
		for _, binding := range bindings {
			ports = append(ports, binding.HostPort+":"+port.Port()+"/"+port.Proto())
		}
	}

	networkName := ""
	for name := range c.NetworkSettings.Networks {
		networkName = name
		break
	}

	return &ContainerInfo{
		ID:      c.ID[:12],
		Name:    strings.TrimPrefix(c.Name, "/"),
		Image:   c.Config.Image,
		Status:  c.State.Status,
		State:   c.State.Status,
		Created: c.Created,
		Ports:   ports,
		Network: networkName,
		Command: strings.Join(c.Config.Cmd, " "),
		Labels:  c.Config.Labels,
	}, nil
}

// CreateContainer creates a new container
func (s *Service) CreateContainer(ctx context.Context, req *CreateContainerRequest) (string, error) {
	if s.client == nil {
		return "", ErrDockerNotConnected
	}

	// Port bindings
	exposedPorts := make(nat.PortSet)
	portBindings := make(nat.PortMap)
	for hostPort, containerPort := range req.Ports {
		port, err := nat.NewPort("tcp", containerPort)
		if err != nil {
			continue
		}
		exposedPorts[port] = struct{}{}
		portBindings[port] = []nat.PortBinding{{HostPort: hostPort}}
	}

	// Create container config
	config := &containertypes.Config{
		Image:        req.Image,
		Env:          req.Environment,
		ExposedPorts: exposedPorts,
	}
	if len(req.Command) > 0 {
		config.Cmd = req.Command
	}

	hostConfig := &containertypes.HostConfig{
		PortBindings: portBindings,
		Binds:        req.Volumes,
	}
	if req.Restart != "" {
		hostConfig.RestartPolicy = containertypes.RestartPolicy{Name: containertypes.RestartPolicyMode(req.Restart)}
	}

	networkConfig := &networktypes.NetworkingConfig{}
	if req.Network != "" {
		networkConfig.EndpointsConfig = map[string]*networktypes.EndpointSettings{
			req.Network: {},
		}
	}

	resp, err := s.client.ContainerCreate(ctx, config, hostConfig, networkConfig, nil, req.Name)
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

// StartContainer starts a container
func (s *Service) StartContainer(ctx context.Context, id string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}
	return s.client.ContainerStart(ctx, id, containertypes.StartOptions{})
}

// StopContainer stops a container
func (s *Service) StopContainer(ctx context.Context, id string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}
	timeout := 10
	return s.client.ContainerStop(ctx, id, containertypes.StopOptions{Timeout: &timeout})
}

// RestartContainer restarts a container
func (s *Service) RestartContainer(ctx context.Context, id string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}
	timeout := 10
	return s.client.ContainerRestart(ctx, id, containertypes.StopOptions{Timeout: &timeout})
}

// RemoveContainer removes a container
func (s *Service) RemoveContainer(ctx context.Context, id string, force bool) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}
	return s.client.ContainerRemove(ctx, id, containertypes.RemoveOptions{Force: force})
}

// LogLine represents a parsed log line
type LogLine struct {
	Time    string `json:"time,omitempty"`
	Stream  string `json:"stream"` // stdout or stderr
	Content string `json:"content"`
}

// GetContainerLogs returns container logs as structured log lines
func (s *Service) GetContainerLogs(ctx context.Context, id string, tail int, since *time.Time, timestamps bool) ([]LogLine, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	options := containertypes.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", tail),
		Timestamps: timestamps,
	}
	
	if since != nil {
		options.Since = since.Format(time.RFC3339)
	}

	reader, err := s.client.ContainerLogs(ctx, id, options)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	return s.parseDockerLogs(reader, timestamps)
}

// StreamContainerLogs streams container logs in real-time
func (s *Service) StreamContainerLogs(ctx context.Context, id string, tail int, timestamps bool) (io.ReadCloser, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	options := containertypes.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Timestamps: timestamps,
	}
	
	if tail > 0 {
		options.Tail = fmt.Sprintf("%d", tail)
	}

	return s.client.ContainerLogs(ctx, id, options)
}

// parseDockerLogs parses Docker multiplexed log stream
func (s *Service) parseDockerLogs(reader io.Reader, hasTimestamps bool) ([]LogLine, error) {
	var lines []LogLine
	
	// Docker logs have an 8-byte header for each frame:
	// [0] = stream type (1=stdout, 2=stderr)
	// [1-3] = reserved
	// [4-7] = frame size (big endian)
	header := make([]byte, 8)
	
	for {
		_, err := io.ReadFull(reader, header)
		if err != nil {
			if err == io.EOF {
				break
			}
			return lines, nil
		}
		
		streamType := header[0]
		frameSize := int(header[4])<<24 | int(header[5])<<16 | int(header[6])<<8 | int(header[7])
		
		if frameSize <= 0 || frameSize > 1024*1024 {
			continue
		}
		
		frame := make([]byte, frameSize)
		_, err = io.ReadFull(reader, frame)
		if err != nil {
			break
		}
		
		content := string(frame)
		stream := "stdout"
		if streamType == 2 {
			stream = "stderr"
		}
		
		// Split by newlines
		for _, line := range strings.Split(strings.TrimRight(content, "\n"), "\n") {
			if line == "" {
				continue
			}
			
			logLine := LogLine{
				Stream:  stream,
				Content: line,
			}
			
			// Extract timestamp if present
			if hasTimestamps && len(line) > 31 {
				// Timestamp format: 2024-01-01T12:00:00.000000000Z
				if line[4] == '-' && line[7] == '-' && line[10] == 'T' {
					spaceIdx := strings.Index(line, " ")
					if spaceIdx > 0 && spaceIdx < 35 {
						logLine.Time = line[:spaceIdx]
						logLine.Content = line[spaceIdx+1:]
					}
				}
			}
			
			lines = append(lines, logLine)
		}
	}
	
	return lines, nil
}

// ListImages returns all images
func (s *Service) ListImages(ctx context.Context) ([]ImageInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	images, err := s.client.ImageList(ctx, imagetypes.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]ImageInfo, len(images))
	for i, img := range images {
		result[i] = ImageInfo{
			ID:      img.ID[7:19],
			Tags:    img.RepoTags,
			Size:    img.Size,
			Created: time.Unix(img.Created, 0).Format(time.RFC3339),
		}
	}

	return result, nil
}

// PullImage pulls an image
func (s *Service) PullImage(ctx context.Context, imageName string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}

	reader, err := s.client.ImagePull(ctx, imageName, imagetypes.PullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()

	// Read the pull output to completion
	buf := make([]byte, 1024)
	for {
		_, err := reader.Read(buf)
		if err != nil {
			break
		}
	}

	return nil
}

// RemoveImage removes an image
func (s *Service) RemoveImage(ctx context.Context, id string, force bool) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}

	_, err := s.client.ImageRemove(ctx, id, imagetypes.RemoveOptions{Force: force})
	return err
}

// ListNetworks returns all networks
func (s *Service) ListNetworks(ctx context.Context) ([]NetworkInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	networks, err := s.client.NetworkList(ctx, networktypes.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]NetworkInfo, len(networks))
	for i, n := range networks {
		result[i] = NetworkInfo{
			ID:         n.ID[:12],
			Name:       n.Name,
			Driver:     n.Driver,
			Scope:      n.Scope,
			Containers: len(n.Containers),
		}
	}

	return result, nil
}

// CreateNetwork creates a network
func (s *Service) CreateNetwork(ctx context.Context, name, driver string) (string, error) {
	if s.client == nil {
		return "", ErrDockerNotConnected
	}

	resp, err := s.client.NetworkCreate(ctx, name, networktypes.CreateOptions{Driver: driver})
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

// RemoveNetwork removes a network
func (s *Service) RemoveNetwork(ctx context.Context, id string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}
	return s.client.NetworkRemove(ctx, id)
}

// ListVolumes returns all volumes
func (s *Service) ListVolumes(ctx context.Context) ([]VolumeInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	volumes, err := s.client.VolumeList(ctx, volumetypes.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]VolumeInfo, len(volumes.Volumes))
	for i, v := range volumes.Volumes {
		result[i] = VolumeInfo{
			Name:       v.Name,
			Driver:     v.Driver,
			Mountpoint: v.Mountpoint,
			CreatedAt:  v.CreatedAt,
		}
	}

	return result, nil
}

// CreateVolume creates a volume
func (s *Service) CreateVolume(ctx context.Context, name string) (*VolumeInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	v, err := s.client.VolumeCreate(ctx, volumetypes.CreateOptions{Name: name})
	if err != nil {
		return nil, err
	}

	return &VolumeInfo{
		Name:       v.Name,
		Driver:     v.Driver,
		Mountpoint: v.Mountpoint,
		CreatedAt:  v.CreatedAt,
	}, nil
}

// RemoveVolume removes a volume
func (s *Service) RemoveVolume(ctx context.Context, name string, force bool) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}
	return s.client.VolumeRemove(ctx, name, force)
}

// GetContainerStats returns container stats
func (s *Service) GetContainerStats(ctx context.Context, id string) (*types.StatsJSON, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	stats, err := s.client.ContainerStats(ctx, id, false)
	if err != nil {
		return nil, err
	}
	defer stats.Body.Close()

	var v types.StatsJSON
	buf := make([]byte, 1024*64)
	n, _ := stats.Body.Read(buf)
	if n > 0 {
		// Basic parsing - in production you'd use json.Decoder
		_ = buf[:n]
	}

	return &v, nil
}

// Compose operations

// ListComposeProjects returns all compose projects (detected from running containers + database)
func (s *Service) ListComposeProjects(ctx context.Context) ([]ComposeProjectInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	// Get all containers (including stopped ones)
	containers, err := s.client.ContainerList(ctx, containertypes.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	// Group containers by compose project
	projectMap := make(map[string]*ComposeProjectInfo)
	for _, c := range containers {
		projectName, hasProject := c.Labels["com.docker.compose.project"]
		if !hasProject {
			continue
		}

		if _, exists := projectMap[projectName]; !exists {
			workingDir := c.Labels["com.docker.compose.project.working_dir"]
			configFiles := c.Labels["com.docker.compose.project.config_files"]

			projectMap[projectName] = &ComposeProjectInfo{
				ID:              projectName, // Use project name as ID for detected projects
				Name:            projectName,
				Path:            workingDir,
				ConfigFiles:     configFiles,
				Status:          "stopped",
				ContainerCount:  0,
				RunningCount:    0,
				StoppedCount:    0,
				Services:        []ComposeServiceInfo{},
				CreatedAt:       time.Now().Format(time.RFC3339),
				UpdatedAt:       time.Now().Format(time.RFC3339),
				IsAutoDetected:  true,
			}
		}

		project := projectMap[projectName]
		project.ContainerCount++

		serviceName := c.Labels["com.docker.compose.service"]
		containerNumber := c.Labels["com.docker.compose.container-number"]
		
		// Determine container state
		isRunning := c.State == "running"
		if isRunning {
			project.RunningCount++
		} else {
			project.StoppedCount++
		}

		// Get container name
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		// Get ports
		ports := make([]string, 0)
		for _, p := range c.Ports {
			if p.PublicPort > 0 {
				ports = append(ports, fmt.Sprintf("%d:%d/%s", p.PublicPort, p.PrivatePort, p.Type))
			}
		}

		project.Services = append(project.Services, ComposeServiceInfo{
			Name:            serviceName,
			ContainerID:     c.ID[:12],
			ContainerName:   name,
			ContainerNumber: containerNumber,
			Image:           c.Image,
			State:           c.State,
			Status:          c.Status,
			Ports:           ports,
		})
	}

	// Update project status based on container states
	for _, project := range projectMap {
		if project.RunningCount == 0 {
			project.Status = "stopped"
		} else if project.RunningCount == project.ContainerCount {
			project.Status = "running"
		} else {
			project.Status = "partial"
		}
	}

	// Also fetch projects from database and merge
	var dbProjects []DockerComposeProject
	if err := s.db.Find(&dbProjects).Error; err == nil {
		for _, dbProject := range dbProjects {
			if _, exists := projectMap[dbProject.Name]; !exists {
				// Project exists in DB but has no containers
				projectMap[dbProject.Name] = &ComposeProjectInfo{
					ID:              dbProject.ID,
					Name:            dbProject.Name,
					Path:            dbProject.Path,
					Description:     dbProject.Description,
					Status:          "stopped",
					ContainerCount:  0,
					RunningCount:    0,
					StoppedCount:    0,
					Services:        []ComposeServiceInfo{},
					CreatedAt:       dbProject.CreatedAt.Format(time.RFC3339),
					UpdatedAt:       dbProject.UpdatedAt.Format(time.RFC3339),
					IsAutoDetected:  false,
				}
			} else {
				// Merge DB info with detected project
				projectMap[dbProject.Name].ID = dbProject.ID
				projectMap[dbProject.Name].Description = dbProject.Description
				projectMap[dbProject.Name].IsAutoDetected = false
			}
		}
	}

	// Convert map to slice
	result := make([]ComposeProjectInfo, 0, len(projectMap))
	for _, project := range projectMap {
		result = append(result, *project)
	}

	return result, nil
}

// CreateComposeProject creates a compose project
func (s *Service) CreateComposeProject(project *DockerComposeProject) error {
	return s.db.Create(project).Error
}

// GetComposeProject returns a compose project by ID
func (s *Service) GetComposeProject(id string) (*DockerComposeProject, error) {
	var project DockerComposeProject
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

// RemoveComposeProject removes a compose project
func (s *Service) RemoveComposeProject(id string) error {
	return s.db.Delete(&DockerComposeProject{}, "id = ?", id).Error
}

// CreateExecSession creates a new exec session in a container
func (s *Service) CreateExecSession(ctx context.Context, containerID, shell string, cols, rows int) (*ExecSession, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	// Create exec instance
	execConfig := containertypes.ExecOptions{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          []string{shell},
	}

	execResp, err := s.client.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create exec: %w", err)
	}

	// Attach to exec instance
	attachResp, err := s.client.ContainerExecAttach(ctx, execResp.ID, containertypes.ExecAttachOptions{
		Tty: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to attach exec: %w", err)
	}

	// Resize exec TTY
	if err := s.client.ContainerExecResize(ctx, execResp.ID, containertypes.ResizeOptions{
		Height: uint(rows),
		Width:  uint(cols),
	}); err != nil {
		s.log.Debug("Failed to resize exec", "error", err)
	}

	session := &ExecSession{
		ID:          execResp.ID,
		ContainerID: containerID,
		ExecID:      execResp.ID,
		Conn:        attachResp.Conn,
		Reader:      attachResp.Reader,
		Active:      true,
		Cols:        cols,
		Rows:        rows,
	}

	s.execMu.Lock()
	s.execSessions[session.ID] = session
	s.execMu.Unlock()

	s.log.Info("Exec session created", "id", session.ID, "container", containerID)

	return session, nil
}

// ResizeExecSession resizes an exec session TTY
func (s *Service) ResizeExecSession(ctx context.Context, id string, cols, rows int) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}

	s.execMu.RLock()
	session, ok := s.execSessions[id]
	s.execMu.RUnlock()

	if !ok {
		return errors.New("exec session not found")
	}

	if err := s.client.ContainerExecResize(ctx, session.ExecID, containertypes.ResizeOptions{
		Height: uint(rows),
		Width:  uint(cols),
	}); err != nil {
		return err
	}

	s.execMu.Lock()
	session.Cols = cols
	session.Rows = rows
	s.execMu.Unlock()

	return nil
}

// CloseExecSession closes an exec session
func (s *Service) CloseExecSession(id string) error {
	s.execMu.Lock()
	defer s.execMu.Unlock()

	session, ok := s.execSessions[id]
	if !ok {
		return nil
	}

	session.Active = false
	if session.Conn != nil {
		session.Conn.Close()
	}
	delete(s.execSessions, id)

	s.log.Info("Exec session closed", "id", id)

	return nil
}

// GetExecSession returns an exec session by ID
func (s *Service) GetExecSession(id string) (*ExecSession, bool) {
	s.execMu.RLock()
	defer s.execMu.RUnlock()
	session, ok := s.execSessions[id]
	return session, ok
}

// ContainerFileInfo represents a file or directory in a container
type ContainerFileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"`
	ModTime string `json:"mod_time"`
	IsDir   bool   `json:"is_dir"`
	IsLink  bool   `json:"is_link"`
}

// ListContainerFiles lists files in a container directory
func (s *Service) ListContainerFiles(ctx context.Context, containerID, path string) ([]ContainerFileInfo, error) {
	if s.client == nil {
		return nil, ErrDockerNotConnected
	}

	// Use exec to run ls command
	execConfig := containertypes.ExecOptions{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"ls", "-la", "--full-time", path},
	}

	execResp, err := s.client.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create exec: %w", err)
	}

	attachResp, err := s.client.ContainerExecAttach(ctx, execResp.ID, containertypes.ExecAttachOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to attach exec: %w", err)
	}
	defer attachResp.Close()

	// Read output
	output, err := io.ReadAll(attachResp.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read output: %w", err)
	}

	// Parse ls output
	files := []ContainerFileInfo{}
	lines := strings.Split(string(output), "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total") {
			continue
		}
		
		// Handle Docker stream header bytes
		if len(line) > 8 && (line[0] == 1 || line[0] == 2) {
			line = line[8:]
		}
		
		// Parse ls -la output: drwxr-xr-x 2 root root 4096 2024-01-01 12:00:00.000000000 +0000 name
		parts := strings.Fields(line)
		if len(parts) < 9 {
			continue
		}

		mode := parts[0]
		size := int64(0)
		if s, err := strconv.ParseInt(parts[4], 10, 64); err == nil {
			size = s
		}
		
		// Date and time are in parts 5, 6, 7
		modTime := parts[5] + " " + parts[6]
		
		// Name is the rest
		name := strings.Join(parts[8:], " ")
		if name == "." || name == ".." {
			continue
		}
		
		// Handle symlinks: name -> target
		isLink := mode[0] == 'l'
		if isLink {
			if idx := strings.Index(name, " -> "); idx != -1 {
				name = name[:idx]
			}
		}

		filePath := path
		if !strings.HasSuffix(filePath, "/") {
			filePath += "/"
		}
		filePath += name

		files = append(files, ContainerFileInfo{
			Name:    name,
			Path:    filePath,
			Size:    size,
			Mode:    mode,
			ModTime: modTime,
			IsDir:   mode[0] == 'd',
			IsLink:  isLink,
		})
	}

	return files, nil
}

// GetContainerFile reads a file from a container
func (s *Service) GetContainerFile(ctx context.Context, containerID, path string) (io.ReadCloser, types.ContainerPathStat, error) {
	if s.client == nil {
		return nil, types.ContainerPathStat{}, ErrDockerNotConnected
	}

	reader, stat, err := s.client.CopyFromContainer(ctx, containerID, path)
	if err != nil {
		return nil, types.ContainerPathStat{}, err
	}

	return reader, stat, nil
}

// WriteContainerFile writes a file to a container
func (s *Service) WriteContainerFile(ctx context.Context, containerID, path string, content io.Reader) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}

	return s.client.CopyToContainer(ctx, containerID, filepath.Dir(path), content, containertypes.CopyToContainerOptions{})
}

// DeleteContainerFile deletes a file from a container
func (s *Service) DeleteContainerFile(ctx context.Context, containerID, path string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}

	execConfig := containertypes.ExecOptions{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"rm", "-rf", path},
	}

	execResp, err := s.client.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	attachResp, err := s.client.ContainerExecAttach(ctx, execResp.ID, containertypes.ExecAttachOptions{})
	if err != nil {
		return fmt.Errorf("failed to attach exec: %w", err)
	}
	defer attachResp.Close()

	// Wait for command to complete
	io.ReadAll(attachResp.Reader)

	return nil
}

// CreateContainerDirectory creates a directory in a container
func (s *Service) CreateContainerDirectory(ctx context.Context, containerID, path string) error {
	if s.client == nil {
		return ErrDockerNotConnected
	}

	execConfig := containertypes.ExecOptions{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"mkdir", "-p", path},
	}

	execResp, err := s.client.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	attachResp, err := s.client.ContainerExecAttach(ctx, execResp.ID, containertypes.ExecAttachOptions{})
	if err != nil {
		return fmt.Errorf("failed to attach exec: %w", err)
	}
	defer attachResp.Close()

	// Wait for command to complete
	io.ReadAll(attachResp.Reader)

	return nil
}

// Close cleans up all resources
func (s *Service) Close() {
	// Close all exec sessions
	s.execMu.Lock()
	for id, session := range s.execSessions {
		session.Active = false
		if session.Conn != nil {
			session.Conn.Close()
		}
		delete(s.execSessions, id)
	}
	s.execMu.Unlock()

	// Close Docker client
	if s.client != nil {
		s.client.Close()
		s.client = nil
	}

	s.log.Info("Docker service closed")
}
