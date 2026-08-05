# Editar/borrar registros + rate limiting del login

## Contexto

Sesión de brainstorming sobre cómo mejorar Carlog. De las cuatro líneas
propuestas (huecos funcionales, fiabilidad/seguridad, rendimiento, otros),
el usuario eligió dos:

- **A — Huecos funcionales**: Mantenimientos, Repuestos e ITV solo se
  pueden crear y listar desde la app; para corregir un dato mal metido o
  borrar un registro hay que entrar a Airtable a mano.
- **B — Fiabilidad/seguridad**: `/api/auth/request-code` no tiene ningún
  límite de peticiones — cualquiera podría spamear el email de un usuario
  (o gastar la cuota de Resend) pidiendo códigos sin parar.

Se decidió dejar fuera de este diseño la falta de tests automatizados
(línea B original) para no mezclar alcances — se abordará aparte.

## A. Editar y borrar Mantenimientos, Repuestos, ITV y Averías

**Backend**: sin cambios. `PATCH`/`DELETE` ya existen para las cuatro
entidades vía el factory `shared/entity-routes.ts` — el hueco es
puramente de interfaz.

**Frontend**:

- Nuevo componente `app/src/components/Modal.tsx`: overlay + panel
  genérico, mismo lenguaje visual (carbón/dorado) que el resto de la app.
  Se cierra con Esc, click fuera, o un botón de cierre.
- En cada una de las 4 pestañas (`AveriasTab`, `MantenimientosTab`,
  `RepuestosTab`, `ItvTab`), el formulario que hoy se usa para crear se
  extrae a un sub-componente interno del mismo archivo (p. ej.
  `MantenimientoForm`) que acepta `initialValues` opcional y un callback
  `onSubmit`. Se reutiliza tanto inline (crear, `initialValues`
  undefined) como dentro del `Modal` (editar, precargado con el registro).
- Cada fila de cada lista gana dos acciones nuevas: **Editar** (abre el
  modal con el formulario precargado; al guardar llama a
  `api.<entidad>.update(id, cambios)`) y **Eliminar** (confirmación
  simple vía `window.confirm`, luego `api.<entidad>.remove(id)`).
- `AveriasTab` ya tiene acciones (buscar info, marcar resuelta) — se le
  añaden Editar (para corregir descripción/fecha) y Eliminar, que hoy no
  tiene.
- Tras editar/borrar, se recarga la lista igual que ya hace `reload()`
  tras crear.

**Manejo de errores**: igual que en el resto de la app — el error de la
petición se muestra como texto rojo dentro del modal, sin cerrarlo, para
que el usuario pueda corregir y reintentar.

## B. Rate limiting en el login

Dos capas independientes, por IP y por email:

### Por IP (Cloudflare, sin código)

Regla de **Rate limiting** en Security → WAF del dashboard de Cloudflare:
si la ruta coincide con `/api/auth/request-code` o
`/api/auth/verify-code`, más de 10 peticiones en 5 minutos desde la misma
IP → bloquear esa IP 1 hora. Se configura junto con el usuario cuando se
llegue a esa fase (es un cambio de seguridad de cuenta).

### Por email — intentos de pedir código (`functions/api/auth/request-code.ts`)

Antes de crear un `LoginCode` nuevo, y **solo si el email está en la lista
de permitidos** (para no filtrar por otra vía qué emails están en
`ALLOWED_EMAILS`), se consulta Airtable usando `CREATED_TIME()` sobre la
tabla `LoginCodes` (sin añadir ningún campo nuevo):

- Si existe un código creado en los **últimos 60 segundos** para ese
  email → `429` con `"Espera un momento antes de pedir otro código"`.
- Si existen **5 o más** códigos creados en la **última hora** para ese
  email → `429` con `"Demasiados intentos, prueba más tarde"`.

### Intentos de acertar el código (`functions/api/auth/verify-code.ts`)

Ya implementado — un código se invalida tras 5 intentos fallidos
(`MAX_ATTEMPTS`). No requiere cambios.

## Fuera de alcance

- Tests automatizados (se tratará en un diseño aparte).
- Rendimiento/code-splitting del bundle del frontend.
- Cualquier cambio al modelo de datos de Airtable.
