# React - Les Fondamentaux

## 🎯 Qu'est-ce que React ?

React est une bibliothèque JavaScript pour construire des **interfaces utilisateur** (UI). Elle permet de créer des **composants réutilisables** qui gèrent leur propre état.

---

## 1. Les Composants

Un composant React est une **fonction** qui retourne du JSX (HTML-like syntax).

### Exemple Simple

**🎯 Objectif:** Créer un bouton basique qui affiche du texte

```tsx
// Déclaration d'une fonction composant nommée 'Button'
// Un composant React est simplement une fonction JavaScript
function Button() {
  // 'return' retourne du JSX (syntaxe HTML dans JavaScript)
  // <button> est un élément HTML de bouton
  // Le texte entre les balises sera affiché dans le bouton
  return <button>Cliquez-moi</button>;
}

// Pour utiliser ce composant ailleurs:
// <Button />
```

### Composant avec TypeScript

**🎯 Objectif:** Créer le même bouton avec un typage TypeScript explicite

```tsx
// Déclarer une constante 'Button' qui contient un composant React
// React.FC = React Function Component (type TypeScript)
// () => indique une fonction fléchée (arrow function)
const Button: React.FC = () => {
  // Retourne le même JSX qu'avant
  return <button>Cliquez-moi</button>;
};

// Les deux syntaxes (function et const + arrow) sont équivalentes
// 'const' + arrow function est plus moderne
```

---

## 2. Les Props (Propriétés)

Les **props** permettent de **passer des données** d'un composant parent vers un composant enfant.

### Sans Props

**🎯 Objectif:** Bouton simple sans personnalisation (toujours le même texte)

```tsx
// Composant Button sans props
// Affiche toujours "Cliquez-moi", pas de personnalisation possible
function Button() {
  return <button>Cliquez-moi</button>;
}

// Problème: tous les boutons affichent le même texte
<Button /> {/* Affiche "Cliquez-moi" */}
<Button /> {/* Affiche encore "Cliquez-moi" */}
```

### Avec Props

**🎯 Objectif:** Bouton réutilisable avec texte et couleur personnalisables

```tsx
// Définir l'interface des props (propriétés passées au composant)
interface ButtonProps {
  text: string;                         // Texte du bouton (obligatoire)
  color?: 'blue' | 'red' | 'green';    // Couleur (optionnel, seulement 3 valeurs possibles)
}

// Fonction composant qui reçoit les props
// { text, color = 'blue' } = destructuration avec valeur par défaut
// Si 'color' n'est pas fourni, il vaut 'blue' par défaut
function Button({ text, color = 'blue' }: ButtonProps) {
  return (
    // Élément <button> HTML
    // style={{ backgroundColor: color }} applique la couleur en CSS inline
    // {{ }} = premières accolades pour JSX, deuxièmes pour l'objet JavaScript
    <button style={{ backgroundColor: color }}>
      {/* {text} affiche le contenu de la prop 'text' */}
      {text}
    </button>
  );
}

// Exemples d'utilisation
<Button text="Enregistrer" color="green" />  {/* Bouton vert avec "Enregistrer" */}
<Button text="Annuler" color="red" />        {/* Bouton rouge avec "Annuler" */}
<Button text="OK" />                         {/* Bouton bleu (défaut) avec "OK" */}
```

### Props dans Sentinel IA

**🎯 Objectif:** Créer une carte de caméra interactive qui affiche les infos et notifie le parent lors d'un clic

```tsx
// Interface définissant les props du composant CameraCard
interface CameraCardProps {
  camera: Camera;              // Objet Camera complet (contient id, name, status, etc.)
  onSelect: (id: string) => void;  // Fonction callback pour notifier le parent du clic
                               // Prend l'ID de la caméra et ne retourne rien (void)
}

// Composant CameraCard qui affiche une caméra
// { camera, onSelect } = destructuration des props
function CameraCard({ camera, onSelect }: CameraCardProps) {
  return (
    // <div> cliquable (cursor: pointer recommandé en CSS)
    // onClick déclenche la fonction onSelect avec l'ID de la caméra
    // () => onSelect(camera.id) = fonction fléchée pour passer le bon ID
    <div onClick={() => onSelect(camera.id)}>
      {/* <h3> titre avec le nom de la caméra */}
      {/* camera.name accède à la propriété 'name' de l'objet 'camera' */}
      <h3>{camera.name}</h3>

      {/* <p> paragraphe avec le statut */}
      {/* camera.status peut être 'active', 'inactive', ou 'error' */}
      <p>Status: {camera.status}</p>
    </div>
  );
}

// Exemple d'utilisation dans un composant parent
function CameraList() {
  const handleCameraSelect = (cameraId: string) => {
    console.log('Caméra sélectionnée:', cameraId);
    // Logique pour ouvrir le flux vidéo, etc.
  };

  return (
    <div>
      {/* Passer les props au composant CameraCard */}
      <CameraCard
        camera={myCameraData}           // Passe l'objet caméra
        onSelect={handleCameraSelect}   // Passe la fonction callback
      />
    </div>
  );
}
```

---

## 3. Le State (État)

Le **state** est une donnée **interne** au composant qui peut **changer dans le temps**.

### useState Hook

**🎯 Objectif:** Créer un compteur interactif qui s'incrémente à chaque clic

