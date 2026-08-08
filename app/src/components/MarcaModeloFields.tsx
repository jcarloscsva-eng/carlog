import { useEffect, useId, useState } from 'react'
import { getMarcas, getModelos } from '../lib/vehicleData'

/**
 * Campos Marca/Modelo con autocompletado no bloqueante: sugiere marcas y
 * modelos reales (vía NHTSA) en un <datalist>, pero el campo sigue siendo
 * texto libre — si el vehículo no está en la lista, el usuario escribe lo
 * que quiera y el formulario funciona igual.
 */
export function MarcaModeloFields({
  defaultMarca = '',
  defaultModelo = '',
}: {
  defaultMarca?: string
  defaultModelo?: string
}) {
  const marcasId = useId()
  const modelosId = useId()
  const [marcas, setMarcas] = useState<string[]>([])
  const [modelos, setModelos] = useState<string[]>([])
  const [marca, setMarca] = useState(defaultMarca)

  useEffect(() => {
    getMarcas()
      .then(setMarcas)
      .catch(() => setMarcas([]))
  }, [])

  useEffect(() => {
    let cancelado = false
    if (!marca.trim()) {
      setModelos([])
      return
    }
    getModelos(marca)
      .then((res) => {
        if (!cancelado) setModelos(res)
      })
      .catch(() => {
        if (!cancelado) setModelos([])
      })
    return () => {
      cancelado = true
    }
  }, [marca])

  return (
    <>
      <div>
        <input
          name="marca"
          required
          placeholder="Marca"
          className="input"
          autoComplete="off"
          list={marcasId}
          defaultValue={defaultMarca}
          onChange={(e) => setMarca(e.target.value)}
        />
        <datalist id={marcasId}>
          {marcas.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div>
        <input
          name="modelo"
          required
          placeholder="Modelo"
          className="input"
          autoComplete="off"
          list={modelosId}
          defaultValue={defaultModelo}
        />
        <datalist id={modelosId}>
          {modelos.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </>
  )
}
