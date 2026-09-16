# Contabilidad MVP

MVP de **contabilidad, control de ventas y facturación interna** para una sola empresa (single-tenant).

- UI en español (**es-CO**)
- Moneda **COP**
- Facturas **internas + PDF** (sin facturación electrónica DIAN)
- Campos estructurales listos para DIAN más adelante (NIT, razón social, numeración secuencial)

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite vía Prisma (`better-sqlite3` no es necesario; Prisma usa el motor nativo)
- Auth email/contraseña con JWT en cookie httpOnly (`jose` + `bcryptjs`)
- PDF con `pdfkit`

## Requisitos

- Node.js 18+ (recomendado 20)
- npm

## Configuración

```bash
cd contabilidad   # o la carpeta descomprimida
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variables de entorno

| Variable       | Descripción                                      | Ejemplo              |
|----------------|--------------------------------------------------|----------------------|
| `DATABASE_URL` | Ruta SQLite (relativa a la carpeta `prisma/`)    | `file:./dev.db`      |
| `AUTH_SECRET`  | Secreto para firmar la cookie de sesión          | cadena larga aleatoria |

## Credenciales demo

Tras `npm run db:setup`:

| Campo      | Valor            |
|------------|------------------|
| Correo     | `admin@demo.co`  |
| Contraseña | `Admin123!`      |

El seed incluye: empresa, 4 productos, 3 clientes, 1 factura pagada (`FV-0001`), 1 factura emitida sin pagar (`FV-0002`) y varios gastos del mes.

## Scripts

| Comando            | Descripción                          |
|--------------------|--------------------------------------|
| `npm run dev`      | Servidor de desarrollo               |
| `npm run build`    | Build de producción                  |
| `npm run start`    | Servidor de producción               |
| `npm run db:push`  | Sincroniza el esquema Prisma → SQLite|
| `npm run db:seed`  | Carga datos demo                     |
| `npm run db:setup` | `db:push` + `db:seed`                |

## Módulos

1. **Auth** — login / logout
2. **Empresa** — razón social, NIT, dirección, teléfono, prefijo y próximo número de factura
3. **Productos/servicios** — SKU, nombre, precio, IVA (19% por defecto), activo/inactivo
4. **Clientes** — nombre, NIT/CC, correo, teléfono, dirección
5. **Facturas** — líneas, subtotal/IVA/total, estados `draft|issued|paid|void`, numeración secuencial
6. **Pagos** — cobros contra facturas; marca `paid` cuando el saldo queda cubierto
7. **Panel** — ventas del mes, por cobrar, top clientes, ingresos vs gastos
8. **PDF** — descarga de factura
9. **Gastos** — fecha, categoría, monto, notas

## Notas

- No hay multi-empresa ni roles.
- No hay integración DIAN / CUFE / XML.
- Los montos se redondean a pesos enteros (COP).

## Licencia

Uso interno / demo.
