const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger.js');
const BookmarksService = require('./bookmarks-service');

const bookmarkRouter = express.Router();
const bodyParser = express.json();

const sanitize = (bookmark) => {
  let newBookmark = { ...bookmark };
  const keysToSanitize = ['title', 'url', 'description'];
  let currentKey;
  for (currentKey of keysToSanitize) {
    if (newBookmark.hasOwnProperty(currentKey) && newBookmark[currentKey])
      newBookmark[currentKey] = xss(newBookmark[currentKey]);
  }
  return newBookmark;
};

bookmarkRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(sanitize));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { url, title, rating = 1, description = '' } = req.body;
    const newBookmark = { url, title, rating, description };

    const requiredFields = ['url', 'title'];
    requiredFields.forEach(field => {
      // eslint-disable-next-line eqeqeq
      if (newBookmark[field] == null) {
        logger.error(`Missing '${field}' in request body`);
        return res.status(400).json({
          error: { message: `Missing '${field}' in request body` }
        });
      }
    });

    const validations = {
      rating: {
        bool: (newBookmark.rating && (newBookmark.rating > 5 || newBookmark.rating < 1)),
        message: 'between 1-5'
      },
      url: {
        bool: (newBookmark.url && !newBookmark.url.includes('https://') && !newBookmark.url.includes('.', 9)),
        message: 'in format https://__.__'
      }
    }

    for (validation in validations) {
      if (validations[validation].bool) {
        logger.error(
          `Given an invalid ${validation}. ${newBookmark[validation]} is not ${validations[validation].message}`
        );
        return res.status(400).json({
          error: { message: `Given an invalid ${validation}` }
        });
      }
    }

    logger.info(`New bookmark ${newBookmark} created`);

    BookmarksService
      .insertBookmark(req.app.get('db'), sanitize(newBookmark))
      .then(bookmark => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
          .json(bookmark)
      })
      .catch(next);
  });

bookmarkRouter
  .route('/:id')
  .all((req, res, next) => {
    const id = req.params.id;

    if (!id) {
      logger.error(`Missing 'id' in request body`);
      return res.status(400).json({
        error: { message: `Missing 'id' in request body` }
      });
    }

    BookmarksService.getById(req.app.get('db'), id)
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json(
            { error: { message: 'Bookmark doesn\'t exist' } }
          );
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(sanitize(res.bookmark))
  })
  .delete((req, res, next) => {
    const id = req.params.id;
    BookmarksService
      .deleteBookmark(req.app.get('db'), id)
      .then(() => {
        logger.info(`Deleted bookmark with id: ${id}`);
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(bodyParser, (req, res, next) => {
    const { url, title, rating, description } = req.body;
    const bookmarkToUpdate = { url, title, rating, description };

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: 'Request body must content either \'title\', \'url\', \'rating\' or \'description\''
        }
      });

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.id,
      sanitize(bookmarkToUpdate)
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarkRouter;
