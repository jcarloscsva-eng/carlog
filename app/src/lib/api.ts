import type {
  Averia,
  Itv,
  Mantenimiento,
  Parte,
  Repuesto,
  Seguro,
  UsuarioPermitido,
  Vehiculo,
} from '@shared/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Error ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    me: () => request<{ email: string; isAdmin: boolean }>('/auth/me'),
    requestCode: (email: string) =>
      request<{ ok: true }>('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
    verifyCode: (email: string, code: string) =>
      request<{ ok: true; email: string; isAdmin: boolean }>('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }),
    logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  },
  vehiculos: {
    list: () => request<Vehiculo[]>('/vehiculos'),
    create: (data: Omit<Vehiculo, 'id' | 'propietarioEmail'>) =>
      request<Vehiculo>('/vehiculos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Vehiculo, 'id' | 'propietarioEmail'>>) =>
      request<Vehiculo>(`/vehiculos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/vehiculos/${id}`, { method: 'DELETE' }),
  },
  averias: {
    list: () => request<Averia[]>('/averias'),
    create: (data: Omit<Averia, 'id'>) =>
      request<Averia>('/averias', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Averia, 'id'>>) =>
      request<Averia>(`/averias/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/averias/${id}`, { method: 'DELETE' }),
  },
  mantenimientos: {
    list: () => request<Mantenimiento[]>('/mantenimientos'),
    create: (data: Omit<Mantenimiento, 'id'>) =>
      request<Mantenimiento>('/mantenimientos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Mantenimiento, 'id'>>) =>
      request<Mantenimiento>(`/mantenimientos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<{ ok: true }>(`/mantenimientos/${id}`, { method: 'DELETE' }),
  },
  repuestos: {
    list: () => request<Repuesto[]>('/repuestos'),
    create: (data: Omit<Repuesto, 'id'>) =>
      request<Repuesto>('/repuestos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Repuesto, 'id'>>) =>
      request<Repuesto>(`/repuestos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/repuestos/${id}`, { method: 'DELETE' }),
  },
  itv: {
    list: () => request<Itv[]>('/itv'),
    create: (data: Pick<Itv, 'vehiculoId' | 'fechaRealizada' | 'resultado'>) =>
      request<Itv>('/itv', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Itv, 'fechaRealizada' | 'resultado'>>) =>
      request<Itv>(`/itv/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/itv/${id}`, { method: 'DELETE' }),
  },
  seguros: {
    list: () => request<Seguro[]>('/seguros'),
    create: (data: Omit<Seguro, 'id'>) =>
      request<Seguro>('/seguros', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Seguro, 'id'>>) =>
      request<Seguro>(`/seguros/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/seguros/${id}`, { method: 'DELETE' }),
  },
  partes: {
    list: () => request<Parte[]>('/partes'),
    create: (data: Omit<Parte, 'id'>) =>
      request<Parte>('/partes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Parte, 'id'>>) =>
      request<Parte>(`/partes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/partes/${id}`, { method: 'DELETE' }),
  },
  usuarios: {
    list: () => request<UsuarioPermitido[]>('/admin/usuarios'),
    create: (data: { email: string; nota?: string }) =>
      request<UsuarioPermitido>('/admin/usuarios', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/admin/usuarios/${id}`, { method: 'DELETE' }),
  },
  compartir: {
    crear: (vehiculoId: string, dias: number) =>
      request<{ url: string; caducidad: string; dias: number }>('/compartir', {
        method: 'POST',
        body: JSON.stringify({ vehiculoId, dias }),
      }),
  },
  vehiculoData: {
    marcas: () => request<string[]>('/vehiculo-data/marcas'),
    modelos: (marca: string) =>
      request<string[]>(`/vehiculo-data/modelos?marca=${encodeURIComponent(marca)}`),
  },
  pushSubscribe: (subscription: PushSubscriptionJSON) =>
    request<{ ok: true }>('/push-subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
}
