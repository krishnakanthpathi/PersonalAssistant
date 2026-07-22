---
type: system_environment
title: System Environment
description: Home lab setup, devices, network configuration, and local server setups.
tags: [systems, hardware, network]
timestamp: 2026-07-19T14:46:00Z
---

# System Environment

## Devices
- **MacBook Air M4**:
  - Role: Primary coding and development machine.
  - OS: macOS.
  - Storage: ~480 GB used.
- **HP Laptop**:
  - CPU: Intel i5-1135G7.
  - RAM: 8 GB.
  - Storage: 476 GB SSD.
  - OS: Windows 11 with Ubuntu running inside WSL2.
- **Mobile Phone**: Runs without a SIM card (uses Wi-Fi/Hotspot).
- **Home Wi-Fi Router**: Jio AirFiber internet service.

## Network Architecture
- **Tailscale Mesh VPN**: Installed on Mac, Linux server, and WSL environment to establish a secure peer-to-peer network.
- **Remote Host IP**: `100.105.203.102` (configured for remote passwordless SSH access).
- **Security Protocols**: Exposes services bound strictly to private network IPs rather than public interfaces (`0.0.0.0`).
- **IP Addressing**: Familiar with DHCP reservation, NAT routing, public/private IP segments, and Jio router port-forwarding steps.

## Server Configurations
- **WSL Ubuntu Server**:
  - Serves as the home lab node (named `test-stack`).
  - Runs MongoDB inside a Docker container using `docker-compose.yml` to avoid native database overhead.
  - Hosts the QueryPort backend and Redis sessions.
  - Exposes tunnels via Serveo (`krishna-server.serveo.net`).
- **Docker Toolchains**:
  - Active containers: `kokoro-tts` (Kokoro text-to-speech engine).
  - Uses `host.docker.internal` to let containers reach local services like Ollama.
- **reverse proxy**: Deployed using Nginx.
