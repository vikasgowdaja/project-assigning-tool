import axios from 'axios'

const ADMIN_TOKEN_KEY = 'admin_auth_token'

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

export const getAdminToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export const setAdminToken = (token) => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export const clearAdminToken = () => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401 && typeof window !== 'undefined') {
      clearAdminToken()
      if (window.location.pathname.startsWith('/admin')) {
        window.location.assign('/admin/login')
      }
    }
    return Promise.reject(error)
  }
)

export const loginAdmin = async (payload) => {
  const { data } = await api.post('/auth/login', payload)
  if (data?.token) {
    setAdminToken(data.token)
  }
  return data
}

export const getAdminMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}

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

export const getProjects = async () => {
  const { data } = await api.get('/projects')
  return data
}

export const createProject = async (payload) => {
  const { data } = await api.post('/projects', payload)
  return data
}

export const uploadProjectsFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post('/projects/upload', formData)
  return data
}

export const previewProjectsFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post('/projects/upload/preview', formData)
  return data
}

export const downloadProjectsTemplate = async () => {
  const response = await api.get('/projects/template', {
    responseType: 'blob'
  })

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', 'project-upload-template.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

export const reconcileProjects = async () => {
  const { data } = await api.post('/teams/admin/reconcile-projects')
  return data
}

// Admin: Delete a team
export const deleteTeam = async (id) => {
  const { data } = await api.delete(`/teams/${id}`)
  return data
}

// Admin: Update a team
export const updateTeam = async (id, payload) => {
  const { data } = await api.patch(`/teams/${id}`, payload)
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
