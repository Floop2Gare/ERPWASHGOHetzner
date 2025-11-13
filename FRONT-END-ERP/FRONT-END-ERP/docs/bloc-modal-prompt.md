# Bloc Réutilisable pour Prompts - Fenêtre Modale

## Instructions d'utilisation

Remplacez `[CONTEXTE]` au début par votre contexte spécifique, puis remplacez toutes les variables `[VARIABLE]` dans le code selon votre cas d'usage.

---

## Bloc à copier dans vos prompts

```
[CONTEXTE] Il s'ouvre quand [QUAND_SOUVRE]. J'aimerais que tu utilises exactement le même design que la fenêtre modale de modification de profil utilisateur.

C'est une fenêtre modale qui s'ouvre par-dessus l'interface principale en utilisant `createPortal` pour être rendue dans `document.body`. Elle possède un fond sombre semi-transparent (`bg-slate-950/40`) avec un effet de flou d'arrière-plan (`backdrop-blur-md`) pour créer une séparation visuelle nette.

Structure exacte à utiliser :

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

**Styles pour les champs de formulaire :**

Labels de champs :
```jsx
<label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="[ID_CHAMP]">
  [LIBELLE_CHAMP]
</label>
```

Inputs texte/email/tel :
```jsx
<input
  id="[ID_CHAMP]"
  name="[NOM_CHAMP]"
  type="[TYPE]"
  value={[VALEUR_ETAT]}
  onChange={[FONCTION_CHANGE]}
  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
  required={[BOOL_REQUIS]}
/>
```

Textarea :
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

Select :
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

**Caractéristiques importantes :**
- La modale est rendue via `createPortal` dans `document.body` pour être au-dessus de tout
- Z-index de `z-[100]` pour être sûr qu'elle est au-dessus de tout le contenu
- Fond semi-transparent (`bg-slate-950/40`) avec flou d'arrière-plan (`backdrop-blur-md`)
- Fermeture en cliquant sur l'overlay OU sur le bouton X circulaire
- Prévention de la propagation des clics dans la modale elle-même
- Hauteur maximale de 90vh avec défilement vertical si nécessaire
- Support complet du mode sombre (dark mode)
- Design responsive avec padding adaptatif (mobile/desktop)

Remplace toutes les variables `[VARIABLE]` selon ton contexte spécifique.
```

---

## Guide rapide des variables

| Variable | À remplacer par |
|----------|-----------------|
| `[CONTEXTE]` | Votre contexte (ex: "Créer une fenêtre modale pour ajouter un client") |
| `[QUAND_SOUVRE]` | Quand s'ouvre la modale (ex: "l'utilisateur clique sur le bouton 'Ajouter un client'") |
| `[VARIABLE_ETAT_MODAL]` | État React (ex: `showModal`, `isOpen`, `showCreateClientModal`) |
| `[ID_UNIQUE_TITRE]` | ID unique (ex: `create-client-title`, `edit-company-title`) |
| `[FONCTION_FERMETURE]` | Fonction de fermeture (ex: `closeModal`, `handleClose`) |
| `[FONCTION_SOUMISSION]` | Fonction de soumission (ex: `handleSubmit`, `handleCreateClient`) |
| `[LABEL_UPPERCASE_CONTEXTE]` | Label en majuscules (ex: `CRÉER UN CLIENT`, `MODIFIER L'ENTREPRISE`) |
| `[TITRE_PRINCIPAL]` | Titre principal (ex: `Nouveau client`, `Modifier l'entreprise`) |
| `[DESCRIPTION_SOUS_TITRE]` | Description (ex: `Ajoutez un nouveau client à votre base de données.`) |
| `[CONTENU_FORMULAIRE]` | Vos champs de formulaire (inputs, selects, etc.) |
| `[TEXTE_BOUTON_SOUMISSION]` | Texte du bouton (ex: `Créer`, `Enregistrer`, `Mettre à jour`) |

---

## Exemple concret

```
Créer une fenêtre modale pour ajouter un nouveau client. Il s'ouvre quand l'utilisateur clique sur le bouton "Ajouter un client". J'aimerais que tu utilises exactement le même design que la fenêtre modale de modification de profil utilisateur.

[... coller le bloc ci-dessus en remplaçant les variables ...]

Remplace :
- [VARIABLE_ETAT_MODAL] par `showCreateClientModal`
- [ID_UNIQUE_TITRE] par `create-client-title`
- [FONCTION_FERMETURE] par `closeCreateClientModal`
- [FONCTION_SOUMISSION] par `handleCreateClientSubmit`
- [LABEL_UPPERCASE_CONTEXTE] par `CRÉER UN CLIENT`
- [TITRE_PRINCIPAL] par `Nouveau client`
- [DESCRIPTION_SOUS_TITRE] par `Ajoutez un nouveau client à votre base de données.`
- [TEXTE_BOUTON_SOUMISSION] par `Créer`
- [CONTENU_FORMULAIRE] par les champs de formulaire pour créer un client (nom, email, téléphone, etc.)
```

