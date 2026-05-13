import { Counter } from '../models/Counter.js'

export const getNextTeamNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: 'teamNumber' },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true }
  )

  return `TEAM-${String(counter.sequence).padStart(3, '0')}`
}
