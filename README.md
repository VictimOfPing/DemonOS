# DEMON OS v1.0

> Advanced Web Scraping Control Center with Apify Integration

![DemonOS](https://img.shields.io/badge/DemonOS-v1.0-8b5cf6?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)

## Overview

DemonOS is a cyberpunk-themed web application for managing and monitoring web scraping operations. It features a mod menu-style interface with Matrix rain effects, glitch animations, and a hacker aesthetic.

## Features

- **Dashboard** - Real-time monitoring with stats, activity feed, and radar view
- **Scraper Control** - Manage multiple Apify scrapers with start/stop/pause controls
- **Database Viewer** - Browse and export data stored in Supabase
- **Terminal** - Command-line interface for advanced operations
- **Notifications** - Toast system with glitch effects

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Font**: JetBrains Mono

## Visual Effects

- Matrix rain background (Canvas)
- CRT scanlines overlay
- Vignette effect
- Glitch text animations
- Neon glow effects
- Chromatic aberration
- Noise overlay

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── scraper/           # Scraper control page
│   ├── database/          # Database viewer page
│   └── terminal/          # Terminal page
├── components/
│   ├── background/        # Matrix rain, particles, scanlines
│   ├── layout/            # Sidebar, HUD, logo
│   ├── ui/                # Reusable UI components
│   └── dashboard/         # Dashboard-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Constants and utilities
└── styles/                # Global CSS and effects
```

## Color Palette

| Name       | Hex       | Usage              |
|------------|-----------|-------------------|
| Background | `#0a0a0f` | Main background   |
| Primary    | `#8b5cf6` | Accent color      |
| Accent     | `#c084fc` | Highlights        |
| Glow       | `#a855f7` | Neon effects      |
| Text       | `#e2e8f0` | Primary text      |
| Danger     | `#ef4444` | Errors            |
| Success    | `#22c55e` | Success states    |
| Warning    | `#f59e0b` | Warnings          |

## Keyboard Shortcuts

| Key | Action          |
|-----|-----------------|
| F1  | Dashboard       |
| F2  | Scraper Control |
| F3  | Database        |
| F4  | Terminal        |

## Future Integrations

- [ ] Apify API integration
- [ ] Supabase database connection
- [ ] Real-time scraping status via WebSockets
- [ ] Export functionality (CSV, JSON)
- [ ] User authentication

## License

MIT License - feel free to use this for your own projects!

---

Built with 🔮 by the shadows
