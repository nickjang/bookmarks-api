const BookmarksService = {
  getAllBookmarks(knex) {
    return knex
      .select('*')
      .from('bookmarks');
  },
  getById(knex, id) {
    return knex
      .select('*')
      .from('bookmarks')
      .where('id', id)
      .first();
  },
  insertBookmark(knex, bookmark) {
    return knex
      .into('bookmarks')
      .insert(bookmark)
      .returning('*')
      .then(row => row[0]);
  },
  deleteBookmark(knex, id) {
    return knex
      .from('bookmarks')
      .where({ id })
      .delete();
  },
  updateBookmark(knex, id, newBookmarkFields) {
    return knex('bookmarks')
      .where({ id })
      .update(newBookmarkFields);
  }
};

module.exports = BookmarksService;