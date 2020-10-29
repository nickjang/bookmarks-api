const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe.only('Bookmarks Endpoints', () => {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });

  before('clean the table', () => db('bookmarks').truncate());

  afterEach('clean up after each test', () => db('bookmarks').truncate());

  after('disconnect from database', () => db.destroy());

  describe('GET /bookmarks', () => {
    context('Given no bookmarks in the database', () => {
      it('responds with an empty array', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'api_token')
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();
      beforeEach('populate the table with bookmarks', () =>
        db.into('bookmarks').insert(testBookmarks));

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'api_token')
          .expect(200, testBookmarks);
      });
    });
  });

  describe('GET /bookmarks/:id', () => {
    context('Given no bookmarks in the database', () => {
      it('responds with 404', () => {
        const bookmarkId = 8;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', 'api_token')
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('populate the table with bookmarks', () =>
        db.into('bookmarks').insert(testBookmarks));

      it('responds with 200 and the specified article', () => {
        const bookmarkId = 1;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', 'api_token')
          .expect(200, expectedBookmark);
      });
    });
  });
});