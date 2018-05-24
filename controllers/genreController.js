var Genre = require('../models/genre');
var Book = require('../models/book');
var async = require('async');
var mongoose = require('mongoose');
const { body, validationResult } = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');


// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function(err, genres) {
            if(err) return next(err);
            res.render('genre_list', {title: 'Genre List', genres: genres})
        });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
    var genreId = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        genre: function(callback) {
            Genre.findById(genreId).exec(callback);
        },
        genreBooks: function(callback) {
            Book.find({'genre': genreId}).exec(callback);
        }
    },function(err, results) {
        if(err) return next(err);
        if(results.genre == null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }

        res.render('genre_detail', {title: 'Genre Detail', genre: results.genre, books: results.genreBooks})
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre_form', { title: 'Create Genre'});
};

// Handle Genre create on POST.
exports.genre_create_post = [
    body('name', 'Genre name required').isLength({min: 1}).trim(),
    sanitizeBody('name').trim().escape(),
    (req, res, next) => {
        const errors = validationResult(req);

        var genre = new Genre({
            name: req.body.name
        });

        if (!errors.isEmpty()) {
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
        } else {
            Genre.findOne({name: req.body.name})
                .exec(function(err, foundGenre){
                    if(err) return next(err);
                    if(foundGenre) {
                        res.redirect(foundGenre.url);
                    } else {
                        genre.save(function(err) {
                            if(err) return next(err);
                            res.redirect(genre.url);
                        });
                    }
                });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Genre delete GET');
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Genre delete POST');
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Genre update GET');
};

// Handle Genre update on POST.
exports.genre_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Genre update POST');
};