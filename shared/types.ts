export type VehiculoTipo = 'Turismo' | 'Moto' | 'Furgoneta'

export interface Vehiculo {
  id: string
  propietarioEmail: string
  marca: string
  modelo: string
  matricula: string
  anio: number
  tipo: VehiculoTipo
  kmActual: number
  kmActualFecha: string
  /** Fecha en la que compraste el vehículo (ISO yyyy-mm-dd). Opcional: los vehículos ya existentes no la tienen. */
  fechaCompra?: string
}

/**
 * En Averias/Mantenimientos/Repuestos/ITV, `vehiculoId` es la Matricula del
 * vehículo (texto plano), no el id de registro de Airtable — el campo
 * "Vehiculo" en esas tablas es de texto, no un Link to another record
 * (crear campos Link requiere permiso de Creador en la base, que no todos
 * los colaboradores tienen).
 */
export type AveriaEstado = 'Pendiente' | 'Resuelta'

export interface Averia {
  id: string
  vehiculoId: string
  fecha: string
  descripcion: string
  estado: AveriaEstado
  /** Diagnóstico orientativo generado por IA a partir de la descripción — se guarda para no volver a pedirlo cada vez. */
  diagnosticoIA?: string
}

/**
 * Un elemento del vehículo (aceite, filtro de aceite, batería, neumáticos,
 * pastillas de freno…) con su propio reloj: cada vez que se cambia o se
 * revisa, se registra aquí con su fecha/km y, si se conoce, el intervalo
 * hasta el próximo cambio (en km y/o meses). Sustituye a lo que antes eran
 * "Mantenimientos" y "Repuestos" por separado — eran el mismo concepto
 * (algo del coche que se atiende y que hay que volver a atender más
 * adelante) contado con dos vocabularios distintos.
 *
 * Varios elementos cambiados en la misma visita al taller comparten
 * `visitaId` (generado en el cliente al guardar) para poder agruparlos en
 * la interfaz como un único ticket, aunque cada uno mantenga su propio
 * intervalo y por tanto su propia alerta.
 */
export interface Elemento {
  id: string
  vehiculoId: string
  tipo: string
  fecha: string
  km: number
  precio: number
  tienda: string
  /** Si se rellena (a mano o con el valor sugerido del catálogo), genera una alerta para el próximo cambio de este elemento. */
  intervaloKm?: number
  intervaloMeses?: number
  visitaId?: string
}

export type ItvResultado = 'Favorable' | 'Desfavorable' | 'Negativo'

export interface Itv {
  id: string
  vehiculoId: string
  fechaRealizada: string
  resultado: ItvResultado
  fechaProxima: string
}

export type SeguroTipoCobertura = 'Terceros' | 'Terceros Ampliado' | 'Todo Riesgo'

export interface Seguro {
  id: string
  vehiculoId: string
  compania: string
  numeroPoliza: string
  tipoCobertura: SeguroTipoCobertura
  fechaInicio: string
  fechaRenovacion: string
  precio: number
  /** Teléfono de asistencia en carretera, si lo da la aseguradora. */
  telefonoAsistencia?: string
}

export type ParteTipo =
  | 'Colisión'
  | 'Robo'
  | 'Vandalismo'
  | 'Lunas'
  | 'Incendio'
  | 'Fenómenos atmosféricos'
  | 'Otro'

export type ParteEstado = 'Abierto' | 'En trámite' | 'Cerrado'

export interface Parte {
  id: string
  vehiculoId: string
  fecha: string
  tipo: ParteTipo
  descripcion: string
  /** Número de expediente que da la aseguradora, si ya se conoce. */
  numeroParte?: string
  estado: ParteEstado
  coste?: number
  terceroImplicado: boolean
}

export interface PushSubscriptionRecord {
  id: string
  email: string
  endpoint: string
  keysP256dh: string
  keysAuth: string
}

export type AlertaTipo = 'Elemento' | 'ITV'

export interface AlertaEnviada {
  id: string
  tipo: AlertaTipo
  referenciaId: string
  fechaEnviada: string
}

export interface LoginCode {
  id: string
  email: string
  code: string
  expiresAt: string
  used: boolean
  attempts: number
}

/**
 * Emails con acceso además de los ya fijados en el secret ALLOWED_EMAILS
 * de Cloudflare. Gestionable desde la app (pestaña Usuarios) por quien ya
 * esté en ALLOWED_EMAILS, sin tocar Cloudflare para cada alta nueva.
 */
export interface UsuarioPermitido {
  id: string
  email: string
  nota?: string
  fechaAlta: string
}
