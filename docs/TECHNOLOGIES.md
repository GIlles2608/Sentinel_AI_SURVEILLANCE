# Technologies utilisées - Sentinel IA

Ce document présente les technologies utilisées dans le projet Sentinel IA avec leurs rôles et caractéristiques.

---

## Frontend

### React 19
**Framework JavaScript pour la création d'interfaces utilisateur**

React permet de construire des interfaces utilisateur interactives en découpant l'UI en composants réutilisables. Il utilise un DOM virtuel pour optimiser les performances de rendu.

- **Rôle dans Sentinel :** Construction de l'interface utilisateur (dashboard, pages caméras, événements)
- **Site :** [react.dev](https://react.dev/)

### TypeScript
**Superset typé de JavaScript**

TypeScript ajoute un système de types statiques à JavaScript, permettant de détecter les erreurs à la compilation plutôt qu'à l'exécution.

- **Rôle dans Sentinel :** Typage fort des composants, props, et états pour une meilleure maintenabilité
- **Site :** [typescriptlang.org](https://www.typescriptlang.org/)

### Redux Toolkit
**Bibliothèque de gestion d'état**

Redux centralise l'état de l'application dans un store unique, facilitant la gestion des données partagées entre composants.

- **Rôle dans Sentinel :** Gestion de l'état global (utilisateur connecté, liste des caméras, événements)
- **Site :** [redux-toolkit.js.org](https://redux-toolkit.js.org/)

### Tailwind CSS
**Framework CSS utilitaire**

Tailwind propose des classes utilitaires pour styliser rapidement les composants sans écrire de CSS personnalisé.

- **Rôle dans Sentinel :** Styling de l'interface utilisateur avec un design moderne et responsive
- **Site :** [tailwindcss.com](https://tailwindcss.com/)

### Vite
**Outil de build rapide pour le développement web**

Vite offre un serveur de développement ultra-rapide avec Hot Module Replacement (HMR) et un bundling optimisé pour la production.

- **Rôle dans Sentinel :** Build du frontend React, serveur de développement
- **Site :** [vitejs.dev](https://vitejs.dev/)

---

## Backend

### FastAPI
**Framework web Python haute performance**

FastAPI est un framework moderne pour créer des APIs REST avec Python. Il supporte nativement l'asynchrone et génère automatiquement une documentation OpenAPI.

- **Rôle dans Sentinel :** API REST pour l'authentification, gestion des caméras, événements
- **Avantages :** Asynchrone, validation automatique, documentation Swagger auto-générée
- **Site :** [fastapi.tiangolo.com](https://fastapi.tiangolo.com/)

### SQLAlchemy 2.0
**ORM (Object-Relational Mapping) pour Python**

SQLAlchemy permet d'interagir avec les bases de données en utilisant des objets Python plutôt que des requêtes SQL brutes.

- **Rôle dans Sentinel :** Modèles de données (User, Camera, Session), requêtes asynchrones
- **Mode :** Async avec aiosqlite
- **Site :** [sqlalchemy.org](https://www.sqlalchemy.org/)

### Pydantic
**Validation de données et sérialisation**

Pydantic valide automatiquement les données entrantes et sortantes de l'API en utilisant des modèles Python typés.

- **Rôle dans Sentinel :** Validation des requêtes API, schémas de réponse
- **Site :** [docs.pydantic.dev](https://docs.pydantic.dev/)

### JWT (JSON Web Tokens)
**Standard d'authentification stateless**

JWT permet de créer des tokens d'authentification sécurisés contenant des informations sur l'utilisateur, sans nécessiter de stockage côté serveur.

- **Rôle dans Sentinel :** Authentification utilisateur, gestion des sessions
- **Implémentation :** python-jose avec cryptographie HS256
- **Site :** [jwt.io](https://jwt.io/)

### Uvicorn
**Serveur ASGI haute performance**

Uvicorn est un serveur ASGI ultra-rapide basé sur uvloop et httptools, idéal pour les applications FastAPI.

- **Rôle dans Sentinel :** Exécution du backend FastAPI
- **Site :** [uvicorn.org](https://www.uvicorn.org/)

---

## Streaming Vidéo

### WebRTC
**Communication temps réel peer-to-peer**

WebRTC (Web Real-Time Communication) est un standard permettant la transmission de flux audio/vidéo directement entre navigateurs avec une latence minimale.

- **Rôle dans Sentinel :** Affichage des flux vidéo des caméras en temps réel (< 500ms de latence)
- **Protocole utilisé :** WHEP (WebRTC-HTTP Egress Protocol)
- **Fonctionnement :**
  1. Le client envoie une offre SDP au serveur
  2. Le serveur répond avec une réponse SDP
  3. Une connexion peer-to-peer est établie
  4. Le flux vidéo est transmis via RTP/SRTP
- **Site :** [webrtc.org](https://webrtc.org/)

### RTSP (Real Time Streaming Protocol)
**Protocole de streaming vidéo standard**

RTSP est le protocole standard utilisé par les caméras IP pour diffuser leurs flux vidéo.

- **Rôle dans Sentinel :** Réception des flux vidéo des caméras IP
- **Format typique :** `rtsp://user:pass@ip:554/stream`
- **Transport :** TCP ou UDP

### MediaMTX
**Serveur de streaming média multiprotocole**

MediaMTX (anciennement rtsp-simple-server) est un serveur capable de recevoir, convertir et redistribuer des flux vidéo dans différents protocoles.

- **Rôle dans Sentinel :**
  - Réception des flux RTSP des caméras
  - Conversion RTSP → WebRTC pour le navigateur
  - Conversion RTSP → HLS pour compatibilité
- **Protocoles supportés :** RTSP, RTMP, HLS, WebRTC, SRT
- **Site :** [github.com/bluenviron/mediamtx](https://github.com/bluenviron/mediamtx)

### FFmpeg
**Suite d'outils de traitement multimédia**

FFmpeg est l'outil de référence pour le transcodage, la conversion et le traitement de flux audio/vidéo.

- **Rôle dans Sentinel :** Transcodage H265 → H264 pour compatibilité WebRTC navigateur
- **Encodeur utilisé :** h264_nvenc (GPU NVIDIA) ou libx264 (CPU)
- **Paramètres clés :**
  - `-profile:v baseline` : Profil H264 compatible WebRTC
  - `-level 3.1` : Niveau H264 standard
  - `-zerolatency 1` : Minimisation de la latence
- **Site :** [ffmpeg.org](https://ffmpeg.org/)

### H264 / H265 (HEVC)
**Codecs de compression vidéo**

- **H265 (HEVC) :** Codec moderne utilisé par les caméras IP, ~50% plus efficace que H264 mais moins compatible
- **H264 (AVC) :** Codec universel supporté par tous les navigateurs

- **Rôle dans Sentinel :**
  - Les caméras diffusent en H265
  - FFmpeg transcode en H264 pour les navigateurs
  - Profil "baseline" utilisé pour la compatibilité WebRTC

---

## Communication Temps Réel

### WebSocket
**Protocole de communication bidirectionnelle**

WebSocket permet une communication persistante et bidirectionnelle entre le client et le serveur, idéale pour les mises à jour en temps réel.

- **Rôle dans Sentinel :**
  - Notifications d'événements en temps réel
  - Mise à jour du statut des caméras
  - Alertes de détection
- **Implémentation :** WebSocket natif FastAPI
- **Site :** [websocket.org](https://websocket.org/)

### Socket.IO
**Bibliothèque de communication temps réel**

Socket.IO est une abstraction au-dessus de WebSocket offrant des fonctionnalités avancées (reconnexion automatique, rooms, namespaces).

- **Rôle dans Sentinel :** Client WebSocket côté frontend (optionnel)
- **Note :** Actuellement désactivé, utilisation de WebSocket natif
- **Site :** [socket.io](https://socket.io/)

---

## Intelligence Artificielle

### YOLOv8
**Modèle de détection d'objets en temps réel**

YOLO (You Only Look Once) est un algorithme de détection d'objets capable d'identifier et localiser plusieurs objets dans une image en une seule passe.

- **Rôle dans Sentinel :**
  - Détection de personnes, véhicules, animaux
  - Estimation de pose humaine (yolov8-pose)
  - Détection d'intrusions
- **Modèles utilisés :**
  - `yolov8n.pt` : Détection d'objets (nano, rapide)
  - `yolov8n-pose.pt` : Estimation de pose
- **Site :** [ultralytics.com](https://ultralytics.com/)

### OpenCV
**Bibliothèque de vision par ordinateur**

OpenCV fournit des outils pour le traitement d'images et de vidéos, la détection d'objets, et la vision par ordinateur.

- **Rôle dans Sentinel :**
  - Capture des flux RTSP
  - Prétraitement des images
  - Dessin des bounding boxes et annotations
- **Site :** [opencv.org](https://opencv.org/)

### PyTorch
**Framework de deep learning**

PyTorch est le framework utilisé par YOLOv8 pour l'inférence des modèles de détection.

- **Rôle dans Sentinel :** Backend d'exécution des modèles YOLO
- **Support GPU :** CUDA pour accélération NVIDIA
- **Site :** [pytorch.org](https://pytorch.org/)

---

## Base de données

### SQLite
**Base de données embarquée**

SQLite est une base de données légère ne nécessitant pas de serveur, idéale pour le développement et les applications de petite à moyenne taille.

- **Rôle dans Sentinel :** Stockage des utilisateurs, caméras, sessions
- **Mode :** Asynchrone avec aiosqlite
- **Fichier :** `sentinel.db`
- **Site :** [sqlite.org](https://sqlite.org/)

---

## Sécurité

### Fernet (Cryptography)
**Chiffrement symétrique**

Fernet est un système de chiffrement symétrique garantissant que les données chiffrées ne peuvent pas être manipulées sans la clé.

- **Rôle dans Sentinel :** Chiffrement des mots de passe des caméras en base de données
- **Bibliothèque :** cryptography (Python)
- **Site :** [cryptography.io](https://cryptography.io/)

### Bcrypt
**Hachage de mots de passe**

Bcrypt est un algorithme de hachage spécialement conçu pour les mots de passe, avec un facteur de coût ajustable.

- **Rôle dans Sentinel :** Hachage des mots de passe utilisateurs
- **Bibliothèque :** passlib avec bcrypt
- **Site :** [pypi.org/project/bcrypt](https://pypi.org/project/bcrypt/)

---

## Schéma d'architecture technique

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React 19 + TypeScript + Redux Toolkit + Tailwind CSS       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │ Components  │  │   Redux     │  │   WebRTC Player     │  │    │
│  │  │  (Pages)    │  │   Store     │  │   (Video Stream)    │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│         │ HTTP/REST            │ WebSocket         │ WebRTC         │
└─────────┼──────────────────────┼──────────────────┼─────────────────┘
          │                      │                  │
          ▼                      ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  FastAPI + SQLAlchemy + Pydantic + JWT                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │  API REST   │  │  WebSocket  │  │  FFmpeg Transcoder  │  │    │
│  │  │  (Routes)   │  │  (Events)   │  │  (H265→H264)        │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│         │ SQL                         │ RTSP                        │
└─────────┼─────────────────────────────┼─────────────────────────────┘
          │                             │
          ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────────────────────┐
│      SQLite         │    │              MediaMTX                    │
│  ┌───────────────┐  │    │  ┌─────────────────────────────────┐    │
│  │ Users         │  │    │  │  RTSP → WebRTC/HLS Conversion   │    │
│  │ Cameras       │  │    │  └─────────────────────────────────┘    │
│  │ Sessions      │  │    │         │ RTSP                          │
│  └───────────────┘  │    └─────────┼───────────────────────────────┘
└─────────────────────┘              │
                                     ▼
                          ┌─────────────────────┐
                          │    Caméras IP       │
                          │  (RTSP H265/H264)   │
                          └─────────────────────┘
```

---

## Versions des dépendances principales

### Frontend (package.json)
| Package | Version |
|---------|---------|
| react | ^19.0.0 |
| typescript | ^5.6.0 |
| @reduxjs/toolkit | ^2.3.0 |
| tailwindcss | ^3.4.0 |
| vite | ^5.4.0 |

### Backend (requirements.txt)
| Package | Version |
|---------|---------|
| fastapi | ^0.115.0 |
| sqlalchemy | ^2.0.0 |
| pydantic | ^2.9.0 |
| python-jose | ^3.3.0 |
| uvicorn | ^0.32.0 |
| opencv-python | ^4.10.0 |
| ultralytics | ^8.3.0 |

---

*Document mis à jour le 29 novembre 2025*
