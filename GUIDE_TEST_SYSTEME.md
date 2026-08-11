# Guide de Test Complet (End-to-End) — MDev_Election

Ce document contient la procédure pas-à-pas pour valider l'ensemble des fonctionnalités et garde-fous de la plateforme électorale (migrations SQL, multi-instances, rôles d'équipe, authentification par lien expirable, profil et permissions).

---

## 📋 Préalable : Appliquer les 5 Migrations SQL

Avant de lancer les tests, assurez-vous d'avoir exécuté dans l'éditeur SQL de Supabase les 5 fichiers de migration dans cet ordre exact :

1. `supabase/migrations/001_add_manager_role_and_password_tracking.sql`
2. `supabase/migrations/002_rls_manager_role.sql`
3. `supabase/migrations/003_get_user_instances_function.sql`
4. `supabase/migrations/004_conflict_of_interest_guard.sql`
5. `supabase/migrations/005_update_check_admin_email.sql`

---

## 🧪 Scénario 1 : Création et Gestion de l'Équipe d'Instance

### Objectif
Vérifier l'ajout de membres dans l'équipe d'une élection avec leurs rôles respectifs (`admin`, `manager`, `observer`).

1. Connectez-vous avec un compte Administrateur (ex: `admin@exemple.com`).
2. Accédez à une élection *(ex: Élection A)*.
3. Dans le menu latéral de gauche, cliquez sur l'onglet **"Équipe"** (`/instance/[id]/team`).
4. Cliquez sur **"+ Ajouter un membre"** :
   - Entrez un nouvel email : `manager@test.com`.
   - Sélectionnez le rôle : **Gestionnaire**.
   - Cliquez sur **"Ajouter à l'équipe"**.
5. **Résultat attendu :**
   - Une carte s'affiche avec le badge vert **Gestionnaire**.
   - Un message de confirmation vert apparaît.
   - Un email d'invitation est généré.
6. Testez la modification de rôle :
   - Sur la ligne de `manager@test.com`, cliquez sur **"Changer le rôle"**.
   - Modifiez pour **Observateur**, puis validez.
   - **Résultat attendu :** Le badge devient bleu avec la mention **Observateur**.

---

## 🧪 Scénario 2 : Rattachement d'un Compte Existant Multi-Instances

### Objectif
Vérifier qu'un utilisateur déjà administrateur d'une Élection A peut être ajouté comme Gestionnaire sur une Élection B sans créer de doublon de compte.

1. Restez connecté en tant qu'admin sur l'Élection A.
2. Basculez sur une **autre élection** *(Élection B)*.
3. Allez sur l'onglet **"Équipe"** de l'Élection B.
4. Cliquez sur **"+ Ajouter un membre"** :
   - Saisissez l'email d'un utilisateur qui a déjà un compte *(ex: `admin@exemple.com`)*.
   - Sélectionnez le rôle **Gestionnaire**.
   - Validez.
5. **Résultat attendu :**
   - L'ajout réussit avec le message : *"L'utilisateur existant a été ajouté à l'équipe..."*.
   - Aucun compte en double n'est créé dans Supabase Auth.

---

## 🧪 Scénario 3 : Test du Garde-fou Anti-Conflit d'intérêts

### Objectif
Vérifier qu'il est impossible d'attribuer un rôle d'administrateur ou gestionnaire à quelqu'un inscrit comme votant sur le même scrutin.

1. Allez sur l'Élection A dans la section **"Votants"**.
2. Ajoutez le votant `jean.votant@test.com`.
3. Allez dans la section **"Équipe"** de la **même Élection A**.
4. Essayez d'ajouter `jean.votant@test.com` avec le rôle **Gestionnaire** ou **Administrateur**.
5. **Résultat attendu :**
   - L'action est bloquée avec l'erreur :  
     *`"Conflit d'intérêts : l'utilisateur jean.votant@test.com est déjà inscrit comme VOTANT sur cette instance."`*

---

## 🧪 Scénario 4 : Première Connexion Votant (Lien expirable & Mot de passe)

### Objectif
Vérifier que les nouveaux votants reçoivent un lien expirable et définissent leur mot de passe permanent sans exposition de clé temporaire en HTTP.

