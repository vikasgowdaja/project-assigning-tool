import { Team } from '../models/Team.js'
import { createDefaultTeamPassword, hashPassword } from '../utils/password.js'

export const ensureTeamCredentials = async () => {
  const teams = await Team.find({
    $or: [
      { passwordHash: { $exists: false } },
      { passwordHash: '' },
      { passwordHash: null }
    ]
  })

  for (const team of teams) {
    const defaultPassword = createDefaultTeamPassword(team.leadUsn)
    if (!defaultPassword) {
      continue
    }

    team.passwordHash = await hashPassword(defaultPassword)
    team.passwordHistory = []
    team.isDefaultPassword = true
    team.passwordChangedAt = null
    await team.save()
  }
}