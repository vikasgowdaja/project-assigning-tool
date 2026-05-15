import axios from 'axios'

const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '/api'
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  return '/api'
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 12000
})

export const registerTeam = async (payload) => {
  const { data } = await api.post('/teams/register', payload)
  return data
}

export const getTeams = async () => {
  const { data } = await api.get('/teams')
  return data
}

export const getStats = async () => {
  const { data } = await api.get('/teams/stats')
  return data
}

export const downloadTeamsExcel = async () => {
  const response = await api.get('/teams/export', {
    responseType: 'blob'
  })

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', 'innovation-project-teams.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}
