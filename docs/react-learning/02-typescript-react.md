# TypeScript avec React

## 🎯 Pourquoi TypeScript ?

TypeScript ajoute des **types** à JavaScript pour détecter les erreurs **avant l'exécution** du code.

**Avantages:**
- ✅ Détection d'erreurs au moment de l'écriture
- ✅ Autocomplétion intelligente dans l'éditeur
- ✅ Documentation automatique du code
- ✅ Refactoring plus sûr

---

## 1. Typer les Props

### Props Simples

**🎯 Objectif:** Créer un bouton réutilisable avec du texte personnalisable et un état désactivé optionnel

```tsx
// Interface pour définir les props (propriétés) du composant
// 'interface' définit la structure des données attendues
interface ButtonProps {
  text: string;        // 'text' est obligatoire, doit être une chaîne de caractères
  disabled?: boolean;  // '?' signifie optionnel, 'disabled' peut être absent
}

// Fonction composant Button qui reçoit les props
// Les props sont "destructurées" directement dans les paramètres
// 'disabled = false' définit une valeur par défaut si absent
function Button({ text, disabled = false }: ButtonProps) {
  // Retourne un élément <button> HTML
  // 'disabled' contrôle si le bouton est cliquable ou non
  // {text} affiche le contenu de la prop 'text' dans le bouton
  return <button disabled={disabled}>{text}</button>;
}

// ✅ Exemples d'utilisation valides
<Button text="OK" />                    // Utilise disabled=false par défaut
<Button text="OK" disabled={true} />    // Bouton désactivé explicitement

// ❌ Erreurs détectées par TypeScript
<Button />                  // Erreur: 'text' est manquant (obligatoire)
<Button text={123} />       // Erreur: 'text' doit être string, pas number
```

### Props avec Types Union

**🎯 Objectif:** Créer un badge de statut qui accepte seulement certaines valeurs prédéfinies

```tsx
// Interface avec types "union" (valeurs limitées)
interface StatusBadgeProps {
  // 'status' peut SEULEMENT être l'une de ces 3 valeurs exactes
  status: 'active' | 'inactive' | 'error';

  // 'size' est optionnel et peut être 'sm', 'md' ou 'lg'
  size?: 'sm' | 'md' | 'lg';
}

// Composant StatusBadge
function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  // Retourne un <span> avec des classes CSS dynamiques
  // Les classes sont construites avec les valeurs des props
  // Exemple: 'badge-active badge-md'
  return <span className={`badge-${status} badge-${size}`}>{status}</span>;
}

// ✅ Valide
<StatusBadge status="active" />         // Utilise size='md' par défaut

// ❌ Erreur TypeScript
<StatusBadge status="pending" />        // 'pending' n'existe pas dans le type
                                        // TypeScript suggère: 'active' | 'inactive' | 'error'
```

### Props avec Objets Complexes

**🎯 Objectif:** Créer une carte de caméra qui affiche les infos et permet de sélectionner la caméra

```tsx
// Type Camera importé de notre fichier de types
// Définit la structure complète d'une caméra
interface Camera {
  id: string;           // Identifiant unique
  name: string;         // Nom de la caméra (ex: "Entrée principale")
  rtsp_url: string;     // URL du flux vidéo
  status: 'active' | 'inactive' | 'error';  // État actuel
  location: string;     // Emplacement physique
}

// Props du composant CameraCard
interface CameraCardProps {
  camera: Camera;  // L'objet caméra complet

  // Fonction callback appelée lors d'un clic
  // Prend un cameraId (string) en paramètre
  // Ne retourne rien (void)
  onSelect: (cameraId: string) => void;
}

// Composant qui affiche une carte de caméra
function CameraCard({ camera, onSelect }: CameraCardProps) {
  // Retourne un <div> cliquable
  return (
    // onClick déclenche la fonction onSelect avec l'ID de la caméra
    // La syntaxe () => onSelect(camera.id) crée une fonction anonyme
    <div onClick={() => onSelect(camera.id)}>
      {/* Affiche le nom de la caméra dans un titre */}
      <h3>{camera.name}</h3>

      {/* Affiche l'emplacement */}
      <p>{camera.location}</p>

      {/* Affiche le statut */}
      <span>{camera.status}</span>
    </div>
  );
}

// Exemple d'utilisation
const handleCameraSelect = (cameraId: string) => {
  console.log('Caméra sélectionnée:', cameraId);
  // Logique pour afficher le flux vidéo, etc.
};

<CameraCard
  camera={myCameraData}           // Passe l'objet caméra
  onSelect={handleCameraSelect}   // Passe la fonction callback
/>
```

