import { useEffect, useState } from 'react'

const toneClassByType = {
  cyan: 'bg-cyan-400 text-slate-900 hover:bg-cyan-300',
  emerald: 'bg-emerald-400 text-slate-900 hover:bg-emerald-300',
  rose: 'bg-rose-500 text-white hover:bg-rose-400',
  amber: 'bg-amber-400 text-slate-900 hover:bg-amber-300'
}

export function ActionDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  noteLabel = '',
  notePlaceholder = '',
  requireNote = false,
  confirmTone = 'cyan',
  loading = false,
  onConfirm,
  onCancel
}) {
  const [note, setNote] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setNote('')
      setValidationError('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleConfirm = () => {
    if (requireNote && !String(note || '').trim()) {
      setValidationError('Please enter a note before continuing')
      return
    }

    setValidationError('')
    onConfirm?.(note)
  }

  const confirmToneClass = toneClassByType[confirmTone] || toneClassByType.cyan

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm text-cyan-50/90">{message}</p>

        {noteLabel ? (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
              {noteLabel}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={notePlaceholder}
              className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>
        ) : null}

        {validationError ? (
          <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-xs text-rose-100">
            {validationError}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmToneClass}`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
