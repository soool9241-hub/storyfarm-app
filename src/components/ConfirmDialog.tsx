interface ConfirmDialogProps {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <p className="text-sm mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2 rounded-lg text-sm hover:text-white">취소</button>
          <button onClick={onConfirm} className="flex-1 bg-[#e74c3c] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#c0392b]">삭제</button>
        </div>
      </div>
    </div>
  )
}