---

## 2. Typer le State

### State Simple

**🎯 Objectif:** Créer un compteur avec un bouton pour incrémenter

```tsx
// Importer le hook useState depuis React
import { useState } from 'react';

function Counter() {
  // Déclarer une variable d'état 'count'
  // count = valeur actuelle (commence à 0)
  // setCount = fonction pour changer la valeur
  // TypeScript déduit automatiquement que count est un 'number'
  const [count, setCount] = useState(0);

  // Retourne l'interface utilisateur
  return (
    <div>
      {/* Affiche la valeur actuelle du compteur */}
      <p>Compteur: {count}</p>

      {/* Bouton pour incrémenter */}
      {/* onClick appelle setCount pour changer la valeur */}
      {/* count + 1 calcule la nouvelle valeur */}
      <button onClick={() => setCount(count + 1)}>
        Incrémenter
      </button>
    </div>
  );
}
```

### State avec Type Explicite

**🎯 Objectif:** Gérer un profil utilisateur qui peut être null (pas encore chargé) ou contenir des données

```tsx
// Définir le type User
interface User {
  name: string;    // Nom de l'utilisateur
  age: number;     // Âge de l'utilisateur
}

function UserProfile() {
  // État qui peut être soit null (pas de user), soit un objet User
  // <User | null> indique explicitement le type à TypeScript
  // Initialisation à null (pas d'utilisateur au départ)
  const [user, setUser] = useState<User | null>(null);

  // Fonction pour charger un utilisateur
  const loadUser = () => {
    // Appelle setUser avec un objet User
    setUser({ name: 'Alice', age: 30 });
  };

  // Retourne l'interface
  return (
    <div>
      {/* Rendu conditionnel: si user existe, affiche les infos */}
      {user ? (
        // user n'est PAS null ici, on peut accéder à user.name et user.age
        <p>{user.name}, {user.age} ans</p>
      ) : (
        // user est null, on affiche un bouton pour charger
        <button onClick={loadUser}>Charger utilisateur</button>
      )}
    </div>
  );
}
```

### State avec Objets Complexes

**🎯 Objectif:** Créer un formulaire de connexion qui gère plusieurs champs en un seul state

```tsx
// Définir la structure des données du formulaire
interface FormData {
  username: string;   // Nom d'utilisateur
  password: string;   // Mot de passe
  remember: boolean;  // Case à cocher "Se souvenir de moi"
}

function LoginForm() {
  // State contenant toutes les données du formulaire dans un seul objet
  // Valeurs initiales: champs vides, remember=false
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    remember: false,
  });

  // Fonction générique pour mettre à jour un champ
  // 'field' indique quel champ modifier (username, password, ou remember)
  // 'keyof FormData' signifie: une des clés de FormData
  // 'value' peut être string ou boolean selon le champ
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    // setFormData prend une fonction qui reçoit le state précédent (prev)
    setFormData(prev => ({
      // ... prev copie toutes les propriétés existantes
      ...prev,
      // [field]: value modifie seulement le champ spécifié
      // Exemple: si field='username', alors username: value
      [field]: value,
    }));
  };

  // Retourne le formulaire
  return (
    <form>
      {/* Input pour le username */}
      <input
        value={formData.username}  // Valeur actuelle du champ
        // onChange appelé à chaque frappe
        // e.target.value contient le nouveau texte tapé
        onChange={(e) => handleChange('username', e.target.value)}
      />

      {/* Input pour le password */}
      <input
        type="password"
        value={formData.password}
        onChange={(e) => handleChange('password', e.target.value)}
      />

      {/* Checkbox pour "Se souvenir" */}
      <input
        type="checkbox"
        checked={formData.remember}  // État de la checkbox
        // e.target.checked est un boolean
        onChange={(e) => handleChange('remember', e.target.checked)}
      />
    </form>
  );
}
```

---

## 3. Typer les Événements

### Événements Communs

**🎯 Objectif:** Gérer correctement les événements de clic, changement d'input et soumission de formulaire

