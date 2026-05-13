export const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return date.toLocaleString()
}
