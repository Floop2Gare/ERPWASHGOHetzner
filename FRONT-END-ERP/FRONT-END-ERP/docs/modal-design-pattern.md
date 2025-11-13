# Bloc de Design : Fenêtre Modale Superposée

## Structure générale

Il s'agit d'une fenêtre modale qui s'ouvre par-dessus l'interface principale. Elle utilise `createPortal` pour être rendue directement dans `document.body` et possède un fond sombre avec effet de flou (backdrop blur) pour créer une séparation visuelle nette avec le contenu en arrière-plan.

## Structure HTML/JSX exacte

```jsx
{[VARIABLE_ETAT_MODAL] &&
  typeof document !== 'undefined' &&
  createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="[ID_UNIQUE_TITRE]"
      onClick={[FONCTION_FERMETURE]}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={[FONCTION_SOUMISSION]}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          {/* En-tête avec titre et bouton de fermeture */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                [LABEL_UPPERCASE_CONTEXTE]
              </span>
              <h2 id="[ID_UNIQUE_TITRE]" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                [TITRE_PRINCIPAL]
              </h2>
              <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                [DESCRIPTION_SOUS_TITRE]
              </p>
            </div>
            <button
              type="button"
              onClick={[FONCTION_FERMETURE]}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Contenu principal du formulaire */}
          <div className="space-y-4">
            {/* Insérer ici les champs du formulaire */}
            [CONTENU_FORMULAIRE]
          </div>

          {/* Pied de page avec boutons d'action */}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={[FONCTION_FERMETURE]}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              [TEXTE_BOUTON_SOUMISSION]
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )}
```

## Détails de design

### Overlay (fond sombre)
- **Position** : `fixed inset-0` - couvre toute la fenêtre
- **Z-index** : `z-[100]` - au-dessus de tout le contenu
- **Couleur de fond** : `bg-slate-950/40` - noir semi-transparent à 40%
- **Effet de flou** : `backdrop-blur-md` - flou d'arrière-plan
- **Padding** : `px-4 py-4` - espacement pour les petits écrans
- **Fermeture au clic** : cliquez sur l'overlay pour fermer la modale

### Conteneur de la modale
- **Largeur maximale** : `max-w-2xl` - largeur limitée pour le contenu
- **Hauteur maximale** : `max-h-[90vh]` - 90% de la hauteur de la fenêtre
- **Bordures** : `rounded-xl border border-slate-200` - coins arrondis et bordure subtile
- **Ombre** : `shadow-2xl ring-1 ring-slate-900/10` - ombre profonde et anneau subtil
- **Background** : `bg-white dark:bg-slate-900` - blanc clair, sombre en mode dark
- **Prévention de propagation** : cliquer à l'intérieur ne ferme pas la modale

### Formulaire
- **Layout** : `flex flex-col gap-4` - disposition en colonne avec espacement
- **Padding** : `p-4 md:p-6` - padding adaptatif (mobile/desktop)
- **Défilement** : `max-h-[90vh] overflow-y-auto` - défilement si le contenu est trop long
- **Couleur du texte** : `text-slate-900 dark:text-slate-100` - contraste pour la lisibilité

### En-tête
- **Label** : Petite étiquette en majuscules, `text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500`
- **Titre** : `text-xl font-semibold` - titre principal en grand
- **Description** : `text-xs text-slate-500` - texte secondaire discret
- **Bouton fermeture** : Bouton circulaire `h-8 w-8` avec icône X, positionné à droite

### Champs de formulaire (exemple)
- **Label** : `text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500`
- **Input** : 
  - `rounded-lg border border-slate-200 bg-white`
  - `px-3 py-2 text-sm font-medium`
  - `focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`
  - Support du mode dark avec `dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100`

### Pied de page (actions)
- **Bordure supérieure** : `border-t border-slate-200 dark:border-slate-800`
- **Bouton Annuler** : Style outline avec bordure
- **Bouton Soumission** : Style primaire en bleu (`bg-blue-600`) avec ombre portée

