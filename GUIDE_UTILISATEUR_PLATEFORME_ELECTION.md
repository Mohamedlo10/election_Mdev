# GUIDE UTILISATEUR - PLATEFORME DE VOTE ELECTRONIQUE

---

## TABLE DES MATIERES

1. [Presentation de la Plateforme](#1-presentation-de-la-plateforme)
2. [Points Forts de la Plateforme](#2-points-forts-de-la-plateforme)
3. [Securite et Protection des Donnees](#3-securite-et-protection-des-donnees)
4. [Guide Electeur (Voter)](#4-guide-electeur-voter)
5. [Guide Administrateur](#5-guide-administrateur)
6. [Guide Observateur](#6-guide-observateur)

---

# 1. PRESENTATION DE LA PLATEFORME

## 1.1 Qu'est-ce que cette plateforme ?

Cette plateforme est un **systeme de vote electronique moderne et securise** concu pour organiser des elections de maniere simple, transparente et fiable.

Elle permet a des organisations (entreprises, associations, ecoles, etc.) de :

- Creer et gerer des elections en ligne
- Inscrire des electeurs autorises
- Permettre aux electeurs de voter de maniere securisee
- Suivre les resultats en temps reel
- Garantir l'integrite et la confidentialite des votes

## 1.2 Les differents roles utilisateurs

La plateforme distingue **trois types d'utilisateurs** :

| Role | Description |
|------|-------------|
| **Electeur (Voter)** | Personne autorisee a voter dans une election |
| **Administrateur (Admin)** | Personne qui cree et gere une election |
| **Observateur** | Personne qui surveille le deroulement de l'election (lecture seule) |

---

# 2. POINTS FORTS DE LA PLATEFORME

## 2.1 Simplicite d'utilisation

- **Interface intuitive** : Navigation claire et ergonomique
- **Processus de vote en 3 clics** : Selectionner la categorie, choisir le candidat, confirmer
- **Compatible tous appareils** : Fonctionne sur ordinateur, tablette et smartphone
- **Connexion simplifiee** : Code a 6 chiffres envoye par email (pas de mot de passe complexe a retenir)

## 2.2 Transparence

- **Resultats en temps reel** : Les administrateurs et observateurs voient les votes au fur et a mesure
- **Statistiques detaillees** : Taux de participation, nombre de votes par candidat, pourcentages
- **Historique personnel** : Chaque electeur peut consulter ses propres votes

## 2.3 Flexibilite

- **Multi-categories** : Une election peut contenir plusieurs postes a pourvoir (President, Tresorier, etc.)
- **Import en masse** : Possibilite d'importer des centaines d'electeurs via fichier Excel
- **Personnalisation visuelle** : Logo et couleurs personnalisables pour chaque election

## 2.4 Fiabilite

- **Vote unique garanti** : Impossible de voter deux fois pour la meme categorie
- **Vote irrevocable** : Une fois confirme, le vote ne peut pas etre modifie
- **Controle d'acces strict** : Seuls les electeurs inscrits peuvent participer

---

# 3. SECURITE ET PROTECTION DES DONNEES

## 3.1 Authentification securisee

### Pour les electeurs :
- **Verification par email** : Seules les personnes dont l'email est dans la liste autorisee peuvent s'inscrire
- **Code a 6 chiffres** : Un code unique est envoye par email pour chaque connexion
- **Session securisee** : Deconnexion automatique apres inactivite

### Pour les administrateurs et observateurs :
- **Authentification par mot de passe** : Connexion classique email + mot de passe
- **Verification du role** : Le systeme verifie les permissions a chaque action

## 3.2 Protection des votes

| Mesure de securite | Description |
|-------------------|-------------|
| **Immutabilite** | Les votes ne peuvent pas etre modifies une fois enregistres |
| **Unicite** | Un electeur ne peut voter qu'une seule fois par categorie |
| **Confidentialite** | Personne ne peut voir pour qui un electeur specifique a vote |
| **Tracabilite** | Chaque vote est horodate pour l'audit |

## 3.3 Isolation des donnees

- **Separation par election** : Les donnees de chaque election sont completement isolees
- **Acces restreint** : Chaque utilisateur ne voit que les elections auxquelles il a acces
- **Base de donnees securisee** : Hebergement sur infrastructure professionnelle (Supabase/PostgreSQL)

## 3.4 Cycle de vie d'une election

```
BROUILLON  -->  ACTIVE  -->  EN PAUSE  -->  TERMINEE  -->  ARCHIVEE
   |              |             |              |              |
   v              v             v              v              v
Configuration  Votes      Votes          Plus de        Conservation
en cours      ouverts    suspendus       votes          historique
```

---

# 4. GUIDE ELECTEUR (VOTER)

## 4.1 Inscription sur la plateforme

> **Important** : Vous devez avoir ete prealablement ajoute a la liste des electeurs par l'administrateur de l'election.

### Etape 1 : Acceder a la page d'inscription

Rendez-vous sur la plateforme et cliquez sur le bouton **"S'inscrire"** ou **"Register"**.

**[ESPACE POUR CAPTURE D'ECRAN - Page d'accueil avec bouton inscription]**

---

### Etape 2 : Saisir votre adresse email

Entrez l'adresse email qui a ete enregistree par l'administrateur.

> **Note** : Si votre email n'est pas dans la liste des electeurs autorises, vous ne pourrez pas vous inscrire.

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire de saisie email]**

---

### Etape 3 : Recevoir votre code d'acces

Un email contenant un **code a 6 chiffres** vous sera envoye automatiquement.

Verifiez votre boite de reception (et vos spams si necessaire).

**[ESPACE POUR CAPTURE D'ECRAN - Exemple d'email avec code]**

---

### Etape 4 : Validation de l'inscription

Votre compte est maintenant cree. Vous serez redirige vers la page de connexion.

**[ESPACE POUR CAPTURE D'ECRAN - Message de confirmation]**

---

## 4.2 Connexion a la plateforme

### Etape 1 : Acceder a la page de connexion

Cliquez sur **"Se connecter"** ou **"Login"**.

**[ESPACE POUR CAPTURE D'ECRAN - Page de connexion]**

---

### Etape 2 : Saisir votre email

Entrez votre adresse email dans le champ prevu.

**[ESPACE POUR CAPTURE D'ECRAN - Champ email]**

---

### Etape 3 : Saisir votre code a 6 chiffres

Entrez le code recu par email dans les 6 cases prevues.

> **Astuce** : Vous pouvez coller le code directement, il se repartira automatiquement dans les cases.

**[ESPACE POUR CAPTURE D'ECRAN - Saisie du code 6 chiffres]**

---

### Etape 4 : Acces a l'interface de vote

Une fois connecte, vous etes automatiquement redirige vers l'interface de vote.

**[ESPACE POUR CAPTURE D'ECRAN - Interface de vote principale]**

---

## 4.3 Voter

### Presentation de l'interface de vote

L'interface est divisee en deux parties :

| Zone | Contenu |
|------|---------|
| **Partie gauche** | Liste des categories (postes a pourvoir) |
| **Partie droite** | Liste des candidats de la categorie selectionnee |

**[ESPACE POUR CAPTURE D'ECRAN - Vue globale de l'interface de vote]**

---

### Etape 1 : Selectionner une categorie

Dans la colonne de gauche, cliquez sur la categorie pour laquelle vous souhaitez voter (ex: "President", "Vice-President", etc.).

> **Indication visuelle** : Les categories pour lesquelles vous avez deja vote sont marquees d'une coche verte.

**[ESPACE POUR CAPTURE D'ECRAN - Liste des categories avec indicateurs]**

---

### Etape 2 : Consulter les candidats

Les candidats de la categorie selectionnee s'affichent a droite avec :
- Leur photo
- Leur nom
- Leur description ou programme

**[ESPACE POUR CAPTURE D'ECRAN - Affichage des candidats]**

---

### Etape 3 : Choisir votre candidat

Cliquez sur le bouton **"Voter"** sous le candidat de votre choix.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton voter sous un candidat]**

---

### Etape 4 : Confirmer votre vote

Une fenetre de confirmation apparait avec :
- Un avertissement : **"Votre vote est definitif et ne pourra pas etre modifie"**
- Le nom de la categorie
- Le candidat selectionne avec sa photo

Cliquez sur **"Confirmer"** pour valider votre vote.

**[ESPACE POUR CAPTURE D'ECRAN - Modal de confirmation du vote]**

---

### Etape 5 : Vote enregistre

Un message de succes confirme que votre vote a ete pris en compte.

**[ESPACE POUR CAPTURE D'ECRAN - Message de succes]**

---

## 4.4 Suivre votre progression

### Barre de progression

En haut de l'interface, une barre de progression indique combien de categories vous avez deja votees.

Exemple : **"2/3 categories votees"**

**[ESPACE POUR CAPTURE D'ECRAN - Barre de progression]**

---

### Consulter vos votes

Cliquez sur le bouton **"Voir mes votes"** pour afficher un recapitulatif de tous vos votes.

**[ESPACE POUR CAPTURE D'ECRAN - Recapitulatif des votes]**

---

## 4.5 Resume du processus de vote

```
1. CONNEXION
   └── Entrer email + code 6 chiffres
         |
         v
2. SELECTION CATEGORIE
   └── Choisir le poste (President, Tresorier, etc.)
         |
         v
3. CONSULTATION CANDIDATS
   └── Voir photos, noms, programmes
         |
         v
4. VOTE
   └── Cliquer sur "Voter" pour le candidat choisi
         |
         v
5. CONFIRMATION
   └── Confirmer le choix (vote definitif)
         |
         v
6. REPETITION
   └── Recommencer pour chaque categorie
```

---

# 5. GUIDE ADMINISTRATEUR

## 5.1 Connexion administrateur

### Etape 1 : Acceder a la page de connexion

Rendez-vous sur la plateforme et cliquez sur **"Se connecter"**.

**[ESPACE POUR CAPTURE D'ECRAN - Page de connexion admin]**

---

### Etape 2 : Saisir vos identifiants

Entrez votre email et votre mot de passe administrateur.

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire de connexion admin]**

---

### Etape 3 : Acces au tableau de bord

Vous etes redirige vers le tableau de bord administrateur.

**[ESPACE POUR CAPTURE D'ECRAN - Dashboard admin]**

---

## 5.2 Creer une election (Instance)

### Etape 1 : Acceder a la section Instances

Dans le menu, cliquez sur **"Instances"** ou **"Elections"**.

**[ESPACE POUR CAPTURE D'ECRAN - Menu avec section Instances]**

---

### Etape 2 : Creer une nouvelle instance

Cliquez sur le bouton **"Nouvelle Instance"** ou **"Creer"**.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton nouvelle instance]**

---

### Etape 3 : Configurer l'election

Remplissez le formulaire :

| Champ | Description |
|-------|-------------|
| **Nom** | Le titre de l'election (ex: "Elections Bureau 2024") |
| **Logo** | Image representant l'election (optionnel) |
| **Couleur principale** | Couleur des boutons et elements principaux |
| **Couleur secondaire** | Couleur des en-tetes et arriere-plans |
| **Couleur d'accent** | Couleur des elements mis en avant |

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire de creation d'instance]**

---

### Etape 4 : Valider la creation

Cliquez sur **"Creer"** pour finaliser. L'election est creee en statut **"Brouillon"**.

**[ESPACE POUR CAPTURE D'ECRAN - Instance creee en brouillon]**

---

## 5.3 Creer les categories de vote

### Etape 1 : Acceder aux categories

Selectionnez votre election, puis allez dans la section **"Categories"**.

**[ESPACE POUR CAPTURE D'ECRAN - Section categories]**

---

### Etape 2 : Ajouter une categorie

Cliquez sur **"Ajouter une categorie"**.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton ajouter categorie]**

---

### Etape 3 : Configurer la categorie

Remplissez :
- **Nom** : Le titre du poste (ex: "President", "Secretaire")
- **Description** : Details sur le role (optionnel)

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire categorie]**

---

### Etape 4 : Repeter pour chaque poste

Creez autant de categories que de postes a pourvoir.

**[ESPACE POUR CAPTURE D'ECRAN - Liste des categories creees]**

---

## 5.4 Ajouter les candidats

### Etape 1 : Acceder aux candidats

Allez dans la section **"Candidats"**.

**[ESPACE POUR CAPTURE D'ECRAN - Section candidats]**

---

### Etape 2 : Selectionner la categorie

Choisissez la categorie pour laquelle vous souhaitez ajouter un candidat.

**[ESPACE POUR CAPTURE D'ECRAN - Selection de categorie]**

---

### Etape 3 : Ajouter un candidat

Cliquez sur **"Ajouter un candidat"** et remplissez :

| Champ | Description |
|-------|-------------|
| **Nom complet** | Nom du candidat |
| **Description** | Biographie, parti, slogan (optionnel) |
| **Programme** | Lien vers le programme detaille (optionnel) |
| **Photo** | Photo du candidat (optionnel) |

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire candidat]**

---

### Etape 4 : Visualiser les candidats

Les candidats apparaissent sous forme de cartes avec leur photo et informations.

**[ESPACE POUR CAPTURE D'ECRAN - Grille des candidats]**

---

## 5.5 Gerer les electeurs

### Etape 1 : Acceder a la liste des electeurs

Allez dans la section **"Electeurs"** ou **"Voters"**.

**[ESPACE POUR CAPTURE D'ECRAN - Section electeurs]**

---

### Methode A : Ajout manuel

#### Etape 2a : Ajouter un electeur

Cliquez sur **"Ajouter un electeur"** et remplissez :
- **Nom complet**
- **Adresse email**

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire ajout electeur]**

---

### Methode B : Import par fichier Excel/CSV

#### Etape 2b : Preparer le fichier

Telechargez le modele en cliquant sur **"Telecharger le modele"**.

Le fichier doit contenir deux colonnes :
- `full_name` : Nom complet
- `email` : Adresse email

**[ESPACE POUR CAPTURE D'ECRAN - Modele Excel]**

---

#### Etape 3b : Importer le fichier

Cliquez sur **"Importer"** et selectionnez votre fichier.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton import]**

---

#### Etape 4b : Apercu et validation

Un apercu des electeurs a importer s'affiche. Verifiez et cliquez sur **"Confirmer l'import"**.

**[ESPACE POUR CAPTURE D'ECRAN - Apercu import avec liste]**

---

#### Etape 5b : Resultat de l'import

Un resume indique le nombre d'electeurs importes et les eventuelles erreurs.

**[ESPACE POUR CAPTURE D'ECRAN - Resultat import]**

---

### Suivi des inscriptions

Le tableau affiche pour chaque electeur :
- **Nom**
- **Email**
- **Statut** : "Inscrit" (a cree son compte) ou "Non inscrit" (en attente)
- **Date d'inscription**

**[ESPACE POUR CAPTURE D'ECRAN - Tableau electeurs avec statuts]**

---

## 5.6 Demarrer l'election

### Etape 1 : Verifier la configuration

Assurez-vous que :
- Les categories sont creees
- Les candidats sont ajoutes
- Les electeurs sont importes

**[ESPACE POUR CAPTURE D'ECRAN - Checklist avant demarrage]**

---

### Etape 2 : Demarrer l'election

Dans le menu d'actions de l'instance, cliquez sur **"Demarrer"**.

> Le statut passe de **"Brouillon"** a **"Active"**.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton demarrer]**

---

### Etape 3 : L'election est ouverte

Les electeurs peuvent maintenant voter.

**[ESPACE POUR CAPTURE D'ECRAN - Instance avec statut Active]**

---

## 5.7 Surveiller les resultats en temps reel

### Etape 1 : Acceder aux resultats

Allez dans la section **"Resultats"**.

**[ESPACE POUR CAPTURE D'ECRAN - Section resultats]**

---

### Etape 2 : Consulter les statistiques globales

Vous voyez :
- **Nombre d'electeurs inscrits**
- **Nombre de votes exprimes**
- **Taux de participation** (%)

**[ESPACE POUR CAPTURE D'ECRAN - Statistiques globales]**

---

### Etape 3 : Voir les resultats par categorie

Pour chaque categorie :
- Nombre total de votes
- Pour chaque candidat :
  - Nombre de votes
  - Pourcentage
  - Classement (1er, 2eme, 3eme...)
  - Barre de progression visuelle

**[ESPACE POUR CAPTURE D'ECRAN - Resultats detailles par categorie]**

---

### Etape 4 : Actualiser les resultats

Cliquez sur **"Actualiser"** pour mettre a jour les donnees en temps reel.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton actualiser]**

---

## 5.8 Gerer l'etat de l'election

### Mettre en pause

Si necessaire, cliquez sur **"Pause"** pour suspendre temporairement les votes.

> Les electeurs ne peuvent plus voter tant que l'election est en pause.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton pause]**

---

### Reprendre

Cliquez sur **"Reprendre"** pour reactiver les votes.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton reprendre]**

---

### Terminer l'election

Cliquez sur **"Terminer"** pour cloturer definitivement l'election.

> Les resultats sont figes et plus aucun vote n'est possible.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton terminer]**

---

### Archiver

Cliquez sur **"Archiver"** pour conserver l'election dans l'historique.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton archiver]**

---

## 5.9 Gerer les observateurs

### Etape 1 : Acceder a la section Observateurs

Allez dans **"Observateurs"**.

**[ESPACE POUR CAPTURE D'ECRAN - Section observateurs]**

---

### Etape 2 : Ajouter un observateur

Cliquez sur **"Ajouter un observateur"** et entrez son adresse email.

> Un email avec les identifiants de connexion sera automatiquement envoye.

**[ESPACE POUR CAPTURE D'ECRAN - Formulaire ajout observateur]**

---

### Etape 3 : Gerer les observateurs

Vous pouvez supprimer un observateur si necessaire via le menu d'actions.

**[ESPACE POUR CAPTURE D'ECRAN - Liste observateurs avec actions]**

---

## 5.10 Resume du processus administrateur

```
1. CREATION INSTANCE
   └── Nom, logo, couleurs
         |
         v
2. CONFIGURATION CATEGORIES
   └── President, Vice-president, etc.
         |
         v
3. AJOUT CANDIDATS
   └── Pour chaque categorie
         |
         v
4. IMPORT ELECTEURS
   └── Manuel ou fichier Excel
         |
         v
5. AJOUT OBSERVATEURS (optionnel)
   └── Email des observateurs
         |
         v
6. DEMARRAGE ELECTION
   └── Statut: Active
         |
         v
7. SURVEILLANCE
   └── Resultats en temps reel
         |
         v
8. CLOTURE
   └── Terminer puis Archiver
```

---

# 6. GUIDE OBSERVATEUR

## 6.1 Role de l'observateur

L'observateur a un **acces en lecture seule** a l'election. Son role est de :
- Surveiller le bon deroulement de l'election
- Consulter les resultats en temps reel
- Verifier la transparence du processus

> **Important** : L'observateur ne peut **pas** modifier les donnees, voter, ou acceder aux fonctions d'administration.

---

## 6.2 Connexion observateur

### Etape 1 : Recevoir les identifiants

Vous recevez un email de l'administrateur contenant :
- L'adresse de la plateforme
- Vos identifiants de connexion

**[ESPACE POUR CAPTURE D'ECRAN - Email d'invitation observateur]**

---

### Etape 2 : Se connecter

Rendez-vous sur la plateforme et connectez-vous avec les identifiants recus.

**[ESPACE POUR CAPTURE D'ECRAN - Page de connexion observateur]**

---

### Etape 3 : Acces a l'interface

Vous etes redirige vers le tableau de bord de l'election.

**[ESPACE POUR CAPTURE D'ECRAN - Dashboard observateur]**

---

## 6.3 Consulter les informations de l'election

### Voir les details de l'instance

Vous pouvez consulter :
- Le nom de l'election
- Le statut actuel (Active, En pause, Terminee)
- Les dates importantes

**[ESPACE POUR CAPTURE D'ECRAN - Details instance vue observateur]**

---

### Voir les categories

Acces en lecture seule a la liste des categories (postes a pourvoir).

**[ESPACE POUR CAPTURE D'ECRAN - Categories vue observateur]**

---

### Voir les candidats

Acces en lecture seule a la liste de tous les candidats avec leurs informations.

**[ESPACE POUR CAPTURE D'ECRAN - Candidats vue observateur]**

---

## 6.4 Surveiller les resultats

### Etape 1 : Acceder aux resultats

Cliquez sur la section **"Resultats"** dans le menu.

**[ESPACE POUR CAPTURE D'ECRAN - Menu resultats observateur]**

---

### Etape 2 : Consulter les statistiques

Vous voyez les memes informations que l'administrateur :
- Nombre d'electeurs inscrits
- Nombre de votes
- Taux de participation

**[ESPACE POUR CAPTURE D'ECRAN - Statistiques vue observateur]**

---

### Etape 3 : Voir les resultats par candidat

Pour chaque categorie et chaque candidat :
- Nombre de votes recus
- Pourcentage
- Position dans le classement

**[ESPACE POUR CAPTURE D'ECRAN - Resultats detailles observateur]**

---

### Etape 4 : Actualiser les donnees

Cliquez sur **"Actualiser"** pour obtenir les donnees les plus recentes.

**[ESPACE POUR CAPTURE D'ECRAN - Bouton actualiser observateur]**

---

## 6.5 Resume des droits observateur

| Action | Autorise |
|--------|----------|
| Voir les details de l'election | Oui |
| Voir les categories | Oui |
| Voir les candidats | Oui |
| Voir les resultats en temps reel | Oui |
| Voir le taux de participation | Oui |
| Modifier des donnees | **Non** |
| Voter | **Non** |
| Ajouter/supprimer des electeurs | **Non** |
| Demarrer/arreter l'election | **Non** |

---

# ANNEXES

## A. Glossaire

| Terme | Definition |
|-------|------------|
| **Instance** | Une election complete avec ses categories, candidats et electeurs |
| **Categorie** | Un poste a pourvoir (ex: President) |
| **Candidat** | Une personne qui se presente a un poste |
| **Electeur (Voter)** | Une personne autorisee a voter |
| **Observateur** | Une personne qui surveille l'election sans pouvoir modifier |
| **Administrateur** | La personne qui cree et gere l'election |

## B. Statuts d'une election

| Statut | Description |
|--------|-------------|
| **Brouillon** | Election en cours de configuration, pas encore demarree |
| **Active** | Election en cours, les electeurs peuvent voter |
| **En pause** | Election temporairement suspendue |
| **Terminee** | Election close, plus de votes possibles |
| **Archivee** | Election conservee pour historique |

## C. Support technique

En cas de probleme :
1. Verifiez votre connexion internet
2. Verifiez que vous utilisez la bonne adresse email
3. Verifiez vos spams pour le code de connexion
4. Contactez l'administrateur de votre election

---

*Document genere pour la plateforme de vote electronique MDev Election*
