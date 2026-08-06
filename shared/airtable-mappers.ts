import type {
  AlertaEnviada,
  Averia,
  Itv,
  LoginCode,
  Mantenimiento,
  PushSubscriptionRecord,
  Repuesto,
  Vehiculo,
} from './types'

export const TABLES = {
  Vehiculos: 'Vehiculos',
  Averias: 'Averias',
  Mantenimientos: 'Mantenimientos',
  Repuestos: 'Repuestos',
  Itv: 'ITV',
  PushSubscriptions: 'PushSubscriptions',
  AlertasEnviadas: 'AlertasEnviadas',
  LoginCodes: 'LoginCodes',
} as const

interface AirtableFields {
  [key: string]: unknown
}

// --- Vehiculos ---------------------------------------------------------

export function vehiculoFromAirtable(id: string, fields: AirtableFields): Vehiculo {
  return {
    id,
    propietarioEmail: String(fields.Propietario_Email ?? ''),
    marca: String(fields.Marca ?? ''),
    modelo: String(fields.Modelo ?? ''),
    matricula: String(fields.Matricula ?? ''),
    anio: Number(fields.Año ?? 0),
    tipo: (fields.Tipo as Vehiculo['tipo']) ?? 'Turismo',
    kmActual: Number(fields.Km_Actual ?? 0),
    kmActualFecha: String(fields.Km_Actual_Fecha ?? ''),
    fechaCompra: fields.Fecha_Compra ? String(fields.Fecha_Compra) : undefined,
  }
}

export function vehiculoToAirtable(v: Omit<Vehiculo, 'id'>): AirtableFields {
  return {
    Propietario_Email: v.propietarioEmail,
    Marca: v.marca,
    Modelo: v.modelo,
    Matricula: v.matricula,
    Año: v.anio,
    Tipo: v.tipo,
    Km_Actual: v.kmActual,
    Km_Actual_Fecha: v.kmActualFecha,
    Fecha_Compra: v.fechaCompra || null,
  }
}

// --- Averias -------------------------------------------------------------

export function averiaFromAirtable(id: string, fields: AirtableFields): Averia {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    fecha: String(fields.Fecha ?? ''),
    descripcion: String(fields.Descripcion ?? ''),
    estado: (fields.Estado as Averia['estado']) ?? 'Pendiente',
  }
}

export function averiaToAirtable(a: Omit<Averia, 'id'>): AirtableFields {
  return {
    Vehiculo: a.vehiculoId,
    Fecha: a.fecha,
    Descripcion: a.descripcion,
    Estado: a.estado,
  }
}

// --- Mantenimientos --------------------------------------------------------

export function mantenimientoFromAirtable(id: string, fields: AirtableFields): Mantenimiento {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    fecha: String(fields.Fecha ?? ''),
    km: Number(fields.Km ?? 0),
    precio: Number(fields.Precio ?? 0),
    tienda: String(fields.Tienda ?? ''),
    elementos: String(fields.Elementos ?? ''),
    intervaloKm: fields.Intervalo_Km ? Number(fields.Intervalo_Km) : undefined,
    intervaloMeses: fields.Intervalo_Meses ? Number(fields.Intervalo_Meses) : undefined,
  }
}

export function mantenimientoToAirtable(m: Omit<Mantenimiento, 'id'>): AirtableFields {
  return {
    Vehiculo: m.vehiculoId,
    Fecha: m.fecha,
    Km: m.km,
    Precio: m.precio,
    Tienda: m.tienda,
    Elementos: m.elementos,
    Intervalo_Km: m.intervaloKm ?? null,
    Intervalo_Meses: m.intervaloMeses ?? null,
  }
}

// --- Repuestos -----------------------------------------------------------

export function repuestoFromAirtable(id: string, fields: AirtableFields): Repuesto {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    tipoRepuesto: (fields.Tipo_Repuesto as Repuesto['tipoRepuesto']) ?? 'Otro',
    fecha: String(fields.Fecha ?? ''),
    km: Number(fields.Km ?? 0),
    precio: Number(fields.Precio ?? 0),
    tienda: String(fields.Tienda ?? ''),
    vidaUtilKm: fields.Vida_Util_Km ? Number(fields.Vida_Util_Km) : undefined,
    vidaUtilAnios: fields['Vida_Util_Años'] ? Number(fields['Vida_Util_Años']) : undefined,
  }
}

export function repuestoToAirtable(r: Omit<Repuesto, 'id'>): AirtableFields {
  return {
    Vehiculo: r.vehiculoId,
    Tipo_Repuesto: r.tipoRepuesto,
    Fecha: r.fecha,
    Km: r.km,
    Precio: r.precio,
    Tienda: r.tienda,
    Vida_Util_Km: r.vidaUtilKm ?? null,
    'Vida_Util_Años': r.vidaUtilAnios ?? null,
  }
}

// --- ITV -------------------------------------------------------------------

export function itvFromAirtable(id: string, fields: AirtableFields): Itv {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    fechaRealizada: String(fields.Fecha_Realizada ?? ''),
    resultado: (fields.Resultado as Itv['resultado']) ?? 'Favorable',
    fechaProxima: String(fields.Fecha_Proxima ?? ''),
  }
}

export function itvToAirtable(i: Omit<Itv, 'id'>): AirtableFields {
  return {
    Vehiculo: i.vehiculoId,
    Fecha_Realizada: i.fechaRealizada,
    Resultado: i.resultado,
    Fecha_Proxima: i.fechaProxima,
  }
}

// --- PushSubscriptions -------------------------------------------------

export function pushSubscriptionFromAirtable(
  id: string,
  fields: AirtableFields,
): PushSubscriptionRecord {
  return {
    id,
    email: String(fields.Email ?? ''),
    endpoint: String(fields.Endpoint ?? ''),
    keysP256dh: String(fields.Keys_p256dh ?? ''),
    keysAuth: String(fields.Keys_auth ?? ''),
  }
}

export function pushSubscriptionToAirtable(
  p: Omit<PushSubscriptionRecord, 'id'>,
): AirtableFields {
  return {
    Email: p.email,
    Endpoint: p.endpoint,
    Keys_p256dh: p.keysP256dh,
    Keys_auth: p.keysAuth,
  }
}

// --- AlertasEnviadas -----------------------------------------------------

export function alertaEnviadaFromAirtable(id: string, fields: AirtableFields): AlertaEnviada {
  return {
    id,
    tipo: (fields.Tipo as AlertaEnviada['tipo']) ?? 'Mantenimiento',
    referenciaId: String(fields.Referencia_Id ?? ''),
    fechaEnviada: String(fields.Fecha_Enviada ?? ''),
  }
}

export function alertaEnviadaToAirtable(a: Omit<AlertaEnviada, 'id'>): AirtableFields {
  return {
    Tipo: a.tipo,
    Referencia_Id: a.referenciaId,
    Fecha_Enviada: a.fechaEnviada,
  }
}

// --- LoginCodes ------------------------------------------------------------

export function loginCodeFromAirtable(id: string, fields: AirtableFields): LoginCode {
  return {
    id,
    email: String(fields.Email ?? ''),
    code: String(fields.Code ?? ''),
    expiresAt: String(fields.ExpiresAt ?? ''),
    used: Boolean(fields.Used ?? false),
    attempts: Number(fields.Attempts ?? 0),
  }
}

export function loginCodeToAirtable(l: Omit<LoginCode, 'id'>): AirtableFields {
  return {
    Email: l.email,
    Code: l.code,
    ExpiresAt: l.expiresAt,
    Used: l.used,
    Attempts: l.attempts,
  }
}
