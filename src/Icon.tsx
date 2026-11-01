import { useEffect, useState, type ComponentType } from 'react'

// um chunk por ícone, carregado sob demanda (bootstrap:* e tech:*)
const loaders = import.meta.glob<{ default: ComponentType }>('/node_modules/@likec4/icons/{bootstrap,tech}/*.js')
const pathOf = (name: string) => `/node_modules/@likec4/icons/${name.replace(':', '/')}.js`
const loaded = new Map<string, ComponentType>()

export const ICON_NAMES = Object.keys(loaders).map(p => p.split('/').slice(-2).join(':').replace(/\.js$/, ''))

export function Icon({ name }: { name?: string }) {
  const [Svg, setSvg] = useState(() => (name ? loaded.get(name) : undefined))
  useEffect(() => {
    const load = name ? loaders[pathOf(name)] : undefined
    if (!name || !load) return setSvg(undefined)
    load().then(m => {
      loaded.set(name, m.default)
      setSvg(() => m.default)
    })
  }, [name])
  if (!Svg) return null
  return <span className="icon"><Svg /></span>
}
