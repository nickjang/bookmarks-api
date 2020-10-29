const express = require('express');
const { v4: uuid } = require('uuid');
const logger = require('../logger.js');
const bookmarks = require('../store.js');
const { PORT } = require('../config');
const BookmarksService = require('./bookmarks-service');
const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks);
      })
      .catch(next);
  })
  .post(bodyParser, (req, res) => {
    const { url, title, rating = 1, description = '' } = req.body;

    if (!url) {
      logger.error('Need URL');
      return res.status(404).send('Invalid Data');
    }

    if (!title) {
      logger.error('Need title');
      return res.status(404).send('Invalid Data');
    }

    const id = uuid();
    const newBookmark = {
      id,
      url,
      title,
      rating,
      description,
    };

    logger.info(`New bookmark ${newBookmark} created`);
    bookmarks.push(newBookmark);

    return res
      .status(201)
      .location(`http://localhost:${PORT}/bookmarks/${id}`)
      .json(newBookmark);
  });

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const { id } = req.params;
    if (!id) {
      logger.error('id not found');
      return res.status(404).send('Invalid data');
    }

    const knexInstance = req.app.get('db');

    BookmarksService.getById(knexInstance, id)
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json(
            { error: { message: 'Bookmark doesn\'t exist' } }
          );
        }
        res.json(bookmark);
      })
      .catch(next);
  })
  .delete((req, res) => {
    const { id } = req.params;
    if (!id) {
      logger.error('id not found');
      return res.status(404).send('Invalid data');
    }

    const index = bookmarks.findIndex(
      (bookmark) => String(bookmark.id) === String(id)
    );

    if (index === -1) {
      logger.error(`Could not find id: ${id}`);
      return res.status(404).send('Invalid data');
    }

    bookmarks.splice(index, 1);

    logger.info(`Deleted bookmark with id: ${id}`);

    res.status(204).end();
  });

module.exports = bookmarkRouter;
