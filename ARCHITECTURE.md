# Architecture & Flow Diagrams

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  KhananNetra Application                    │
│                   (Next.js 16 + React 19)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Admin Portal  │  │ Geo Analyst      │  │  Other Portals   │
│                 │  │ Portal (NEW)     │  │  (Compliance,    │
│  /admin         │  │                  │  │   Government)    │
│  /admin/*       │  │ /geo-analyst/... │  │                  │
└────────┬────────┘  └──────────┬───────┘  └──────────┬───────┘
         │                      │                      │
         └──────────┬───────────┴──────────┬───────────┘
                    │                      │
         ┌──────────▼──────────┐  ┌───────▼──────────┐
         │  AuthContext.tsx    │  │  LayoutClient    │
         │  (Authentication &  │  │  (Route          │
         │   Authorization)    │  │   Protection)    │
         └──────────┬──────────┘  └──────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Backend API        │
         │  (Node/Express)      │
         │  Port: 5000          │
         │                      │
         │ /auth/login          │
         │ /auth/refresh-token  │
         │ /auth/logout         │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Database           │
         │   (MongoDB)          │
         └──────────────────────┘
```

---

## 🔐 Authentication Flow

```
User Access
    │
    ▼
┌─────────────────────┐
│  /geo-analyst/login │  (Unprotected page)
│  GeoAnalystLoginPage│
└──────────┬──────────┘
           │
           │ User enters credentials
           ▼
┌──────────────────────────┐
│ GeoAnalystLoginForm.tsx  │
│                          │
│ - Validate inputs        │
│ - Show loading spinner   │
│ - Call login()           │
└──────────┬───────────────┘
           │
           │ POST /auth/geo-analyst/login
           ▼
┌──────────────────────────┐
│  Backend API             │
│  - Verify credentials    │
│  - Create JWT token      │
│  - Return user data      │
└──────────┬───────────────┘
           │
           │ Response: { user, token, refreshToken }
           ▼
┌──────────────────────────┐
│  AuthContext.tsx         │
│  - Set user state        │
│  - Store token in cookie │
│  - Update isAuthenticated│
└──────────┬───────────────┘
           │
           │ Navigate to /geo-analyst/dashboard
           ▼
┌────────────────────────────┐
│ /geo-analyst/dashboard     │  (Protected page)
│ useGeoAnalyst() hook       │
│                            │
│ - Check isAuthenticated    │
│ - Verify userType          │
│ - Render dashboard         │
└────────────────────────────┘
```

---

## 📂 Component Hierarchy

```
RootLayout (app/layout.tsx)
    │
    ├── Metadata setup
    └── HTML wrapper
            │
            ▼
LayoutClient (app/LayoutClient.tsx)
    │
    ├─ SnackbarProvider
    │   │
    │   └─ AuthProvider
    │       │
    │       └─ Check: unprotectedPages?
    │           │
    │           ├─ YES (Login pages)
    │           │  └─ Render without sidebar
    │           │
    │           └─ NO (Protected pages)
    │              └─ ProtectedLayout
    │                 │
    │                 ├─ SidebarProvider
    │                 │
    │                 ├─ AppSidebar
    │                 │  └─ Navigation menu
    │                 │
    │                 ├─ Header
    │                 │
    │                 └─ Main Content
    │                    └─ {children}
    │
    └─ Router-level pages
       │
       ├─ /login
       │  └─ LoginForm (Admin)
       │
       ├─ /geo-analyst/login          (NEW)
       │  └─ GeoAnalystLoginPage      (NEW)
       │     └─ GeoAnalystLoginForm   (NEW)
       │
       ├─ /geo-analyst/dashboard      (NEW)
       │  └─ useGeoAnalyst()
       │
       ├─ /admin
       │  └─ Admin Dashboard
       │
       └─ /profile
          └─ User Profile
```

---

## 🔄 Data Flow - Login Process

```
┌─ GeoAnalystLoginPage (Client Component)
│  │
│  ├─ State: email, password, loading, error
│  │
│  └─ On form submit:
│     │
│     ├─ 1. Validate inputs
│     │
│     ├─ 2. Call AuthContext.login(email, password)
│     │   │
│     │   ├─ 3. apiClient.post('/auth/login', { email, password })
│     │   │   │
│     │   │   └─ 4. Backend validates & returns:
│     │   │      { user: {...}, token: "...", refreshToken: "..." }
│     │   │
│     │   ├─ 5. Check: user.userType === 'GEO_ANALYST'?
│     │   │   └─ YES: Continue
│     │   │   └─ NO: Throw error
│     │   │
│     │   └─ 6. Update state:
│     │      - setUser(user)
│     │      - setIsAuthenticated(true)
│     │      - Store token in HTTP-only cookie
│     │
│     └─ 7. Redirect to /geo-analyst/dashboard
│        │
│        └─ 8. Dashboard loads with useAuth()
│           └─ Checks isAuthenticated && user.userType
```

---

## 🛡️ Route Protection Logic

```
User navigates to /some-route
    │
    ▼
LayoutClient checks:
    │
    ├─ Is route in unprotectedPages?
    │
    ├─ YES (e.g., /login, /geo-analyst/login)
    │ │
    │ └─ Render without sidebar
    │    └─ No auth check needed
    │
    └─ NO (e.g., /admin, /geo-analyst/dashboard)
       │
       └─ ProtectedLayout renders:
          │
          ├─ Check: isAuthenticated?
          │
          ├─ NO → Show loading spinner → Redirect to /login
          │
          └─ YES → Render with sidebar + content
             │
             └─ Components can use useAuth()
                or useGeoAnalyst() to verify role
```

---

## 📊 File Dependencies

```
Authentication Chain:
────────────────────

GeoAnalystLoginPage.tsx
    │
    ├─ imports AuthContext
    ├─ imports SnackbarContext
    └─ imports useRouter
            │
            ▼
        AuthContext.tsx
            │
            ├─ imports apiClient
            ├─ imports LoginForm
            └─ uses User type
                    │
                    ▼
                types/geo-analyst.ts
                    │
                    └─ Exports GeoAnalystUser, GeoAnalystRole


Route Protection Chain:
──────────────────────

LayoutClient.tsx
    │
    ├─ wraps AuthProvider
    ├─ checks unprotectedPages
    └─ conditionally renders ProtectedLayout
            │
            ▼
        AppSidebar.tsx
            │
            ├─ imports sidebar/constants.ts
            └─ uses AuthContext


Geo Analyst Dashboard Chain:
────────────────────────────

GeoAnalystDashboard (page.tsx)
    │
    ├─ imports useGeoAnalyst hook
    └─ uses useRouter
            │
            ▼
        useGeoAnalyst.ts (custom hook)
            │
            ├─ wraps useAuth
            ├─ checks user.userType
            └─ auto-redirects if not geo-analyst
```

---

## 🗂️ API Endpoint Mapping

```
Frontend Path                 Backend Endpoint              Method
─────────────────────────────────────────────────────────────────

/login
  └─ LoginForm              POST /auth/login               admin login


/geo-analyst/login          (NEW)
  └─ GeoAnalystLoginForm    POST /auth/geo-analyst/login  geo analyst login
                            POST /auth/login              (with userType check)


/admin
  └─ AdminDashboard         GET /auth/profile              get user data
                            GET /admin/dashboard/...       various


/geo-analyst/dashboard      (NEW)
  └─ GeoAnalystDashboard    GET /auth/profile              get user data
                            GET /geo-analyst/...           various


All Protected Routes:
  │
  ├─ Request fails with 401
  │
  └─ Interceptor:
     POST /auth/refresh-token    refresh JWT token
     GET /auth/profile           get latest user data


Logout:
  └─ POST /auth/logout            clear token & session
```

---

## 🎯 State Management

```
Context: AuthContext
│
├─ State Variables:
│  ├─ user: User | null
│  ├─ isAuthenticated: boolean
│  ├─ loading: boolean
│  ├─ error: string | null
│  └─ roles: Role[]
│
├─ Methods:
│  ├─ login(email, password) → Promise<User>
│  ├─ logout() → Promise<void>
│  ├─ refreshToken() → Promise<void>
│  ├─ hasPermission(permissionKey) → boolean
│  └─ getUserRole() → Role | null
│
└─ Provides to:
   ├─ LayoutClient
   ├─ GeoAnalystLoginPage
   ├─ GeoAnalystDashboard
   ├─ AppSidebar
   ├─ Header
   └─ All protected components


Context: SnackbarContext
│
├─ State Variables:
│  ├─ message: string
│  ├─ severity: 'success' | 'error' | 'warning' | 'info'
│  └─ open: boolean
│
├─ Methods:
│  └─ showSnackbar(message, severity)
│
└─ Used by:
   ├─ GeoAnalystLoginPage (show error/success)
   ├─ Header
   ├─ Admin Dashboard
   └─ All components needing notifications
```

---

## 🔀 Routing Overview

```
App Router Structure (Next.js App Directory):
────────────────────────────────────────────

/                              → Redirects to /admin
├─ /login                      → Admin login page
├─ /forgot-password
├─ /reset-password
├─ /admin                      → Admin dashboard (protected)
│  └─ /admin/*                 → Admin sub-pages
├─ /profile                    → User profile (protected)
│
└─ /geo-analyst/               (NEW)
   ├─ /login                   → Geo analyst login (NEW)
   ├─ /forgot-password         → Geo analyst forgot password (NEW)
   ├─ /dashboard               → Geo analyst dashboard (protected) (NEW)
   ├─ /analysis/*              → Analysis pages (NEW)
   └─ /reports/*               → Report pages (NEW)


Protected vs Unprotected:
─────────────────────────

Unprotected (can access without login):
  /login
  /forgot-password
  /reset-password
  /geo-analyst/login           (NEW)
  /geo-analyst/forgot-password (NEW)
  /

Protected (require authentication):
  /admin
  /admin/*
  /profile
  /geo-analyst/dashboard       (NEW)
  /geo-analyst/analysis/*      (NEW)
  /geo-analyst/reports/*       (NEW)
```

---

## 🎨 UI Component Tree - Login Page

```
GeoAnalystLoginPage
│
└─ Box (gradient background)
   │
   └─ Grid (2 columns, responsive)
      │
      ├─ Grid Item 1 (left - hidden on mobile)
      │  ├─ Card (Verified Professionals)
      │  │  └─ Typography
      │  │
      │  └─ Card (Geospatial Analysis)
      │     └─ Typography
      │
      └─ Grid Item 2 (right - login form)
         │
         └─ Paper (white container)
            │
            ├─ Box (header section)
            │  ├─ Box (gradient circle with emoji)
            │  ├─ Typography (h4 - title)
            │  ├─ Typography (subtitle)
            │  ├─ Divider
            │  └─ Typography (caption)
            │
            ├─ Alert (error - conditional)
            │
            ├─ form (login form)
            │  ├─ TextField (email)
            │  ├─ TextField (password)
            │  ├─ Button (Sign In - with loader)
            │  │
            │  └─ Box (links)
            │     ├─ Button (Forgot Password)
            │     └─ Button (Admin Login)
            │
            ├─ Divider
            │
            └─ Typography (footer/support)
```

---

## 🔌 Integration Points with Old Frontend

```
old_front/frontend
│
├─ Copy STYLING approach:
│  └─ tailwind.config.js
│  └─ postcss.config.js
│  └─ src/App.css
│
├─ Copy DESIGN patterns:
│  └─ Component structure
│  └─ Form layouts
│  └─ Color scheme
│  └─ Typography
│
├─ Copy API LOGIC:
│  └─ Request/response handling
│  └─ Error handling patterns
│  └─ Token management (adapt to HTTP-only cookies)
│
├─ Copy ASSETS:
│  └─ Logos
│  └─ Icons
│  └─ Images
│
└─ DON'T copy:
   └─ Build system (webpack, CRA)
   └─ node_modules
   └─ Package dependencies (use new project's)
   └─ Create React App config


Integration Flow:
─────────────────

old_front/frontend
    ├─ Review styling/branding
    │
    ├─ Extract design tokens:
    │  ├─ Colors
    │  ├─ Fonts
    │  ├─ Spacing
    │  └─ Shadows
    │
    └─ Apply to new components:
       └─ GeoAnalystLoginPage.tsx
          └─ Tailwind config + MUI sx prop
```

---

**Use this guide to understand the complete flow and architecture!** 🗺️

