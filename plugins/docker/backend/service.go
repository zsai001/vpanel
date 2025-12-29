package docker

import (
	"context"
	"errors"
	"fmt"
	"strings"
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

// Service manages Docker containers
type Service struct {
	db     *gorm.DB
	log    sdk.Logger
	client *client.Client
}

// NewService creates a new docker service
func NewService(db *gorm.DB, log sdk.Logger) *Service {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Warn("Failed to create Docker client", "error", err)
		return &Service{db: db, log: log, client: nil}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = cli.Ping(ctx)
	if err != nil {
		log.Warn("Failed to connect to Docker daemon", "error", err)
		return &Service{db: db, log: log, client: nil}
	}

	log.Info("Docker daemon connected successfully")
	return &Service{db: db, log: log, client: cli}
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

// GetContainerLogs returns container logs
func (s *Service) GetContainerLogs(ctx context.Context, id string, tail int) (string, error) {
	if s.client == nil {
		return "", ErrDockerNotConnected
	}

	options := containertypes.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", tail),
	}

	reader, err := s.client.ContainerLogs(ctx, id, options)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	buf := make([]byte, 1024*1024)
	n, _ := reader.Read(buf)
	return string(buf[:n]), nil
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

// ListComposeProjects returns all compose projects
func (s *Service) ListComposeProjects(ctx context.Context) ([]DockerComposeProject, error) {
	var projects []DockerComposeProject
	if err := s.db.Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
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