```tsx
function MyComponent() {
  // Gestionnaire de clic sur un bouton
  // e = événement de type MouseEvent sur un élément HTMLButtonElement
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // e.currentTarget = le bouton qui a été cliqué
    console.log('Bouton cliqué', e.currentTarget);
  };

  // Gestionnaire de changement dans un input
  // e = événement de type ChangeEvent sur un input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // e.target.value = la nouvelle valeur tapée dans l'input
    console.log('Nouvelle valeur:', e.target.value);
  };

  // Gestionnaire de soumission de formulaire
  // e = événement de type FormEvent sur un form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // e.preventDefault() empêche le rechargement de la page
    e.preventDefault();
    console.log('Formulaire soumis');
  };

  // Retourne le formulaire avec les gestionnaires
  return (
    <form onSubmit={handleSubmit}>
      {/* Input avec gestionnaire de changement */}
      <input onChange={handleChange} />

      {/* Bouton avec gestionnaire de clic */}
      <button onClick={handleClick}>Envoyer</button>
    </form>
  );
}
```

### Types d'Événements Fréquents

**🎯 Objectif:** Référence rapide des types d'événements les plus utilisés

```tsx
// Événement de clic sur un bouton
onClick: (e: React.MouseEvent<HTMLButtonElement>) => void

// Événement de changement dans un input texte
onChange: (e: React.ChangeEvent<HTMLInputElement>) => void

// Événement de changement dans un select/dropdown
onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void

// Événement de changement dans un textarea
onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

// Événement de soumission d'un formulaire
onSubmit: (e: React.FormEvent<HTMLFormElement>) => void

// Événement de frappe clavier
onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
```

---

## 4. Types Utilitaires

### Partial<T>

**🎯 Objectif:** Permettre la mise à jour partielle d'un objet sans fournir tous les champs

```tsx
// Type Camera avec tous les champs obligatoires
interface Camera {
  id: string;
  name: string;
  status: string;
}

// Fonction pour mettre à jour une caméra
// Partial<Camera> rend TOUS les champs optionnels
// On peut passer seulement { name: "..." } sans id ni status
function updateCamera(id: string, updates: Partial<Camera>) {
  // 'updates' peut contenir n'importe quelle combinaison de champs
  // Exemple: { name: "Nouvelle caméra" }
  // Ou: { status: "active" }
  // Ou: { name: "...", status: "..." }

  console.log(`Mise à jour caméra ${id}:`, updates);
  // Logique pour envoyer au serveur...
}

// ✅ Exemples d'utilisation valides
updateCamera('cam1', { name: 'Nouvelle caméra' });     // Seulement le nom
updateCamera('cam1', { status: 'inactive' });          // Seulement le statut
updateCamera('cam1', { name: 'Cam', status: 'active' }); // Plusieurs champs
```

### Pick<T, Keys>

**🎯 Objectif:** Créer un type qui contient seulement certains champs d'un type existant

```tsx
// Type Camera complet
interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  status: string;
  location: string;
}

// Créer un nouveau type avec SEULEMENT 'id' et 'name'
// Utile pour afficher une liste simplifiée
type CameraPreview = Pick<Camera, 'id' | 'name'>;

// CameraPreview = { id: string; name: string; }
// Les autres champs (rtsp_url, status, location) sont exclus

const preview: CameraPreview = {
  id: 'cam1',
  name: 'Entrée',
  // ❌ Ne peut pas ajouter d'autres champs
  // rtsp_url: '...' // Erreur TypeScript
};
```

### Omit<T, Keys>

**🎯 Objectif:** Créer un type qui exclut certains champs (inverse de Pick)

```tsx
// Exclure 'id' de Camera
// Utile pour la création d'une nouvelle caméra (l'ID sera généré par le serveur)
type CreateCameraData = Omit<Camera, 'id'>;

// CreateCameraData = {
//   name: string;
//   rtsp_url: string;
//   status: string;
//   location: string;
// }
// Le champ 'id' est ABSENT

// Fonction pour créer une caméra
function createCamera(data: CreateCameraData) {
  // 'data' ne contient pas 'id'
  // L'ID sera généré par le backend
  console.log('Création caméra:', data);
}

// ✅ Utilisation
createCamera({
  name: 'Nouvelle caméra',
  rtsp_url: 'rtsp://192.168.1.100:554/stream',
  status: 'active',
  location: 'Entrée principale',
  // Pas besoin de fournir 'id'
});
```

### Record<K, T>

**🎯 Objectif:** Créer un dictionnaire (objet) avec des clés et valeurs typées

```tsx
// Créer un dictionnaire qui associe un ID (string) à une Camera
// Permet un accès rapide par ID: cameras[id]
type CamerasById = Record<string, Camera>;

// Équivalent à: { [key: string]: Camera }

// Exemple de données
const cameras: CamerasById = {
  // Clé = ID de la caméra, Valeur = objet Camera
  'cam1': { id: 'cam1', name: 'Entrée', /* ... */ },
  'cam2': { id: 'cam2', name: 'Sortie', /* ... */ },
  'cam3': { id: 'cam3', name: 'Parking', /* ... */ },
};

// Accès rapide à une caméra par son ID
const camera = cameras['cam1'];  // Type: Camera | undefined
// undefined si l'ID n'existe pas dans le dictionnaire

// Ajouter une nouvelle caméra
cameras['cam4'] = { id: 'cam4', name: 'Bureau', /* ... */ };
```