## Variables à remplacer

| Variable | Description | Exemple |
|----------|-------------|---------|
| `[VARIABLE_ETAT_MODAL]` | État React qui contrôle l'affichage | `showProfileModal`, `showEditModal`, `isModalOpen` |
| `[ID_UNIQUE_TITRE]` | ID unique pour l'accessibilité | `edit-profile-title`, `create-client-title` |
| `[FONCTION_FERMETURE]` | Fonction qui ferme la modale | `closeProfileModal`, `handleClose` |
| `[FONCTION_SOUMISSION]` | Fonction de soumission du formulaire | `handleProfileSubmit`, `handleCreateClient` |
| `[LABEL_UPPERCASE_CONTEXTE]` | Label court en majuscules | `MODIFIER MON PROFIL`, `CRÉER UN CLIENT` |
| `[TITRE_PRINCIPAL]` | Titre principal de la modale | `Jean Dupont`, `Nouveau client` |
| `[DESCRIPTION_SOUS_TITRE]` | Description sous le titre | `Mettez à jour vos informations...` |
| `[CONTENU_FORMULAIRE]` | Champs du formulaire spécifiques | Les inputs, selects, etc. |
| `[TEXTE_BOUTON_SOUMISSION]` | Texte du bouton de soumission | `Enregistrer`, `Créer`, `Mettre à jour` |

## Utilisation dans un prompt

Copiez-collez ce bloc dans votre prompt en remplaçant les variables selon le contexte :

```
[CONTEXTE_DE_UTILISATION] Il s'ouvre quand [QUAND_SOUVRE_LA_MODALE]. 

Utilise exactement la même structure et design que la fenêtre modale de modification de profil utilisateur :
[COLLER_ICI_LE_BLOC_COMPLET_CI_DESSUS]

Remplace :
- [VARIABLE_ETAT_MODAL] par [VALEUR]
- [ID_UNIQUE_TITRE] par [VALEUR]
- [FONCTION_FERMETURE] par [VALEUR]
- etc.
```

## Points importants

1. **Portal** : La modale doit toujours être rendue via `createPortal` dans `document.body` pour être au-dessus de tout
2. **Z-index** : Utilisez `z-[100]` ou supérieur pour être sûr que la modale est au-dessus
3. **Accessibilité** : Incluez `role="dialog"`, `aria-modal="true"`, et `aria-labelledby` pour l'accessibilité
4. **Fermeture** : Permettez la fermeture en cliquant sur l'overlay OU sur le bouton X
5. **Stop propagation** : Empêchez les clics dans la modale de fermer la modale elle-même
6. **Défilement** : Limitez la hauteur et activez le défilement vertical si nécessaire
7. **Responsive** : Le design s'adapte aux petits écrans avec le padding et le layout flex
8. **Dark mode** : Toutes les classes supportent le mode sombre avec les variantes `dark:`

## Styles de champs réutilisables

### Label de champ
```jsx
<label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="[ID_CHAMP]">
  [LIBELLE_CHAMP]
</label>
```

### Input texte
```jsx
<input
  id="[ID_CHAMP]"
  name="[NOM_CHAMP]"
  type="text"
  value={[VALEUR_ETAT]}
  onChange={[FONCTION_CHANGE]}
  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
  required={[BOOL_REQUIS]}
/>
```

### Textarea
```jsx
<textarea
  id="[ID_CHAMP]"
  name="[NOM_CHAMP]"
  value={[VALEUR_ETAT]}
  onChange={[FONCTION_CHANGE]}
  rows={[NOMBRE_LIGNES]}
  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
/>
```

### Select
```jsx
<select
  id="[ID_CHAMP]"
  name="[NOM_CHAMP]"
  value={[VALEUR_ETAT]}
  onChange={[FONCTION_CHANGE]}
  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
>
  [OPTIONS]
</select>
```

