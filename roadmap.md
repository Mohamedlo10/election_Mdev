# ESEA - Election System Enterprise Application

## 📋 CONTEXTE PROJET
Plateforme d'élection multi-instances avec gestion des votants, candidats par catégories, et suivi des votes en temps réel.

## 🔧 STACK TECHNIQUE
- **Frontend**: Next.js 16.1.4 (App Router)
- **Backend**: Supabase (Auth + Database + Storage)
- **Email**: Nodemailer
- **Styling**: Tailwind CSS v4
- **État**: React Context (useAuth, useElection)
- **Icons**: Lucide React
- **Excel**: xlsx

## 🎨 DESIGN
- Couleurs: blanc, gris, vert (#22c55e), jaune (#eab308), rouge (#ef4444), noir
- Design slim, smooth, mobile-first
- Couleurs dynamiques selon instance d'élection

## 👥 RÔLES
1. **Super Admin**: Crée/gère toutes les instances d'élection
2. **Admin**: Gère une instance (catégories, candidats, votants, démarrage/arrêt)
3. **Observateur**: Consulte le dashboard des tendances
4. **Votant**: S'inscrit et vote par catégorie

## 🗃️ STRUCTURE BASE DE DONNÉES
- election_instances (id, name, logo_url, primary_color, secondary_color, accent_color, status, created_by, created_at, updated_at, started_at, ended_at)
- categories (id, instance_id, name, description, order, created_at)
- candidates (id, category_id, full_name, description, program_url, photo_url, created_at)
- voters (id, instance_id, full_name, email, auth_uid, is_registered, registered_at, created_at)
- votes (id, voter_id, candidate_id, category_id, instance_id, created_at)
- users_roles (id, user_id, instance_id, role, created_at)

## 📁 STRUCTURE FICHIERS IMPLÉMENTÉE
```
/app
  /layout.tsx                    ✅ Layout principal avec AuthProvider
  /page.tsx                      ✅ Landing page
  /(auth)
    /layout.tsx                  ✅ Layout auth
    /login/page.tsx              ✅ Page connexion
    /register/page.tsx           ✅ Page inscription
  /(dashboard)
    /layout.tsx                  ✅ Layout dashboard avec Sidebar
    /dashboard/page.tsx          ✅ Dashboard principal
    /dashboard/instances/page.tsx ✅ CRUD instances (super admin)
    /dashboard/categories/page.tsx ✅ CRUD catégories
    /dashboard/candidates/page.tsx ✅ CRUD candidats
    /dashboard/voters/page.tsx   ✅ Gestion votants + import Excel
    /dashboard/vote/page.tsx     ✅ Interface de vote
    /dashboard/results/page.tsx  ✅ Résultats temps réel
    /dashboard/settings/page.tsx ✅ Paramètres instance
  /api
    /auth/register/route.ts      ✅ API inscription

/components
  /ui
    /Button.tsx                  ✅
    /Input.tsx                   ✅
    /Card.tsx                    ✅
    /Alert.tsx                   ✅
    /Modal.tsx                   ✅
    /Badge.tsx                   ✅
    /Select.tsx                  ✅
    /Textarea.tsx                ✅
  /dashboard
    /Sidebar.tsx                 ✅ Navigation sidebar

/lib
  /supabase
    /client.ts                   ✅ Client browser
    /server.ts                   ✅ Client server
    /middleware.ts               ✅ Session middleware
  /services
    /auth.service.ts             ✅ Authentification
    /email.service.ts            ✅ Envoi emails
    /election.service.ts         ✅ Gestion instances
    /category.service.ts         ✅ Gestion catégories
    /candidate.service.ts        ✅ Gestion candidats
    /voter.service.ts            ✅ Gestion votants + import
    /vote.service.ts             ✅ Gestion votes + résultats

/hooks
  /useAuth.tsx                   ✅ Auth context + cache
  /useElection.tsx               ✅ Election context

/types
  /index.ts                      ✅ Types TypeScript

/supabase
  /schema.sql                    ✅ Schéma SQL complet

/middleware.ts                   ✅ Protection routes
/.env.local.example              ✅ Variables d'environnement
```

---

## 🚀 ROADMAP D'EXÉCUTION

### PHASE 1: SETUP INITIAL ✅ TERMINÉE
- [x] Créer fichier roadmap
- [x] Initialiser projet Next.js (v16.1.4)
- [x] Configurer Tailwind CSS (v4)
- [x] Configurer Supabase client (lib/supabase/client.ts, server.ts, middleware.ts)
- [x] Créer types TypeScript (types/index.ts)
- [x] Créer schéma SQL Supabase (supabase/schema.sql)
- [x] Créer structure dossiers (components, lib, hooks, types)
- [x] Créer middleware Next.js (middleware.ts)
- [x] Installer dépendances (@supabase/supabase-js, nodemailer, xlsx, lucide-react)

### PHASE 2: AUTHENTIFICATION ✅ TERMINÉE
- [x] Créer useAuth hook (hooks/useAuth.tsx)
- [x] Page de login votant (app/(auth)/login/page.tsx)
- [x] Page de register (app/(auth)/register/page.tsx)
- [x] Logique d'inscription (vérification email + envoi code 6 chiffres)
- [x] Configuration Nodemailer (lib/services/email.service.ts)
- [x] API route register (app/api/auth/register/route.ts)
- [x] Middleware de protection routes (middleware.ts)
- [x] Composants UI (Button, Input, Card, Alert, Modal, Badge, Select, Textarea)
- [x] Landing page (app/page.tsx)

### PHASE 3: SUPER ADMIN ✅ TERMINÉE
- [x] Dashboard super admin (app/(dashboard)/dashboard/page.tsx)
- [x] CRUD instances d'élection (app/(dashboard)/dashboard/instances/page.tsx)
- [x] Service election (lib/services/election.service.ts)
- [x] Gestion statut élection (draft, active, paused, completed, archived)
- [x] Sidebar navigation (components/dashboard/Sidebar.tsx)

### PHASE 4: ADMIN INSTANCE ✅ TERMINÉE
- [x] CRUD catégories (app/(dashboard)/dashboard/categories/page.tsx)
- [x] CRUD candidats (app/(dashboard)/dashboard/candidates/page.tsx)
- [x] Import votants Excel (app/(dashboard)/dashboard/voters/page.tsx)
- [x] Services (category.service.ts, candidate.service.ts, voter.service.ts)
- [x] Démarrer/Arrêter élection (app/(dashboard)/dashboard/settings/page.tsx)

### PHASE 5: INTERFACE VOTANT ✅ TERMINÉE
- [x] Page de vote par catégorie (app/(dashboard)/dashboard/vote/page.tsx)
- [x] Sélection candidat avec confirmation
- [x] Suivi progression (catégories votées)
- [x] Vote service (lib/services/vote.service.ts)

### PHASE 6: DASHBOARD & RÉSULTATS ✅ TERMINÉE
- [x] Dashboard temps réel (app/(dashboard)/dashboard/results/page.tsx)
- [x] Statistiques (participation, votes, votants)
- [x] Résultats par catégorie avec barres de progression
- [x] Actualisation temps réel

### PHASE 7: FINALISATION ⏳ À FAIRE
- [ ] Configurer Supabase (créer projet + exécuter schema.sql)
- [ ] Créer les buckets Storage (logos, photos, programs)
- [ ] Créer un super admin initial
- [ ] Tests complets
- [ ] Optimisations production

---

## 📝 CONFIGURATION REQUISE

### 1. Créer un projet Supabase
1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Copier l'URL et la clé anon dans .env.local

### 2. Exécuter le schéma SQL
1. Aller dans SQL Editor de Supabase
2. Copier le contenu de supabase/schema.sql
3. Exécuter le script

### 3. Configurer les buckets Storage
Dans Supabase Storage, créer :
- `logos` (public)
- `photos` (public)
- `programs` (public)

### 4. Créer un super admin
```sql
-- Créer un utilisateur admin via Auth
-- Puis ajouter son rôle :
INSERT INTO users_roles (user_id, role)
VALUES ('UUID_DU_USER', 'super_admin');
```

### 5. Variables d'environnement (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@example.com
```

---

## 📝 NOTES DE SESSION
- Projet complet implémenté de la Phase 1 à la Phase 6
- Architecture modulaire avec services séparés
- Authentification par code 6 chiffres pour votants
- Import Excel fonctionnel
- Dashboard avec statistiques temps réel
- Interface de vote intuitive avec confirmation
