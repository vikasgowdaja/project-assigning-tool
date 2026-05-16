// Team: Bulk custom project idea upload/preview (Excel/PDF)
export const previewTeamCustomIdeaFile = async (file, token) => {
  const activeToken = token || getTeamToken()
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/teams/team/custom-idea/upload/preview', formData, {
    headers: { Authorization: `Bearer ${activeToken}` }
  })
  return data
}

export const uploadTeamCustomIdeaFile = async (file, token) => {
  const activeToken = token || getTeamToken()
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/teams/team/custom-idea/upload', formData, {
    headers: { Authorization: `Bearer ${activeToken}` }
  })
  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }
  return data
}
import axios from 'axios'

const ADMIN_TOKEN_KEY = 'admin_auth_token'
const TEAM_TOKEN_KEY = 'team_auth_token'
const TEAM_PROFILE_KEY = 'team_auth_profile'

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

export const getTeamToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return localStorage.getItem(TEAM_TOKEN_KEY) || ''
}

export const getTeamProfile = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = localStorage.getItem(TEAM_PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const setTeamSession = ({ token, team }) => {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    localStorage.setItem(TEAM_TOKEN_KEY, token)
  }

  if (team) {
    localStorage.setItem(TEAM_PROFILE_KEY, JSON.stringify(team))
  }
}

export const clearTeamSession = () => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(TEAM_TOKEN_KEY)
  localStorage.removeItem(TEAM_PROFILE_KEY)
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

export const loginTeam = async (payload) => {
  const { data } = await api.post('/auth/team/login', payload)
  if (data?.token && data?.team) {
    setTeamSession({ token: data.token, team: data.team })
  }
  return data
}

export const changeTeamPassword = async (payload, token) => {
  const activeToken = token || getTeamToken()
  const { data } = await api.post('/auth/team/change-password', payload, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  })

  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }

  return data
}

export const requestTeamPasswordResetOtp = async (payload) => {
  const { data } = await api.post('/auth/team/password-reset/request-otp', payload)
  return data
}

export const verifyTeamPasswordResetOtp = async (payload) => {
  const { data } = await api.post('/auth/team/password-reset/verify-otp', payload)
  return data
}

export const resetTeamPassword = async (payload) => {
  const { data } = await api.post('/auth/team/password-reset/reset', payload)
  clearTeamSession()
  return data
}

export const getTeamMe = async (token) => {
  const activeToken = token || getTeamToken()
  const { data } = await api.get('/auth/team/me', {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  })

  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }

  return data
}

export const getTeamPasswordActivity = async () => {
  const { data } = await api.get('/auth/admin/team-passwords/activity')
  return data
}

export const forceResetTeamPassword = async (teamId) => {
  const { data } = await api.post(`/auth/admin/team-passwords/${teamId}/force-reset`)
  return data
}

export const submitTeamProfileUpdateRequest = async (payload, token) => {
  const activeToken = token || getTeamToken()
  const { data } = await api.post('/teams/team/update-request', payload, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  })

  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }

  return data
}

export const recallTeamProfileUpdateRequest = async (token) => {
  const activeToken = token || getTeamToken()
  const { data } = await api.post('/teams/team/update-request/recall', null, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  })

  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }

  return data
}

export const reviewTeamProfileUpdateRequest = async (teamId, payload) => {
  const { data } = await api.post(`/teams/admin/${teamId}/update-request/review`, payload)
  return data
}

export const reviewTeamCustomProjectIdea = async (teamId, payload) => {
  const { data } = await api.post(`/teams/admin/${teamId}/custom-idea/review`, payload)
  return data
}

export const submitTeamCustomProjectIdeaRequest = async (payload, token) => {
  const activeToken = token || getTeamToken()
  const { data } = await api.post('/teams/team/custom-idea/request', payload, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  })

  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }

  return data
}

export const submitTeamGithubRepository = async (payload, token) => {
  const activeToken = token || getTeamToken()
  const { data } = await api.post('/teams/team/github', payload, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  })

  if (data?.team) {
    setTeamSession({ token: activeToken, team: data.team })
  }

  return data
}

export const reviewTeamGithubCollaboration = async (teamId, payload) => {
  const { data } = await api.post(`/teams/admin/${teamId}/github-collaboration/review`, payload)
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

export const getRegistrationLookups = async () => {
  const { data } = await api.get('/lookups/registration-options')
  return data
}

export const getAdminRegistrationLookups = async () => {
  const { data } = await api.get('/lookups/admin/registration-options')
  return data
}

export const createRegistrationLookup = async (type, payload) => {
  const { data } = await api.post(`/lookups/admin/registration-options/${type}`, payload)
  return data
}

export const updateRegistrationLookup = async (type, id, payload) => {
  const { data } = await api.patch(`/lookups/admin/registration-options/${type}/${id}`, payload)
  return data
}

export const deleteRegistrationLookup = async (type, id) => {
  const { data } = await api.delete(`/lookups/admin/registration-options/${type}/${id}`)
  return data
}

export const getTeams = async () => {
  const { data } = await api.get('/teams')
  return data
}

export const getAdminTeams = async () => {
  const { data } = await api.get('/teams/admin')
  return data
}

export const reviewTeamRegistrationRequest = async (teamId, payload) => {
  const { data } = await api.post(`/teams/admin/${teamId}/registration/review`, payload)
  return data
}

export const getRegistrationMigrationSummary = async () => {
  const { data } = await api.get('/teams/admin/migration/registration-summary')
  return data
}

export const runRegistrationMigration = async (payload) => {
  const { data } = await api.post('/teams/admin/migration/registration', payload)
  return data
}

export const bulkUpdateTeamsCollege = async (payload) => {
  const { data } = await api.post('/teams/admin/teams/bulk-update', payload)
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
