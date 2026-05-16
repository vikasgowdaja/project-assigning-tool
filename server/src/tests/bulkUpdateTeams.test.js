import request from 'supertest';
import app from '../app';
import Team from '../models/Team';

describe('Bulk Update Teams API', () => {
  beforeAll(async () => {
    // Seed database with test data
    await Team.insertMany([
      { _id: 'team1', name: 'Team 1', college: 'Old College' },
      { _id: 'team2', name: 'Team 2', college: 'Old College' },
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await Team.deleteMany({ _id: { $in: ['team1', 'team2'] } });
  });

  it('should update the college value for selected teams', async () => {
    const response = await request(app)
      .post('/api/admin/teams/bulk-update')
      .send({
        teamIds: ['team1', 'team2'],
        college: 'New College',
      })
      .set('Authorization', `Bearer admin-token`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('2 teams updated successfully');

    const updatedTeams = await Team.find({ _id: { $in: ['team1', 'team2'] } });
    updatedTeams.forEach((team) => {
      expect(team.college).toBe('New College');
    });
  });

  it('should return an error for invalid input', async () => {
    const response = await request(app)
      .post('/api/admin/teams/bulk-update')
      .send({
        teamIds: [],
        college: '',
      })
      .set('Authorization', `Bearer admin-token`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Team IDs are required and must be an array.');
  });
});