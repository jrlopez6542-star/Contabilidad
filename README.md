# Buñuelandia — Gestión comercial (es-CO / COP)

App de **contabilidad, ventas, cotizaciones e inventario** de **Buñuelandia** (single-tenant). Sin facturación electrónica DIAN. Marca visual: verde `#0b3d2e`, crema `#fff8e7`, oro `#d97706`.

- UI en español (**es-CO**)
- Moneda **COP**
- Facturas **internas + PDF** (sin facturación electrónica DIAN)
- Campos estructurales listos para DIAN más adelante (NIT, razón social, numeración secuencial)
- **Usuarios y roles**: `admin`, `vendedor`, `contador`

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite vía Prisma — local `file:./dev.db` o remoto **Turso (libSQL)** con `@prisma/adapter-libsql`
- Auth email/contraseña con JWT en cookie httpOnly (`jose` + `bcryptjs`)
- PDF con `pdfkit` (runtime Node, no Edge)

## Requisitos

- Node.js 18+ (recomendado 20)
- npm

## Configuración local

```bash
cd contabilidad   # o la carpeta descomprimida
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite local **o** URL Turso | `file:./dev.db` / `libsql://…turso.io` |
| `TURSO_AUTH_TOKEN` | Token de auth Turso (prod) | `eyJ…` |
| `DATABASE_AUTH_TOKEN` | Alias opcional del token Turso | `eyJ…` |
| `AUTH_SECRET` | Secreto para firmar la cookie de sesión | cadena larga aleatoria |
| `APP_URL` | URL pública de la app (enlaces de email) | `https://tu-app.vercel.app` |
| `RESEND_API_KEY` | API key de [Resend](https://resend.com) para recuperación de contraseña | `re_…` |
| `RESEND_FROM` | Remitente verificado (pruebas: `onboarding@resend.dev`) | `Buñuelandia <onboarding@resend.dev>` |

- Si `DATABASE_URL` empieza por `file:` → Prisma clásico (SQLite en disco).
- Si empieza por `libsql://` o `https://` → adapter libSQL (Turso).

> **Nota CLI:** `prisma generate` / `db push` solo aceptan URLs `file:`. Los scripts `postinstall` y `build` fuerzan `file:./dev.db` para generar el client. En runtime, la app lee el `DATABASE_URL` real (incluido Turso).

## Credenciales demo

Tras `npm run db:setup`:

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | `admin@demo.co` | `Admin123!` |
| Vendedor | `vendedor@demo.co` | `Vendedor123!` |
| Contador | `contador@demo.co` | `Contador123!` |

El seed incluye: empresa, 4 productos, 3 clientes, 1 factura pagada (`FV-0001`), 1 factura emitida sin pagar (`FV-0002`) y varios gastos del mes.

## Matriz de roles

| Recurso / acción | admin | vendedor | contador |
|------------------|:-----:|:--------:|:--------:|
| Panel (dashboard) | ✓ | ✓ | ✓ |
| Usuarios (CRUD / password) | ✓ | — | — |
| Empresa — leer | ✓ | — | ✓ |
| Empresa — editar | ✓ | — | — |
| Productos — leer | ✓ | ✓ | ✓ |
| Productos — escribir | ✓ | — | — |
| Clientes — leer | ✓ | ✓ | ✓ |
| Clientes — escribir | ✓ | ✓ | — |
| Facturas — leer / PDF | ✓ | ✓ | ✓ |
| Facturas — crear / emitir / anular | ✓ | ✓ | — |
| Pagos — leer | ✓ | ✓ | ✓ |
| Pagos — registrar | ✓ | ✓ | ✓ |
| Gastos — leer / CRUD | ✓ | — | ✓ |
| Cotizaciones — leer | ✓ | ✓ | ✓ |
| Cotizaciones — escribir | ✓ | ✓ | — |
| Reportes | ✓ | — | ✓ |
| Respaldo / export | ✓ | — | — |

Los usuarios inactivos no pueden iniciar sesión. La desactivación es soft (no se borran cuentas).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (generate + next build) |
| `npm run start` | Servidor de producción |
| `npm run db:push` | Sincroniza el esquema Prisma → SQLite local |
| `npm run db:seed` | Carga datos demo |
| `npm run db:setup` | `db:push` + `db:seed` |

## Módulos (pack profesional)

1. **Auth + roles** — login rate-limit (5 fallos / 15 min); cookie httpOnly + `secure` en prod; roles admin / vendedor / contador
2. **Usuarios** — CRUD admin, restablecer contraseña, activar/desactivar; **Mi perfil**
3. **Empresa / branding** — razón social, NIT, logo (data URL en DB o ruta pública), prefijos FV/COT, días alerta vencidas
4. **Productos + inventario** — stock / mínimo / trackStock; baja al emitir factura; ajuste de stock (admin); alertas en panel
5. **Clientes** — nombre, NIT/CC, correo, teléfono, dirección
6. **Cotizaciones** — estados `draft|sent|accepted|rejected|converted`; PDF; convertir → factura borrador
7. **Facturas** — líneas, IVA, estados `draft|issued|paid|void`; PDF profesional con datos de empresa
8. **Pagos / Gastos** — cobros y gastos por categoría
9. **Reportes** (`/reports`) — ventas, IVA, CxC, gastos; CSV por sección
10. **Respaldo** (`/backup`, admin) — ZIP CSV o CSV individuales
11. **Auditoría** — tabla `AuditLog` en create/update/delete de entidades clave
12. **Panel** — KPIs + notificaciones (facturas vencidas, stock bajo)

### Migración Turso (schema profesional)

Tras desplegar código nuevo sobre una DB Turso existente:

```bash
turso db shell contabilidad < turso-migrate-professional.sql
turso db shell contabilidad < turso-migrate-password-reset.sql
```

Estos dos archivos son los cambios exactos desde el esquema de producción original;
aplique `turso-migrate-professional.sql` una sola vez. El segundo usa
`IF NOT EXISTS`. En DB nueva: `prisma db push` local → dump `.schema` → shell
Turso, o aplicar el esquema completo.

## Despliegue en Vercel (free) + Turso

SQLite en archivo **no persiste** en Vercel (filesystem efímero). Use **Turso** (libSQL managed, free tier).

### 1. Crear base Turso (usted lo hace; este repo no crea DBs)

```bash
# Instalar CLI: https://docs.turso.tech/cli
turso auth login
turso db create contabilidad
turso db show contabilidad --url          # → libsql://…
turso db tokens create contabilidad       # → auth token
```

### 2. Aplicar el esquema a Turso

Prisma Migrate/`db push` **no** hablan directo con Turso. Flujo típico:

```bash
# Local: generar SQL o empujar a SQLite de referencia
npm run db:push

# Opción A — dump del esquema local y aplicar en Turso:
sqlite3 prisma/dev.db .schema | turso db shell contabilidad

# Opción B — si tiene migraciones Prisma:
# turso db shell contabilidad < prisma/migrations/.../migration.sql
```

Luego puede cargar demo contra Turso:

```bash
DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:seed
```

### 3. Variables en Vercel

En el proyecto Vercel → **Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `DATABASE_URL` | `libsql://YOUR-DB-YOUR-ORG.turso.io` |
| `TURSO_AUTH_TOKEN` | token de `turso db tokens create` |
| `AUTH_SECRET` | cadena larga aleatoria (p. ej. `openssl rand -base64 32`) |
| `APP_URL` | URL pública sin slash final (enlaces de reset) |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM` | p. ej. `Buñuelandia <onboarding@resend.dev>` (pruebas) |

`DATABASE_AUTH_TOKEN` es un alias opcional de `TURSO_AUTH_TOKEN`.

Recuperación de contraseña: `/forgot-password` → email vía Resend → `/reset-password?token=…` (token hasheado, 1 h, un solo uso). SQL Turso: `turso-migrate-password-reset.sql`.

### 4. Deploy

- Conecte el repo (o suba el zip) a Vercel.
- Framework: Next.js. Build: `npm run build` (fuerza `DATABASE_URL=file:./dev.db` solo en `prisma generate`; runtime usa Turso).
- La ruta PDF y `next.config` usan **Node runtime** (no Edge) por `pdfkit` / Prisma.

### Gotchas

- No use Edge Runtime en rutas que toquen Prisma o PDF.
- Tras cambiar el schema Prisma: `db push` local → reaplicar SQL en Turso.
- Free Turso / Vercel tienen límites de cuota; suficientes para un MVP interno pequeño.

## Notas

- Single-tenant (una empresa). Multi-usuario con roles.
- No hay integración DIAN / CUFE / XML.
- Los montos se redondean a pesos enteros (COP).

## Licencia

Uso interno / demo.