---

## 5. Génériques

**🎯 Objectif:** Créer un composant Liste réutilisable pour n'importe quel type de données

### Composant Liste Générique

```tsx
// Interface Props avec un type générique <T>
// T peut être Camera, Event, User, ou n'importe quel type
interface ListProps<T> {
  items: T[];                              // Tableau d'éléments de type T
  renderItem: (item: T) => React.ReactNode;  // Fonction pour afficher chaque élément
  keyExtractor: (item: T) => string;         // Fonction pour extraire une clé unique
}

// Composant List avec type générique <T>
// Ce composant fonctionne pour n'importe quel type de données
function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <div>
      {/* Boucle sur chaque élément du tableau */}
      {items.map(item => (
        // Chaque élément a une clé unique extraite par keyExtractor
        <div key={keyExtractor(item)}>
          {/* Appelle renderItem pour afficher l'élément */}
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

// ✅ Utilisation avec le type Camera
<List<Camera>
  items={cameras}  // Tableau de caméras
  // renderItem reçoit un objet Camera
  // item est typé comme Camera, autocomplétion disponible
  renderItem={(camera) => <CameraCard camera={camera} />}
  // keyExtractor reçoit un objet Camera et retourne son ID
  keyExtractor={(camera) => camera.id}
/>

// ✅ Utilisation avec le type Event
<List<Event>
  items={events}  // Tableau d'événements
  // renderItem reçoit un objet Event
  renderItem={(event) => <EventCard event={event} />}
  // keyExtractor reçoit un objet Event
  keyExtractor={(event) => event.id}
/>

// Le même composant List fonctionne pour Camera ET Event !
// TypeScript vérifie que les types correspondent partout
```

---

## 6. Types dans Sentinel IA

### Exemple du Projet

**🎯 Objectif:** Comprendre les types principaux utilisés dans notre projet

```tsx
// Fichier: frontend/src/types/index.ts

// Type représentant une caméra de surveillance
export interface Camera {
  id: string;            // Identifiant unique (ex: "cam_001")
  name: string;          // Nom descriptif (ex: "Entrée principale")
  rtsp_url: string;      // URL du flux vidéo RTSP
  location: string;      // Emplacement physique
  status: CameraStatus;  // État actuel de la caméra
  resolution: Resolution; // Résolution vidéo
  fps: number;           // Images par seconde
  created_at: string;    // Date de création (format ISO)
  last_seen?: string;    // Dernière activité (optionnel)
}

// Type union pour les statuts possibles d'une caméra
export type CameraStatus = 'active' | 'inactive' | 'error' | 'connecting';

// Type représentant la résolution vidéo
export interface Resolution {
  width: number;   // Largeur en pixels (ex: 1920)
  height: number;  // Hauteur en pixels (ex: 1080)
}

// Type représentant une détection YOLO
export interface Detection {
  id: string;            // ID unique de la détection
  camera_id: string;     // ID de la caméra source
  class_id: number;      // ID de la classe YOLO (0 = personne)
  class_name: string;    // Nom de la classe (ex: "person")
  confidence: number;    // Confiance de détection (0.0 à 1.0)
  bbox: BoundingBox;     // Rectangle englobant
  has_pose: boolean;     // Pose estimation activée ?
  keypoints?: Keypoint[]; // Points du squelette (optionnel)
  timestamp: string;     // Moment de la détection
}

// Type représentant un point du squelette (pose estimation)
export interface Keypoint {
  id: number;          // ID du point (0-16 pour COCO)
  name: string;        // Nom du point (ex: "nose", "left_shoulder")
  x: number;           // Position X en pixels
  y: number;           // Position Y en pixels
  confidence: number;  // Confiance du point (0.0 à 1.0)
  visible: boolean;    // Point visible dans l'image ?
}
```

### Utilisation dans un Composant

**🎯 Objectif:** Créer un lecteur vidéo qui affiche une caméra et ses détections

