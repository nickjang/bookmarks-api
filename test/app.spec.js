const app = require('../src/app');

describe('App', () => {
  it('GET / responds with 200 containing "Bookmarks server."', () => {
    return supertest(app)
      .get('/')
      .set('Authorization', 'api_token')
      .expect(200, 'Bookmarks server.');
  });
});
