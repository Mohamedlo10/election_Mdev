# ESEA - Election System Enterprise Application

## 📋 CONTEXTE PROJET
Plateforme d'élection multi-instances avec gestion des votants, candidats par catégories, et suivi des votes en temps réel.

## 🔧 STACK TECHNIQUE
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Supabase (Auth + Database + Storage)
- **Email**: Nodemailer
- **Styling**: Tailwind CSS
- **État**: React Context (useAuth)

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
- election_instances (id, name, logo_url, primary_color, secondary_color, status, created_by, created_at)
- categories (id, instance_id, name, description, order)
- candidates (id, category_id, full_name, description, program_url, photo_url)
- voters (id, instance_id, full_name, email, auth_uid, is_registered, registered_at)
- votes (id, voter_id, candidate_id, category_id, created_at)
- users_roles (id, user_id, instance_id, role)

## 📁 STRUCTURE FICHIERS
```
/app
  /layout.tsx
  /page.tsx (landing)
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /dashboard/page.tsx
    /admin/
      /instances/page.tsx
      /categories/page.tsx
      /candidates/page.tsx
      /voters/page.tsx
    /vote/page.tsx
    /results/page.tsx
/components
  /ui (boutons, inputs, cards...)
  /auth
  /dashboard
  /admin
  /vote
/lib
  /supabase
    /client.ts
    /server.ts
  /services
    /auth.service.ts
    /election.service.ts
    /voter.service.ts
    /vote.service.ts
    /email.service.ts
/hooks
  /useAuth.tsx
  /useElection.tsx
/types
  /index.ts
```

---

## 🚀 ROADMAP D'EXÉCUTION

### PHASE 1: SETUP INITIAL ⏳ EN COURS
- [x] Créer fichier roadmap
- [ ] Initialiser projet Next.js
- [ ] Configurer Tailwind CSS
- [ ] Configurer Supabase client
- [ ] Créer types TypeScript
- [ ] Créer schéma SQL Supabase

### PHASE 2: AUTHENTIFICATION
- [ ] Créer useAuth hook
- [ ] Page de login votant
- [ ] Logique d'inscription (vérification email + envoi code)
- [ ] Configuration Nodemailer
- [ ] Middleware de protection routes

### PHASE 3: SUPER ADMIN
- [ ] Dashboard super admin
- [ ] CRUD instances d'élection
- [ ] Upload logo + extraction couleurs
- [ ] Gestion des admins par instance

### PHASE 4: ADMIN INSTANCE
- [ ] Dashboard admin
- [ ] CRUD catégories
- [ ] CRUD candidats
- [ ] Import votants Excel
- [ ] Démarrer/Arrêter élection

### PHASE 5: INTERFACE VOTANT
- [ ] Page de vote par catégorie
- [ ] Confirmation de vote
- [ ] Récapitulatif des votes

### PHASE 6: DASHBOARD & RÉSULTATS
- [ ] Dashboard temps réel
- [ ] Graphiques de tendances
- [ ] Export résultats

### PHASE 7: FINALISATION
- [ ] Tests complets
- [ ] Responsive design
- [ ] Optimisations

---

## 📝 NOTES DE SESSION
- Démarrage: Phase 1 - Setup initial
