import { useEffect, useState, type ComponentType } from 'react'

// um chunk por ícone, carregado sob demanda (bootstrap:* e tech:*)
const loaders = import.meta.glob<{ default: ComponentType }>('/node_modules/@likec4/icons/{bootstrap,tech}/*.js')
const pathOf = (name: string) => `/node_modules/@likec4/icons/${name.replace(':', '/')}.js`
const loaded = new Map<string, ComponentType>()

const all = Object.keys(loaders).map(p => p.split('/').slice(-2).join(':').replace(/\.js$/, ''))
// tech primeiro; some o logotipo largo (tech:rabbitmq) quando existe o símbolo quadrado (tech:rabbitmq-icon)
export const ICON_NAMES = [...all.filter(n => n.startsWith('tech:')), ...all.filter(n => !n.startsWith('tech:'))]
  .filter(n => !all.includes(`${n}-icon`))

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
