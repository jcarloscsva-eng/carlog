# Carlog

Gestión de mantenimiento de vehículos: averías, mantenimientos, repuestos,
ITV, alertas por email/push y reportes de gasto. PWA instalable, backend en
Cloudflare Pages Functions, datos en Airtable, login propio con código por
email (sin depender de Cloudflare Access ni de tarjeta de crédito).

## Arquitectura

```
app/            Frontend (Vite + React + TypeScript + Tailwind, PWA)
functions/api/  Backend: Cloudflare Pages Functions (CRUD sobre Airtable)
shared/         Código compartido entre functions/ y cron-worker/
cron-worker/    Worker independiente con Cron Trigger diario para las alertas
```

El frontend nunca habla directo con Airtable: todas las peticiones pasan por
`functions/api/*`. La identidad del usuario viene de una cookie de sesión
firmada (HMAC) que se crea al verificar el código de acceso — no de
Cloudflare Access — y todos los datos se filtran por ese email.

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

**Seguros**
| Campo | Tipo |
|---|---|
| Vehiculo | Single line text (matrícula) |
| Compania | Single line text |
| Numero_Poliza | Single line text |
| Tipo_Cobertura | Single select: `Terceros`, `Terceros Ampliado`, `Todo Riesgo` |
| Fecha_Inicio | Date |
| Fecha_Renovacion | Date |
| Precio | Number (decimal) |
| Telefono_Asistencia | Single line text (opcional) |

**Partes**
| Campo | Tipo |
|---|---|
| Vehiculo | Single line text (matrícula) |
| Fecha | Date |
| Tipo | Single select: `Colisión`, `Robo`, `Vandalismo`, `Lunas`, `Incendio`, `Fenómenos atmosféricos`, `Otro` |
| Descripcion | Long text |
| Numero_Parte | Single line text (opcional) |
| Estado | Single select: `Abierto`, `En trámite`, `Cerrado` |
| Coste | Number (decimal, opcional) |
| Tercero_Implicado | Checkbox |

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

**LoginCodes**
| Campo | Tipo |
|---|---|
| Email | Single line text |
| Code | Single line text |
| ExpiresAt | Date (con hora) |
| Used | Checkbox |
| Attempts | Number |

Consigue tu `AIRTABLE_API_KEY` (Personal Access Token con permisos
`data.records:read`/`write` sobre esta base) en
https://airtable.com/create/tokens, y el `AIRTABLE_BASE_ID` en la URL de la
base o en https://airtable.com/api.

## 2. Login propio (sin Cloudflare Access)

No usamos Cloudflare Access (el tier gratuito pide tarjeta de verificación).
En su lugar, `functions/api/auth/*` implementa un login con código de un
solo uso enviado por email:

1. El usuario introduce su email → `POST /api/auth/request-code` genera un
   código de 6 dígitos, lo guarda en la tabla `LoginCodes` (caduca en 10
   minutos) y lo envía con Resend.
2. El usuario introduce el código → `POST /api/auth/verify-code` lo valida
   (máximo 5 intentos), y si es correcto, crea una cookie de sesión firmada
   (HMAC-SHA256, 30 días) — `httpOnly`, `Secure`, `SameSite=Lax`.
3. El resto de endpoints (`shared/http.ts` → `withAuth`) leen esa cookie y
   verifican la firma con `SESSION_SECRET` para identificar al usuario.

Variables a configurar:
- `SESSION_SECRET`: cadena aleatoria larga (`openssl rand -hex 32`). Sin
  esto nadie puede iniciar sesión — trátalo como una contraseña maestra.
- `ALLOWED_EMAILS` (opcional pero recomendado): lista de emails separados
  por coma (tú y tu familia). Si no se define, cualquier email puede pedir
  un código.

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
# añade además CRON_DEBUG_TOKEN=cualquier-cadena a cron-worker/.dev.vars
npm run dev:cron
# dispara la revisión manualmente:
curl "http://localhost:8787/__run?token=cualquier-cadena"
```

El login funciona igual en local que en producción: pide tu email, te manda
un código real por Resend (necesitas `RESEND_API_KEY` y `SESSION_SECRET` en
`.dev.vars`) y verifica el código. La sesión dura 30 días, así que solo lo
harás una vez por navegador.

## 6. Deploy

**Pages (frontend + API):**
1. Sube el repo (privado) a GitHub.
2. En el dashboard de Cloudflare, crea un proyecto Pages conectado a ese
   repo. Build command: `npm run build:app`. Build output directory:
   `app/dist`. Root directory: `/` (raíz del repo, para que Cloudflare
   detecte `functions/` automáticamente).
3. Añade los secrets de `.env.example` en Settings → Environment variables
   (o con `wrangler pages secret put <NOMBRE>`), incluyendo `SESSION_SECRET`
   y `ALLOWED_EMAILS`.

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

El cron se ejecuta cada día a las 08:00 UTC (`cron-worker/wrangler.toml`). El
worker tiene una URL pública además del cron programado; la ruta
`/__run` (para forzar una revisión manual) está deshabilitada salvo que
configures el secret `CRON_DEBUG_TOKEN` — no lo definas en producción a
menos que necesites depurar algo puntualmente.

## Notas

- El cálculo de la próxima ITV (`shared/itv-rules.ts`) es una aproximación a
  la normativa española habitual (4 años, luego cada 2 hasta los 10, luego
  anual) y no cubre casos especiales — corrige la fecha manualmente si tu
  caso difiere.
- Los iconos en `app/public/icons/` son placeholders sólidos; sustitúyelos
  por el icono real de la app antes de publicar.
