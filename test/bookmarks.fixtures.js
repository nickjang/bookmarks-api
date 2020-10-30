function makeBookmarksArray() {
  return [
    {
      id: 1,
      url: 'https://www.google.com',
      title: 'test1',
      rating: 5,
      description: 'description1',
    },
    {
      id: 2,
      url: 'https://www.google.com',
      title: 'test2',
      rating: 5,
      description: 'description2',
    },
    {
      id: 3,
      url: 'https://www.google.com',
      title: 'test3',
      rating: 5,
      description: 'description3',
    }
  ];
}

function makeMaliciousBookmark() {
  const maliciousBookmark = {
    id: 911,
    title: '<script>alert("xss");</script>',
    url: 'https://<script>alert("xss");</script>.com',
    rating: 5,
    description: '<img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);"> <strong></strong>'
  }
  const expectedBookmark = {
    ...maliciousBookmark,
    title: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    url: 'https://&lt;script&gt;alert(\"xss\");&lt;/script&gt;.com',
    description: `<img src="https://url.to.file.which/does-not.exist"> <strong></strong>`
  }
  return {
    maliciousBookmark,
    expectedBookmark,
  }
}

module.exports = { makeBookmarksArray, makeMaliciousBookmark };