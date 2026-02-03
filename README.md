# MosBot Dashboard

A self-hosted, dark-themed Kanban task management dashboard for autonomous AI agents.

![MosBot Dashboard](https://via.placeholder.com/1200x600/1e293b/60a5fa?text=MosBot+Dashboard)

## Features

- 🎯 **Kanban Board** - Drag-and-drop task management across TO DO, IN PROGRESS, DONE, and ARCHIVE columns
- 🎨 **Dark Theme** - Beautiful, modern UI optimized for extended use
- 🏷️ **Priority System** - Organize tasks with Low, Medium, High, and Urgent priorities
- 📅 **Due Dates** - Track deadlines with intuitive date pickers
- 👤 **Assignees** - Assign tasks to team members
- 📊 **Activity Log** - View all task activity and changes
- 📚 **Documentation** - Built-in docs for quick reference
- 🔒 **Self-Hosted** - Complete data ownership and privacy

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **React DnD** - Drag-and-drop functionality
- **Zustand** - Lightweight state management
- **Axios** - HTTP client for API calls
- **Heroicons** - Beautiful icon library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MosBot API backend running

### Installation

```bash
# Clone the repository
git clone https://github.com/mosufy/mosbot-dashboard.git
cd mosbot-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update API URL in .env
# VITE_API_URL=http://localhost:3000/api/v1
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t mosbot-dashboard:latest .

# Run container
docker run -p 8080:80 \
  -e VITE_API_URL=https://api.mosbot.example.com \
  mosbot-dashboard:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  dashboard:
    image: mosbot-dashboard:latest
    ports:
      - "8080:80"
    environment:
      - VITE_API_URL=http://api:3000/api/v1
    depends_on:
      - api
```

## Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests compatible with ArgoCD GitOps.

```bash
# Apply manifests
kubectl apply -k k8s/base/
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | MosBot API backend URL | `http://localhost:3000/api/v1` |
| `VITE_API_TIMEOUT` | API request timeout (ms) | `5000` |
| `VITE_APP_NAME` | Application name | `MosBot` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |

## Project Structure

```
mosbot-dashboard/
├── src/
│   ├── api/           # API client
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── stores/        # Zustand state stores
│   ├── utils/         # Utility functions
│   ├── App.jsx        # Main app component
│   ├── main.jsx       # Entry point
│   └── index.css      # Global styles
├── public/            # Static assets
├── k8s/               # Kubernetes manifests
├── Dockerfile         # Docker build config
├── nginx.conf         # Nginx config for production
└── vite.config.js     # Vite configuration
```

## Development Guidelines

### Adding New Features

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Build and verify: `npm run build && npm run preview`
4. Open PR to `develop` branch

### Code Style

- Use functional components with hooks
- Follow Tailwind utility-first approach
- Keep components small and focused
- Add JSDoc comments for complex functions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request to `develop`

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ by MosBot
