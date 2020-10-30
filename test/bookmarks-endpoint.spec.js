const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures');

describe('Bookmarks Endpoints', () => {
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
  
    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert(maliciousBookmark);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'api_token')
          .expect(200)
          .then(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title);
            expect(res.body[0].url).to.eql(expectedBookmark.url);
            expect(res.body[0].description).to.eql(expectedBookmark.description);
          });
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

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 1;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', 'api_token')
          .expect(200, expectedBookmark);
      });
    });
  
    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert(maliciousBookmark);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', 'api_token')
          .expect(200)
          .then(res => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.url).to.eql(expectedBookmark.url);
            expect(res.body.description).to.eql(expectedBookmark.description);
          });
      });
    });
  });

  describe('POST /bookmarks', () => {
    it('creates a bookmark, responding with 201 and the new bookmark', () => {
      const newBookmark = {
        title: 'test title',
        url: 'https://google.com',
        rating: 5,
        description: 'test description'
      };

      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', 'api_token')
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body).to.have.property('id');
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
        })
        .then(postRes => {
          console.log('res', postRes);
          return supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .set('Authorization', 'api_token')
            .expect(postRes.body);
        });
    });

    const requiredFields = ['title', 'url'];

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'test title',
        url: 'https://www.google.com',
        rating: 5,
        description: 'test description'
      };

      it(`responds with 400 and error message when ${field} missing`, () => {
        delete newBookmark[field];
        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', 'api_token')
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    const invalidInputs = { rating: 0, url: 'invalid URL' };

    let invalidInput;
    for (invalidInput in invalidInputs) {
      const newBookmark = {
        title: 'test title',
        url: 'https://www.google.com',
        rating: 5,
        description: 'test description'
      };

      it(`responds with 400 and error message when ${invalidInput} invalid`, () => {
        newBookmark[invalidInput] = invalidInputs[invalidInput];
        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', 'api_token')
          .send(newBookmark)
          .expect(400, {
            error: { message: `Given an invalid ${invalidInput}` }
          });
      });
    }

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      it('removes XSS attack content', () => {
        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', 'api_token')
          .send(maliciousBookmark)
          .expect(201)
          .then(res => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.url).to.eql(expectedBookmark.url);
            expect(res.body.description).to.eql(expectedBookmark.description);
          });
      });
    });
  });

  describe('DELETE /bookmarks/:id', () => {
    context('Given no bookmarks in the database', () => {
      it('responds with 404', () => {
        const bookmarkId = 8;
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .set('Authorization', 'api_token')
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('populate the table with bookmarks', () =>
        db.into('bookmarks').insert(testBookmarks));

      it('responds with 204', () => {
        const idToRemove = 1;
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .set('Authorization', 'api_token')
          .expect(204)
          .then(() => {
            return supertest(app)
              .get('/bookmarks')
              .set('Authorization', 'api_token')
              .expect(expectedBookmarks);
          });
      });
    });
  });
});