```tsx
// Importer les types depuis le fichier de types
import type { Camera, Detection } from '../types';

// Props du composant VideoPlayer
interface VideoPlayerProps {
  camera: Camera;                         // Caméra à afficher
  detections: Detection[];                // Détections en temps réel
  onDetection: (detection: Detection) => void;  // Callback quand on clique sur une détection
}

// Composant VideoPlayer
function VideoPlayer({ camera, detections, onDetection }: VideoPlayerProps) {
  return (
    <div>
      {/* Afficher le nom de la caméra */}
      <h3>{camera.name}</h3>

      {/* Élément vidéo avec le flux RTSP */}
      <video src={camera.rtsp_url} />

      {/* Liste des détections */}
      <div>
        {/* Boucle sur chaque détection */}
        {detections.map(det => (
          // Span cliquable pour chaque détection
          // key unique pour React
          <span
            key={det.id}
            // onClick appelle onDetection avec l'objet détection complet
            onClick={() => onDetection(det)}
          >
            {/* Affiche le nom de la classe détectée */}
            {det.class_name}
          </span>
        ))}
      </div>
    </div>
  );
}

// Exemple d'utilisation
const myCamera: Camera = {
  id: 'cam1',
  name: 'Entrée',
  rtsp_url: 'rtsp://192.168.1.100:554/stream',
  location: 'Hall',
  status: 'active',
  resolution: { width: 1920, height: 1080 },
  fps: 25,
  created_at: '2025-01-01T10:00:00Z',
};

const handleDetectionClick = (detection: Detection) => {
  console.log('Détection cliquée:', detection.class_name);
  // Afficher plus de détails, zoomer sur la détection, etc.
};

<VideoPlayer
  camera={myCamera}
  detections={currentDetections}
  onDetection={handleDetectionClick}
/>
```

---

## 7. Bonnes Pratiques

### ✅ À Faire

```tsx
// 1. Toujours typer explicitement les props
// Permet l'autocomplétion et détecte les erreurs
interface Props {
  title: string;
  count: number;
}

// 2. Utiliser les types centralisés du projet
// Ne pas redéfinir Camera partout
import type { Camera } from '../types';

// 3. Typer les fonctions callbacks
// Indique clairement quels paramètres sont attendus
onSelect: (id: string) => void;

// 4. Utiliser types union pour des valeurs limitées
// Empêche les fautes de frappe et les valeurs invalides
type Status = 'active' | 'inactive' | 'error';

// 5. Utiliser ? pour les propriétés optionnelles
// Indique explicitement ce qui est requis ou non
interface Props {
  required: string;     // Obligatoire
  optional?: number;    // Optionnel
}
```

### ❌ À Éviter

```tsx
// 1. ❌ Ne JAMAIS utiliser 'any'
// 'any' désactive TypeScript, perd tous les bénéfices
const data: any = fetchData(); // ❌ Mauvais

// ✅ À la place, typer correctement
const data: Camera[] = fetchData(); // ✅ Bon

// 2. ❌ Ne pas forcer le type avec 'as' sans certitude
// C'est dangereux si les données ne correspondent pas
const camera = data as Camera; // ❌ Dangereux

// ✅ À la place, vérifier le type
if (isCamera(data)) {
  const camera: Camera = data; // ✅ Sûr
}

// 3. ❌ Ne pas ignorer les erreurs TypeScript avec @ts-ignore
// Cache les vrais problèmes
// @ts-ignore
const result = dangerousOperation(); // ❌

// ✅ Corriger le problème au lieu de l'ignorer

// 4. ❌ Props sans types
// Perd l'autocomplétion et la vérification
function Button(props) { // ❌
  return <button>{props.text}</button>;
}

// ✅ Avec types
interface ButtonProps { text: string; }
function Button({ text }: ButtonProps) { // ✅
  return <button>{text}</button>;
}
```

---

## 📝 Résumé

| Concept | Syntaxe | Exemple |
|---------|---------|---------|
| **Props** | `interface Props { ... }` | `interface ButtonProps { text: string }` |
| **State** | `useState<Type>()` | `useState<User \| null>(null)` |
| **Événements** | `React.MouseEvent<T>` | `(e: React.MouseEvent<HTMLButtonElement>)` |
| **Partial** | `Partial<Type>` | `updates: Partial<Camera>` |
| **Pick** | `Pick<Type, Keys>` | `Pick<Camera, 'id' \| 'name'>` |
| **Omit** | `Omit<Type, Keys>` | `Omit<Camera, 'id'>` |
| **Record** | `Record<K, V>` | `Record<string, Camera>` |
| **Génériques** | `<T>` | `List<Camera>` |

---

## 🎯 Prochaine Étape

➡️ **[03-redux-fundamentals.md](03-redux-fundamentals.md)** - Apprendre Redux Toolkit pour gérer l'état global
