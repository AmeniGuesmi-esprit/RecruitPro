# RecruitPro - Plateforme de Recrutement Microservices

## Architecture

```
recruitment-platform/
├── eureka-server/      → Service Discovery (port 8761)
├── api-gateway/        → API Gateway + JWT filter (port 8080)
├── user-service/       → Gestion utilisateurs (port 8081)
└── frontend/           → Angular (Berry template) (port 4200)
```

## Rôles
- **ADMIN** → backoffice (Berry admin layout + sidebar)
- **COMPANY** → frontoffice (navbar simple)
- **CANDIDATE** → frontoffice (navbar simple + CV upload)

## Ordre de démarrage

```bash
# 1. Eureka Server
cd eureka-server && mvn spring-boot:run

# 2. API Gateway
cd api-gateway && mvn spring-boot:run

# 3. User Service
cd user-service && mvn spring-boot:run

# 4. Frontend
cd frontend && npm install && ng serve
```

## Base de données (PostgreSQL)
```sql
CREATE DATABASE recruitment_users;
```

## Variables d'environnement (user-service)
```
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-app-password-gmail
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

## Endpoints User Service (via Gateway → port 8080)

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| POST | /api/users/auth/register | Public | Inscription (multipart/form-data) |
| GET  | /api/users/auth/verify-email?token= | Public | Vérification email |
| POST | /api/users/auth/login | Public | Connexion |
| POST | /api/users/auth/google | Public | Connexion Google |
| GET  | /api/users/{id} | JWT | Profil utilisateur |
| PUT  | /api/users/{id} | JWT | Modifier profil |
| DELETE | /api/users/{id} | JWT | Supprimer compte |
| GET  | /api/users | JWT+ADMIN | Liste tous les users |

## Champs Register

**Tous les rôles :** prénom, nom, email, téléphone, mot de passe, rôle  
**CANDIDATE uniquement :** + CV en PDF (max 5MB)

## Angular - Structure src/app/

```
src/app/
├── login/                  → Page de connexion
├── register/               → Page d'inscription (avec upload CV)
├── frontoffice/
│   ├── layout/             → Navbar topbar (CANDIDATE & COMPANY)
│   ├── dashboard/          → Dashboard utilisateur
│   └── profile/            → Profil + modifier + supprimer compte
├── backoffice/
│   └── dashboard/          → Dashboard Admin (Berry layout + sidebar)
├── core/
│   ├── models/             → Interfaces TypeScript
│   ├── services/           → AuthService (API calls)
│   ├── guards/             → authGuard, adminGuard, guestGuard
│   └── interceptors/       → JWT interceptor
└── theme/                  → Berry layout (admin sidebar, guest)
```

## Google Sign-In Setup
1. Créer un projet sur https://console.cloud.google.com
2. Activer Google Identity API
3. Créer un OAuth 2.0 Client ID (Web)
4. Remplacer `YOUR_GOOGLE_CLIENT_ID` dans login.component.ts et register.component.ts
5. Ajouter le script GSI dans index.html :
   `<script src="https://accounts.google.com/gsi/client" async></script>`
