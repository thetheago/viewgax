// public/logo.svg é servido na raiz (dev e build, base './')
export function Brand() {
  return (
    <a className="brand" href="#" title="Início">
      <img src="./logo.svg" alt="" width={28} height={28} />
      <span>view<span className="brand-accent">gax</span></span>
    </a>
  )
}
