"use strict";

var express = require('express');

function adminRouter(middleware, controllers){
	var router = express.Router();

	router.use(middleware.admin.isAdmin);
	router.use(middleware.admin.buildHeader);

	// Main:
	router.get('/', controllers.admin.home);
	router.get('/index', controllers.admin.home);
	router.get('/plugins', controllers.admin.plugins.get);
	router.get('/settings', controllers.admin.settings.get);
	router.get('/themes', controllers.admin.themes.get);
	router.get('/languages', controllers.admin.languages.get);
	router.get('/groups', controllers.admin.groups.get);
	router.get('/sounds', controllers.admin.sounds.get);

	// User:
	router.get('/users/search', controllers.admin.users.search);
	router.get('/users/latest', controllers.admin.users.sortByJoinDate);
	router.get('/users/sort-posts', controllers.admin.users.sortByPosts);
	router.get('/users/sort-reputation', controllers.admin.users.sortByReputation);
	router.get('/users', controllers.admin.users.sortByJoinDate);

	// Forum:
	router.get('/categories/active', controllers.admin.categories.active);
	router.get('/categories/disabled', controllers.admin.categories.disabled);
	
	// Misc:
	router.get('/database', controllers.admin.database.get);
	router.get('/events', controllers.admin.events.get);

	return router;
}

function apiRouter(middleware, controllers){
	var router = express.Router();

	router.use(middleware.admin.isAdmin);
	router.use(middleware.prepareAPI);

	router.get('/index', controllers.admin.home);
	router.get('/plugins', controllers.admin.plugins.get);
	router.get('/settings', controllers.admin.settings.get);
	router.get('/themes', controllers.admin.themes.get);
	router.get('/languages', controllers.admin.languages.get);
	router.get('/groups', controllers.admin.groups.get);
	router.get('/sounds', controllers.admin.sounds.get);
	router.get('/users/search', controllers.admin.users.search);
	router.get('/users/latest', controllers.admin.users.sortByJoinDate);
	router.get('/users/sort-posts', controllers.admin.users.sortByPosts);
	router.get('/users/sort-reputation', controllers.admin.users.sortByReputation);
	router.get('/users', controllers.admin.users.sortByJoinDate);
	router.get('/categories/active', controllers.admin.categories.active);
	router.get('/categories/disabled', controllers.admin.categories.disabled);

	router.get('/users/csv', middleware.authenticate, controllers.admin.users.getCSV);

	router.post('/category/uploadpicture', middleware.authenticate, controllers.admin.uploads.uploadCategoryPicture);
	router.post('/uploadfavicon', middleware.authenticate, controllers.admin.uploads.uploadFavicon);
	router.post('/uploadlogo', middleware.authenticate, controllers.admin.uploads.uploadLogo);

	router.get('/database', controllers.admin.database.get);
	router.get('/events', controllers.admin.events.get);

	return router;
}



module.exports = function(app, middleware, controllers) {
	app.use('/admin/', adminRouter(middleware, controllers));
	app.use('/api/admin/', apiRouter(middleware, controllers));
};
