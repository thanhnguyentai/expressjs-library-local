var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');
const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

var async = require('async');

exports.index = function(req, res) {
    async.parallel({
        bookCount: function(callback) {
            Book.count({}, callback);
        },
        bookInstanceCount: function(callback) {
            BookInstance.count({}, callback);
        },
        bookInstanceAvailableCount: function(callback) {
            BookInstance.count({status: 'Available'}, callback);
        },
        authorCount: function(callback) {
            Author.count({}, callback);
        },
        genreCount: function(callback) {
            Genre.count({}, callback);
        }
    }, function(err, results) {
        res.render('index', {title: 'Local Library Home', error: err, data: results});
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {
    Book.find({}, 'title author')
        .populate('author')
        .exec(function(err, listBooks) {
            if(err) return next(err);
            res.render('book_list', {title: 'Book List', bookList: listBooks});
        });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        bookInstance: function(callback) {
            BookInstance.find({'book': req.params.id}).exec(callback);
        }
    }, function(err, results) {
        if(err) return next(err);
        if(results.book == null) {
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        res.render('book_detail', {title: 'Title', book: results.book, bookInstances: results.bookInstance});
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel({
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        }
    }, function(err, results) {
        if(err) return next(err);
        res.render('book_form', {title: 'Create Book', authors: results.authors, genres: results.genres});
    });
};

// Handle book create on POST.
exports.book_create_post = [
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },
    body('title', 'Title must not be empty').isLength({min:1}).trim(),
    body('author', 'Author must not be empty').isLength({min:1}).trim(),
    body('summary', 'Summary must not be empty').isLength({min:1}).trim(),
    body('isbn', 'ISBN must not be empty').isLength({min:1}).trim(),

    sanitizeBody('*').trim().escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        if(!errors.isEmpty()) {
            // there are some errors
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                }
            }, function(err, results) {
                if(err) return next(err);
                for(let i=0;i < results.genres.length; i++) {
                    if(book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }

                res.render('book_form', {title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array()})
            });
        } else {
            book.save(function(err) {
                if(err) return next(err);
                res.redirect(book.url);
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Book delete GET');
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Book delete POST');
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        },
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        }
    }, function(err, results) {
        if(err) return next(err);
        if(results.book == null) {
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        for(var g=0; g < results.genres.length; g++) {
            for(var b=0; b < results.book.genre.length; b++) {
                if(results.genres[g]._id.toString() == results.book.genre[b]._id.toString()) {
                    results.genres[g].checked = 'true';
                }
            }
        }

        res.render('book_form', {title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book})
    });
};

// Handle book update on POST.
exports.book_update_post = [
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }

        next();
    },

    body('title', 'Title must not be empty.').isLength({min: 1}).trim(),
    body('author', 'Author must not be empty').isLength({min: 1}).trim(),
    body('summary', 'Summary must not be empty').isLength({min: 1}).trim(),
    body('isbn', 'ISBN must not be empty').isLength({min:1}).trim(),

    sanitizeBody('title').trim().escape(),
    sanitizeBody('author').trim().escape(),
    sanitizeBody('summary').trim().escape(),
    sanitizeBody('isbn').trim().escape(),
    sanitizeBody('genre.*').trim().escape(),

    (req, res, next) => {
        const errors = validationResult(req);
        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
            _id: req.params.id
        });

        if(!errors.isEmpty()) {
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                }
            }, function(err, results) {
                if(err) return next(err);
                for(let i=0; i < results.genres.length; i++) {
                    if(book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }

                res.render('body_form', {title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array()})
            });
        } else {
            Book.findByIdAndUpdate(req.params.id, book, {}, function(err, thebook) {
                if(err) return next(err);
                res.redirect(thebook.url);
            });
        }
    }
];