```tsx
// Importer le hook useState depuis la bibliothèque React
// Un "hook" est une fonction spéciale qui ajoute des fonctionnalités à un composant
import { useState } from 'react';

function Counter() {
  // Déclarer une variable d'état (state) nommée 'count'
  // useState(0) crée le state avec 0 comme valeur initiale
  // count = la valeur actuelle du compteur
  // setCount = fonction pour modifier la valeur de count
  // [count, setCount] = destructuration du tableau retourné par useState
  const [count, setCount] = useState(0);

  return (
    <div>
      {/* Afficher la valeur actuelle du compteur */}
      {/* {count} est remplacé par la valeur, ex: "Compteur: 5" */}
      <p>Compteur: {count}</p>

      {/* Bouton pour incrémenter le compteur */}
      {/* onClick est déclenché quand on clique sur le bouton */}
      {/* () => setCount(count + 1) est une fonction fléchée qui:
           1. Calcule count + 1 (nouvelle valeur)
           2. Appelle setCount pour mettre à jour le state
           3. React re-rend le composant avec la nouvelle valeur */}
      <button onClick={() => setCount(count + 1)}>
        Incrémenter
      </button>
    </div>
  );
}

// Fonctionnement:
// 1. Premier rendu: count = 0, affiche "Compteur: 0"
// 2. Clic sur le bouton: setCount(0 + 1) est appelé
// 3. React met à jour count à 1
// 4. React re-rend le composant
// 5. Deuxième rendu: count = 1, affiche "Compteur: 1"
// Et ainsi de suite...
```

### State avec TypeScript

```tsx
interface User {
  name: string;
  age: number;
}

function UserProfile() {
  // Type explicite pour le state
  const [user, setUser] = useState<User | null>(null);

  const loadUser = () => {
    setUser({ name: 'Alice', age: 30 });
  };

  return (
    <div>
      {user ? (
        <p>{user.name}, {user.age} ans</p>
      ) : (
        <button onClick={loadUser}>Charger utilisateur</button>
      )}
    </div>
  );
}
```

### State dans Sentinel IA

```tsx
function VideoPlayer({ cameraId }: { cameraId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div>
      <video />
      <button onClick={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
      />
    </div>
  );
}
```

---

## 4. Rendu Conditionnel

Afficher différents éléments selon des conditions.

### If/Else avec JSX

```tsx
function CameraStatus({ status }: { status: string }) {
  if (status === 'active') {
    return <span className="text-green-500">🟢 Active</span>;
  }

  if (status === 'error') {
    return <span className="text-red-500">🔴 Erreur</span>;
  }

  return <span className="text-gray-500">⚪ Inconnue</span>;
}
```

### Opérateur Ternaire

```tsx
function CameraCard({ camera }: { camera: Camera }) {
  return (
    <div>
      <h3>{camera.name}</h3>
      {camera.status === 'active' ? (
        <p className="text-green-500">Connectée</p>
      ) : (
        <p className="text-red-500">Déconnectée</p>
      )}
    </div>
  );
}
```

### Opérateur &&

```tsx
function EventCard({ event }: { event: Event }) {
  return (
    <div>
      <h4>{event.type}</h4>
      {/* Affiche seulement si non acknowledgé */}
      {!event.acknowledged && (
        <span className="badge">Nouveau</span>
      )}
    </div>
  );
}
```

---

## 5. Listes et Boucles

Afficher des listes de données avec `.map()`.

### Map Simple

```tsx
function CameraList({ cameras }: { cameras: Camera[] }) {
  return (
    <div>
      {cameras.map(camera => (
        <div key={camera.id}>
          <h3>{camera.name}</h3>
        </div>
      ))}
    </div>
  );
}
```

### Importance du `key`

```tsx
// ❌ Mauvais - pas de key
{cameras.map(camera => <div>{camera.name}</div>)}

// ✅ Bon - avec key unique
{cameras.map(camera => (
  <div key={camera.id}>{camera.name}</div>
))}
```

La `key` aide React à identifier quel élément a changé pour optimiser le rendu.

---

## 6. Événements

Gérer les interactions utilisateur.

### Événements Basiques

```tsx
function Button() {
  const handleClick = () => {
    console.log('Bouton cliqué !');
  };

  return <button onClick={handleClick}>Cliquer</button>;
}
```

### Événements avec Paramètres

```tsx
function CameraCard({ camera, onDelete }: CameraCardProps) {
  const handleDelete = () => {
    // Confirmation avant suppression
    if (confirm(`Supprimer ${camera.name} ?`)) {
      onDelete(camera.id);
    }
  };

  return (
    <div>
      <h3>{camera.name}</h3>
      <button onClick={handleDelete}>🗑️ Supprimer</button>
    </div>
  );
}
```

### Événements de Formulaire

```tsx
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de la page
    console.log('Login:', username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

---

## 📝 Résumé

| Concept | Description | Exemple |
|---------|-------------|---------|
| **Composant** | Fonction qui retourne du JSX | `function Button() { return <button>OK</button> }` |
| **Props** | Données passées du parent vers l'enfant | `<Button text="Cliquer" />` |
| **State** | Données internes qui changent | `const [count, setCount] = useState(0)` |
| **Rendu conditionnel** | Afficher selon conditions | `{isActive ? <Active /> : <Inactive />}` |
| **Listes** | Afficher des tableaux | `{items.map(item => <div key={item.id}>{item.name}</div>)}` |
| **Événements** | Gérer interactions | `<button onClick={handleClick}>` |

---

## 🎯 Prochaine Étape

➡️ **[02-typescript-react.md](02-typescript-react.md)** - Apprendre à typer correctement vos composants React
