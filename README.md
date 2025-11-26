# Hardcore Ninja

[![Play Now](https://img.shields.io/badge/Play%20Now-ninja.orkun.io-brightgreen?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik04IDVWMTlMMTkgMTJMOCA1WiIvPjwvc3ZnPg==)](https://ninja.orkun.io)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.181-blue?style=for-the-badge&logo=three.js)](https://threejs.org/)

A multiplayer 3D ninja battle game where players can use various skills to defeat opponents in an arena.

## Features

- 🎮 Real-time multiplayer gameplay
- 🥷 Ninja-themed characters with unique abilities
- 🔮 Multiple skills: Teleport, Homing Missile, Laser Beam, Invincibility
- 🌐 Peer-to-peer networking for low-latency gameplay
- 🎵 Dynamic sound effects and background music
- 📱 Responsive design for various screen sizes

## Tech Stack

- **Frontend**: React 19, TypeScript
- **3D Rendering**: Three.js
- **Networking**: PeerJS for WebRTC connections
- **UI Components**: Mantine
- **Build Tools**: Vite, PNPM
- **Deployment**: Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js >=22.12.0
- PNPM 10.0.0+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Orkuncakilkaya/hardcore-ninja.git
   cd hardcore-ninja
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, the development process, and standards.

## Deployment

This project is automatically deployed to Cloudflare Pages. Each pull request gets a preview deployment, and merges to main are deployed to production.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0) - see the LICENSE file for details.

## Acknowledgements

- [Three.js](https://threejs.org/) for 3D rendering
- [PeerJS](https://peerjs.com/) for WebRTC connections
- [Mantine](https://mantine.dev/) for UI components
- [Vite](https://vitejs.dev/) for fast development and building
