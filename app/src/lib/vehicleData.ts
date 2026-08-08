import { api } from './api'

// Caché en memoria durante la sesión: las marcas/modelos de la NHTSA no
// cambian en el rato que un usuario tiene la app abierta, así que no hay
// motivo para volver a pedirlas cada vez que se abre el formulario.
let marcasPromise: Promise<string[]> | null = null
const modelosPorMarca = new Map<string, Promise<string[]>>()

export function getMarcas(): Promise<string[]> {
  if (!marcasPromise) marcasPromise = api.vehiculoData.marcas()
  return marcasPromise
}

export function getModelos(marca: string): Promise<string[]> {
  const clave = marca.trim().toLowerCase()
  if (!clave) return Promise.resolve([])
  let promesa = modelosPorMarca.get(clave)
  if (!promesa) {
    promesa = api.vehiculoData.modelos(marca.trim())
    modelosPorMarca.set(clave, promesa)
  }
  return promesa
}
