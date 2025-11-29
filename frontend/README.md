# Sentinel IA - Frontend React + TypeScript

Interface web moderne pour Sentinel IA avec streaming vidéo WebRTC temps réel.

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- npm 10+

### Installation
```bash
npm install
```

### Développement
```bash
npm run dev
```

L'application sera disponible sur http://localhost:5173

### Build Production
```bash
npm run build
```

### Preview Production
```bash
npm run preview
```

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── VideoPlayer/    # Lecteur vidéo WebRTC
│   ├── VideoGrid/      # Grille multi-caméras
│   ├── Dashboard/      # Tableau de bord
│   └── ui/             # Composants UI de base
├── pages/              # Pages/Routes
│   ├── Dashboard.tsx
│   ├── Cameras.tsx
│   └── Events.tsx
├── store/              # Redux store
│   ├── slices/
│   └── store.ts
├── services/           # Services API
│   ├── api.ts
│   ├── webrtc.ts
│   └── websocket.ts
├── types/              # Types TypeScript
├── hooks/              # Custom React hooks
└── utils/              # Fonctions utilitaires
```

## 🛠 Stack Technique

- **React 18** - UI Framework
- **TypeScript 5** - Typage fort
- **Vite** - Build tool rapide
- **Redux Toolkit** - State management
- **React Router 6** - Routing SPA
- **Tailwind CSS 3** - Styling
- **Socket.IO Client** - WebSocket
- **Simple-Peer** - WebRTC
- **React Query** - Data fetching

## 🎨 Composants Principaux

### VideoPlayer
Lecteur vidéo WebRTC avec contrôles.

```tsx
import { VideoPlayer } from '@/components/VideoPlayer';

<VideoPlayer
  cameraId="cam_01"
  onError={(error) => console.error(error)}
/>
```

### VideoGrid
Grille adaptative de caméras.

```tsx
import { VideoGrid } from '@/components/VideoGrid';

<VideoGrid
  cameras={cameras}
  layout="auto" // auto | 2x2 | 3x3 | 4x4
/>
```

## 🔧 Configuration

### Variables d'Environnement

Créer `.env.local`:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_WEBRTC_SERVER=ws://localhost:8080
```

## 📚 Scripts Disponibles

```bash
npm run dev          # Dev server (hot reload)
npm run build        # Build production
npm run preview      # Preview build
npm run lint         # Lint TypeScript
```

## 📖 Documentation

Voir [MIGRATION_REACT_WEBRTC.md](../Guides/MIGRATION_REACT_WEBRTC.md) pour l'architecture complète.

## 🤝 Contribution

1. Créer une branche: `git checkout -b feature/ma-feature`
2. Commit: `git commit -m "feat: description"`
3. Push: `git push origin feature/ma-feature`
4. Créer une Pull Request

## 📄 Licence

Propriétaire - Sentinel IA © 2025
