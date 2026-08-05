# Carlog

Gestión de mantenimiento de vehículos: averías, mantenimientos, repuestos,
ITV, alertas por email/push y reportes de gasto. PWA instalable, backend en
Cloudflare Pages Functions, datos en Airtable, auth con Cloudflare Access.

## Arquitectura

```
app/            Frontend (Vite + React + TypeScript + Tailwind, PWA)
functions/api/  Backend: Cloudflare Pages Functions (CRUD sobre Airtable)
shared/         Código compartido entre functions/ y cron-worker/
cron-worker/    Worker independiente con Cron Trigger diario para las alertas
```

El frontend nunca habla directo con Airtable: todas las peticiones pasan por
`functions/api/*`, que leen el email del usuario del header que inyecta
Cloudflare Access y filtran los datos por propietario.

## 1. Crear la base de Airtable

Crea una base nueva con estas tablas y campos exactos (los nombres importan,
son los que usa el código):

**Vehiculos**
| Campo | Tipo |
|---|---|
| Propietario_Email | Single line text |
| Marca | Single line text |
| Modelo | Single line text |
| Matricula | Single line text |
| Año | Number |
| Tipo | Single select: `Turismo`, `Moto`, `Furgoneta` |
| Km_Actual | Number |
| Km_Actual_Fecha | Date |

**Averias**
| Campo | Tipo |
|---|---|
| Vehiculo | Link to Vehiculos |
| Fecha | Date |
| Descripcion | Long text |
| Estado | Single select: `Pendiente`, `Resuelta` |

**Mantenimientos**
| Campo | Tipo |
|---|---|
| Vehiculo | Link to Vehiculos |
| Fecha | Date |
| Km | Number |
| Precio | Number (decimal) |
| Tienda | Single line text |
| Elementos | Single line text |
| Intervalo_Km | Number (opcional, para alertas recurrentes) |
| Intervalo_Meses | Number (opcional, para alertas recurrentes) |

**Repuestos**
| Campo | Tipo |
|---|---|
| Vehiculo | Link to Vehiculos |
| Tipo_Repuesto | Single select: `Neumáticos`, `Batería`, `Frenos`, `Correa de distribución`, `Filtros`, `Otro` |
| Fecha | Date |
| Km | Number |
| Precio | Number (decimal) |
| Tienda | Single line text |
| Vida_Util_Km | Number (opcional) |
| Vida_Util_Años | Number (opcional) |

**ITV**
| Campo | Tipo |
|---|---|
| Vehiculo | Link to Vehiculos |
| Fecha_Realizada | Date |
| Resultado | Single select: `Favorable`, `Desfavorable`, `Negativo` |
| Fecha_Proxima | Date (la calcula la app al crear el registro) |

**PushSubscriptions**
| Campo | Tipo |
|---|---|
| Email | Single line text |
| Endpoint | Long text |
| Keys_p256dh | Single line text |
| Keys_auth | Single line text |

**AlertasEnviadas**
| Campo | Tipo |
|---|---|
| Tipo | Single select: `Mantenimiento`, `Repuesto`, `ITV` |
| Referencia_Id | Single line text |
| Fecha_Enviada | Date |

Consigue tu `AIRTABLE_API_KEY` (Personal Access Token con permisos
`data.records:read`/`write` sobre esta base) en
https://airtable.com/create/tokens, y el `AIRTABLE_BASE_ID` en la URL de la
base o en https://airtable.com/api.

## 2. Cloudflare Access (autenticación)

1. Activa Cloudflare Zero Trust en tu cuenta (gratis hasta 50 usuarios).
2. Crea una aplicación de tipo "Self-hosted" apuntando al dominio de tu
   proyecto Pages (p. ej. `carlog.pages.dev` o tu dominio propio).
3. Añade una política de acceso con la lista de emails permitidos (tú y tu
   familia). Cada uno recibirá un código OTP por email al entrar.
4. Cloudflare inyectará automáticamente el header
   `Cf-Access-Authenticated-User-Email` en cada request — es lo que lee
   `shared/auth.ts` para identificar al usuario.

## 3. Resend (email)

Crea una cuenta gratuita en https://resend.com, verifica un dominio (o usa
el dominio de pruebas `resend.dev` para empezar) y genera una API key.

## 4. Claves VAPID (web push)

```bash
npx web-push generate-vapid-keys
```

Guarda la pública y la privada — la pública también va en
`app/.env.local` como `VITE_VAPID_PUBLIC_KEY`.

## 5. Desarrollo local

```bash
npm install

# Backend (Pages Functions) — necesita las variables de .env.example
# como .dev.vars en la raíz del proyecto:
cp .env.example .dev.vars   # y rellena los valores

npm run build:app
npm run dev:pages           # sirve app/dist + functions/api en :8788

# Frontend con hot reload, proxy a :8788 para /api:
npm run dev:app             # :5173

# Cron worker (alertas) en local:
cp .env.example cron-worker/.dev.vars
npm run dev:cron
# dispara la revisión manualmente: curl http://localhost:8787/__run
```

En local no hay Cloudflare Access delante, así que la app te pedirá un
email de prueba la primera vez (se guarda en `localStorage` y se manda como
header `X-Dev-User-Email`).

## 6. Deploy

**Pages (frontend + API):**
1. Sube el repo (privado) a GitHub.
2. En el dashboard de Cloudflare, crea un proyecto Pages conectado a ese
   repo. Build command: `npm run build:app`. Build output directory:
   `app/dist`. Root directory: `/` (raíz del repo, para que Cloudflare
   detecte `functions/` automáticamente).
3. Añade los secrets de `.env.example` en Settings → Environment variables
   (o con `wrangler pages secret put <NOMBRE>`).
4. Activa Cloudflare Access para el dominio del proyecto (paso 2).

**Cron worker (alertas):**
```bash
cd cron-worker
wrangler secret put AIRTABLE_API_KEY
wrangler secret put AIRTABLE_BASE_ID
wrangler secret put RESEND_API_KEY
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT
wrangler secret put APP_URL
npm run deploy:cron
```

El cron se ejecuta cada día a las 08:00 UTC (`cron-worker/wrangler.toml`).

## Notas

- El cálculo de la próxima ITV (`shared/itv-rules.ts`) es una aproximación a
  la normativa española habitual (4 años, luego cada 2 hasta los 10, luego
  anual) y no cubre casos especiales — corrige la fecha manualmente si tu
  caso difiere.
- Los iconos en `app/public/icons/` son placeholders sólidos; sustitúyelos
  por el icono real de la app antes de publicar.
