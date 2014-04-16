"use strict";

var express = require('express'),
	path = require('path'),
	async = require('async'),
	fs = require('fs'),
	nconf = require('nconf'),

	user = require('./../user'),
	topics = require('./../topics'),
	posts = require('./../posts'),
	categories = require('./../categories'),
	meta = require('./../meta'),
	plugins = require('./../plugins'),
	utils = require('./../../public/src/utils'),
	pkg = require('./../../package.json');


function deleteTempFiles(files) {
	for(var i=0; i<files.length; ++i) {
		fs.unlink(files[i].path);
	}
}

function upload(req, res, filesIterator, next) {
	var files = req.files.files;

	if(!req.user) {
		deleteTempFiles(files);
		return res.json(403, {message:'not allowed'});
	}

	if(!Array.isArray(files)) {
		return res.json(500, {message: 'invalid files'});
	}

	if(Array.isArray(files[0])) {
		files = files[0];
	}

	async.map(files, filesIterator, function(err, images) {
		deleteTempFiles(files);

		if(err) {
			return res.send(500, err.message);
		}

		// IE8 - send it as text/html so browser won't trigger a file download for the json response
		// malsup.com/jquery/form/#file-upload
		res.send(200, req.xhr ? images : JSON.stringify(images));
	});
}

function uploadPost(req, res, next) {
	upload(req, res, function(file, next) {
		if(file.type.match(/image./)) {
			uploadImage(file, next);
		} else {
			uploadFile(file, next);
		}
	}, next);
}

function uploadThumb(req, res, next) {
	if (!meta.config.allowTopicsThumbnail) {
		deleteTempFiles(req.files.files);
		return callback(new Error('[[error:topic-thumbnails-are-disabled]]'));
	}

	upload(req, res, function(file, next) {
		if(file.type.match(/image./)) {
			uploadImage(file, next);
		} else {
			next(new Error('[[error:invalid-file]]'));
		}
	}, next);
}


function uploadImage(image, callback) {

	if(plugins.hasListeners('filter:uploadImage')) {
		plugins.fireHook('filter:uploadImage', image, callback);
	} else {

		if (meta.config.allowFileUploads) {
			uploadFile(image, callback);
		} else {
			callback(new Error('[[error:uploads-are-disabled]]'));
		}
	}
}

function uploadFile(file, callback) {

	if(plugins.hasListeners('filter:uploadFile')) {
		plugins.fireHook('filter:uploadFile', file, callback);
	} else {

		if(!meta.config.allowFileUploads) {
			return callback(new Error('[[error:uploads-are-disabled]]'));
		}

		if(!file) {
			return callback(new Error('[[error:invalid-file]]'));
		}

		if(file.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
			return callback(new Error('[[error:file-too-big, ' + meta.config.maximumFileSize + ']]'));
		}

		var filename = 'upload-' + utils.generateUUID() + path.extname(file.name);
		require('../file').saveFileToLocal(filename, file.path, function(err, upload) {
			if(err) {
				return callback(err);
			}

			callback(null, {
				url: upload.url,
				name: file.name
			});
		});
	}
}


function getModerators(req, res, next) {
	categories.getModerators(req.params.cid, function(err, moderators) {
		res.json({moderators: moderators});
	});
}

function getTemplatesListing(req, res, next) {
	utils.walk(nconf.get('views_dir'), function (err, data) {
		data = data
				.filter(function(value, index, self) {
					return self.indexOf(value) === index;
				}).map(function(el) {
					return el.replace(nconf.get('views_dir') + '/', '');
				});

		res.json(data);
	});
}

function getRecentPosts(req, res, next) {
	var uid = (req.user) ? req.user.uid : 0;

	posts.getRecentPosts(uid, 0, 19, req.params.term, function (err, data) {
		if(err) {
			return next(err);
		}

		res.json(data);
	});
}

function apiRouter(middleware, controllers){
	var router = express.Router();

	router.use(middleware.updateLastOnlineTime);
	router.use(middleware.prepareAPI);

	router.get('/config', controllers.api.getConfig);

	router.get('/user/uid/:uid', middleware.checkGlobalPrivacySettings, controllers.accounts.getUserByUID);
	router.get('/get_templates_listing', getTemplatesListing);
	router.get('/categories/:cid/moderators', getModerators);
	router.get('/recent/posts/:term?', getRecentPosts);

	router.post('/post/upload', uploadPost);
	router.post('/topic/thumb/upload', uploadThumb);



	// Core Routes:
	router.get('/home', controllers.home);
	router.get('/login', middleware.redirectToAccountIfLoggedIn, controllers.login);
	router.get('/register', middleware.redirectToAccountIfLoggedIn, controllers.register);
	router.get('/confirm/:code', controllers.confirmEmail);
	router.get('/outgoing', controllers.outgoing);
	router.get('/search/:term?', middleware.guestSearchingAllowed, controllers.search);
	router.get('/reset/:code?', controllers.reset);

	// Static API Routes:
	router.get('/404', controllers.static['404']);
	router.get('/403', controllers.static['403']);
	router.get('/500', controllers.static['500']);

	// Topic API Routes: 
	router.get('/topic/:topic_id/:slug?', controllers.topics.get);


	// Category API Routes:
	router.get('/popular/:set?', controllers.categories.popular);
	router.get('/recent/:term?', controllers.categories.recent);
	router.get('/unread/', middleware.authenticate, controllers.categories.unread);
	router.get('/unread/total', middleware.authenticate, controllers.categories.unreadTotal);
	router.get('/category/:category_id/:slug?', controllers.categories.get);


 	// Account Routes
	router.get('/notifications', middleware.authenticate, controllers.accounts.getNotifications);
	
	router.get('/user/:userslug', middleware.checkGlobalPrivacySettings, controllers.accounts.getAccount);
	router.get('/user/:userslug/following', middleware.checkGlobalPrivacySettings, controllers.accounts.getFollowing);
	router.get('/user/:userslug/followers', middleware.checkGlobalPrivacySettings, controllers.accounts.getFollowers);
	router.get('/user/:userslug/favourites', middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions, controllers.accounts.getFavourites);
	router.get('/user/:userslug/posts', middleware.checkGlobalPrivacySettings, controllers.accounts.getPosts);
	router.get('/user/:userslug/topics', middleware.checkGlobalPrivacySettings, controllers.accounts.getTopics);
	router.get('/user/:userslug/edit', middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions, controllers.accounts.accountEdit);

	// todo: admin recently gained access to this page, pls check if it actually works
	router.get('/user/:userslug/settings', middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions, controllers.accounts.accountSettings);

// User Routes
	router.get('/users', middleware.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);
	
	// was this duped by accident or purpose?
	router.get('/users/online', middleware.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);

	router.get('/users/sort-posts', middleware.checkGlobalPrivacySettings, controllers.users.getUsersSortedByPosts);
	router.get('/users/sort-reputation', middleware.checkGlobalPrivacySettings, controllers.users.getUsersSortedByReputation);
	router.get('/users/latest', middleware.checkGlobalPrivacySettings, controllers.users.getUsersSortedByJoinDate);

	router.get('/users/search', middleware.checkGlobalPrivacySettings, controllers.users.getUsersForSearch);

	return router;
};

module.exports = apiRouter;

