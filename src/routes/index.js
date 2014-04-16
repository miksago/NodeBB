"use strict";

var express = require('express'),
	morgan = require('morgan'),
	nconf = require('nconf'),
	controllers = require('./../controllers'),
	// meta = require('./../meta'),
	// plugins = require('./../plugins'),

	// metaRoutes = require('./meta'),
	apiRouter = require('./api');
	// adminRoutes = require('./admin'),
	// feedRoutes = require('./feeds'),
	// pluginRoutes = require('./plugins'),
	// authRoutes = require('./authentication');



function urlRouter(middleware, controllers){
	var router = express.Router();

	// Bail early if the user is logged in:
	router.get('/login', middleware.redirectToAccountIfLoggedIn);
	router.get('/register', middleware.redirectToAccountIfLoggedIn);

	router.use(middleware.buildHeader);

	router.get('/', controllers.home);
	router.get('/login', controllers.login);
	router.get('/register', controllers.register);
	router.get('/confirm/:code', controllers.confirmEmail);
	router.get('/outgoing', controllers.outgoing);
	router.get('/reset/:code?', controllers.reset);

	router.get('/search/:term?', middleware.guestSearchingAllowed, controllers.search);

	router.get('/404', controllers.static['404']);
	router.get('/403', controllers.static['403']);
	router.get('/500', controllers.static['500']);
	
	router.get('/popular/:set?', controllers.categories.popular);
	router.get('/recent/:term?', controllers.categories.recent);
	

	router.get('/notifications', middleware.authenticate, controllers.accounts.getNotifications);
	router.get('/unread/', middleware.authenticate, controllers.categories.unread);
	router.get('/unread/total', middleware.authenticate, controllers.categories.unreadTotal);

	router.get('/topic/:topic_id/:slug?', middleware.addSlug, controllers.topics.get);
	router.get('/category/:category_id/:slug?', middleware.addSlug, controllers.categories.get);

	router.get('/user/:userslug', middleware.checkGlobalPrivacySettings, controllers.accounts.getAccount);
	router.get('/user/:userslug/following', middleware.checkGlobalPrivacySettings, controllers.accounts.getFollowing);
	router.get('/user/:userslug/followers', middleware.checkGlobalPrivacySettings, controllers.accounts.getFollowers);
	router.get('/user/:userslug/posts', middleware.checkGlobalPrivacySettings, controllers.accounts.getPosts);
	router.get('/user/:userslug/topics', middleware.checkGlobalPrivacySettings, controllers.accounts.getTopics);

	router.get('/user/:userslug/favourites', middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions, controllers.accounts.getFavourites);
	router.get('/user/:userslug/edit', middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions, controllers.accounts.accountEdit);

	// todo: admin recently gained access to this page, pls check if it actually works
	router.get('/user/:userslug/settings', middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions, controllers.accounts.accountSettings);

	

	router.get('/users', middleware.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);
	// was this duped by accident or purpose?
	router.get('/users/online', middleware.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);

	router.get('/users/sort-posts', middleware.checkGlobalPrivacySettings, controllers.users.getUsersSortedByPosts);
	router.get('/users/sort-reputation', middleware.checkGlobalPrivacySettings, controllers.users.getUsersSortedByReputation);
	router.get('/users/latest', middleware.checkGlobalPrivacySettings, controllers.users.getUsersSortedByJoinDate);
	router.get('/users/search', middleware.checkGlobalPrivacySettings, controllers.users.getUsersForSearch);

	return router;
}

// function mainRoutes(app, middleware, controllers) {

function appRouter(middleware, controllers){
	var router = express.Router();

	router.use('/api/', apiRouter(middleware, controllers))

	// this should be in the API namespace
	// also, perhaps pass in :userslug so we can use checkAccountPermissions middleware - in future will allow admins to upload a picture for a user
	router.post('/user/uploadpicture', middleware.authenticate, middleware.checkGlobalPrivacySettings, /*middleware.checkAccountPermissions,*/ controllers.accounts.uploadPicture);


	router.use('/', urlRouter(middleware, controllers))

	if (process.env.NODE_ENV === 'development') {
		router.use('/debug', require('./debug')(middleware));
	}

	return router;
}


module.exports = function(app, middleware) {
	app.use(morgan({ immediate: true, format: 'dev' }));

	app.use(nconf.get('relative_path'), appRouter(middleware, controllers));

	// app.namespace(nconf.get('relative_path'), function() {
	// 	plugins.ready(function() {
	// 		app.all('/api/*', middleware.updateLastOnlineTime, middleware.prepareAPI);
	// 		plugins.fireHook('action:app.load', app, middleware, controllers);

	// 		adminRoutes(app, middleware, controllers);
	// 		metaRoutes(app, middleware, controllers);
	// 		apiRoutes(app, middleware, controllers);
	// 		feedRoutes(app, middleware, controllers);
	// 		pluginRoutes(app, middleware, controllers);
	// 		authRoutes.createRoutes(app, middleware, controllers);

	// 		/**
	// 		* Every view has an associated API route.
	// 		*
	// 		*/
	// 		mainRoutes(app, middleware, controllers);
	// 		staticRoutes(app, middleware, controllers);
	// 		topicRoutes(app, middleware, controllers);
	// 		categoryRoutes(app, middleware, controllers);
	// 		accountRoutes(app, middleware, controllers);
	// 		userRoutes(app, middleware, controllers);

	// 	});

	// 	if (process.env.NODE_ENV === 'development') {
	// 		require('./debug')(app, middleware, controllers);
	// 	}
	// });
};
