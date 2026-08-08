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
}

export interface Mantenimiento {
  id: string
  vehiculoId: string
  fecha: string
  km: number
  precio: number
  tienda: string
  elementos: string
  /** Si se rellena, genera una alerta para el próximo mantenimiento del mismo tipo. */
  intervaloKm?: number
  intervaloMeses?: number
}

export type TipoRepuesto =
  | 'Neumáticos'
  | 'Batería'
  | 'Frenos'
  | 'Correa de distribución'
  | 'Filtros'
  | 'Otro'

export interface Repuesto {
  id: string
  vehiculoId: string
  tipoRepuesto: TipoRepuesto
  fecha: string
  km: number
  precio: number
  tienda: string
  vidaUtilKm?: number
  vidaUtilAnios?: number
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

export type AlertaTipo = 'Mantenimiento' | 'Repuesto' | 'ITV'

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
