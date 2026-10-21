import { useEffect, type ReactNode } from 'react'

type Props = {
  labelledBy: string // id of the panel's heading
  onClose: () => void
  children: ReactNode
}

// Panel that slides up from the bottom. Tapping the dark area above it closes it,
// and so does Escape (keyboard on a computer).
export default function Sheet({ labelledBy, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