1. Ajoutez un nouveau votant `nouveau.votant@test.com` sur l'Élection A (statut active).
2. Ouvrez une fenêtre de navigation privée et allez sur la page de connexion `/login`.
3. Saisissez `nouveau.votant@test.com` et cliquez sur **"Continuer"**.
4. **Résultat attendu :**
   - Écran **"Email envoyé !"** : *"Un lien de connexion a été envoyé à nouveau.votant@test.com..."*.
5. Ouvrez le lien de réinitialisation reçu par email.
6. Vous êtes redirigé vers la page `/reset-password` :
   - Entrez un mot de passe de 8 caractères minimum.
   - Observez l'indicateur dynamique de force de mot de passe.
   - Confirmez le mot de passe et validez.
7. **Résultat attendu :**
   - Écran de succès **"Mot de passe défini !"** et redirection automatique vers le Dashboard après 3 secondes.
8. En base de données, la colonne `password_set_at` de la table `voters` est désormais renseignée (`NOT NULL`).

---

## 🧪 Scénario 5 : Connexions Ultérieures & Dashboard Unifié (Hub)

### Objectif
Vérifier le comportement du Dashboard Unifié lorsque l'utilisateur a plusieurs casquettes.

1. Déconnectez-vous.
2. Reconnectez-vous avec un compte qui est **Admin sur l'Élection A** ET **Votant sur l'Élection B**.
3. Entrez son email sur `/login` ➔ Le système détecte que le mot de passe est déjà défini et affiche directement l'étape mot de passe.
4. Entrez le mot de passe et validez.
5. **Résultat attendu sur `/dashboard` (Hub Unifié) :**
   - Le Dashboard affiche **deux sections distinctes** :
     - 🛡️ **"Mes Élections à administrer"** (avec la carte de l'Élection A + bouton "Gérer").
     - 🗳️ **"Mes Scrutins de vote"** (avec la carte de l'Élection B + bouton "Accéder au vote").
   - Cliquer sur "Gérer" ouvre `/instance/A`.
   - Cliquer sur "Accéder au vote" ouvre `/instance/B/vote`.

---

## 🧪 Scénario 6 : Page Profil & Changement de mot de passe

### Objectif
Vérifier la gestion des informations et la modification sécurisée du mot de passe dans l'espace profil.

1. Depuis le Dashboard ou le Sidebar, cliquez sur **"Mon Profil"** (`/profile`).
2. Observez les informations :
   - Votre adresse email.
   - Votre rôle principal.
   - La liste de tous vos espaces accessibles.
3. Dans la section **"Sécurité — Mot de passe"** :
   - Saisissez un **mauvais** mot de passe actuel ➔ **Résultat attendu :** Erreur *"Mot de passe actuel incorrect"*.
   - Saisissez le **bon** mot de passe actuel + un nouveau mot de passe ➔ Validez.
4. **Résultat attendu :**
   - Alerte verte *"Mot de passe mis à jour avec succès"*.
5. Déconnectez-vous et réessayez de vous connecter avec le nouveau mot de passe pour confirmer la modification.

---

## 🧪 Scénario 7 : Vérification des Droits du Rôle Gestionnaire (Manager)

### Objectif
S'assurer que le Gestionnaire peut effectuer sa gestion opérationnelle sans pouvoir altérer la configuration de l'élection.

1. Connectez-vous avec le compte `manager@test.com`.
2. Accédez à l'Élection A.
3. **Actions autorisées :**
   - Accéder à l'onglet **"Votants"** : Importer, ajouter ou supprimer des votants. ✅
   - Accéder à l'onglet **"Résultats"** : Consulter la participation. ✅
4. **Actions bloquées :**
   - L'onglet **"Paramètres"** n'est **pas présent** dans le menu latéral. ✅
   - Tenter d'accéder manuellement à `/instance/A/settings` renvoie une erreur RLS/Accès refusé. ✅

---

## 🎯 Synthèse des Résultats Attendus

| Scénario | Fonctionnalité | Statut Attendu |
|---|---|---|
| 1 | Onglet Équipe (/team) & attribution de rôle | PASS |
| 2 | Ajout utilisateur existant (Multi-instances) | PASS |
| 3 | Garde-fou Anti-conflit d'intérêts (Admin = Votant) | PASS |
| 4 | Flux lien expirable & réinitialisation mot de passe | PASS |
| 5 | Dashboard Unifié (Hub Multi-contextes) | PASS |
| 6 | Profil (/profile) & changement de mot de passe | PASS |
| 7 | Permissions restreintes du rôle Manager | PASS |
