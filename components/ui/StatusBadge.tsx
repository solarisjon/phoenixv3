const STATUS_STYLES: Record<string, string> = {
  completed: 'badge-success',
  failed: 'badge-error',
  running: 'badge-info',
  pending: 'badge-warning',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_STYLES[status] || 'badge-neutral'}>{status}</span>
  )
}
