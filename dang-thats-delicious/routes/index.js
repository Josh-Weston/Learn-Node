const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// Do work here
// We will mostly use res.json (API end points) and res.render (HTML rendering)
// req.query to access query parameters
router.get('/hello', (req, res) => {
  const wes = { name: 'Wes', age: 100, cool: true };
  // res.send('Hey! It works!');
  // res.json(wes); 
  // res.json(req.query); // Send back the query parameters.
  res.render('hello.pug', { 
    name: 'wes',
    dog: req.query.dog,
    title: 'I love food'
  }); // We don't need .pug, but it seems better to be explicit here for now
});

// Separate the concerns by separating the route instructions
// Here we use route specific middleware, globabl middleware is in our app.js file
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.post('/add', 
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);
router.post('/add/:id', 
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
// router.post('/add', catchErrors(storeController.createStore)); // when someone submits a POST to /add we want to create a store

// :name gives us a named variable for our route path (e.g. /reverse/wes)
// all of the data about our request is stored in the request, including the middleware work we do before routing.
// req.params to access things in the url
router.get('/reverse/:name', (req, res) => {
  const reverse = [...req.params.name].reverse().join('');
  res.send(reverse);
});

router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login); // passportJS hndles all the sessions and cookies for us
router.get('/register', userController.registerForm);

// 1. Validate the registration data
// 2. Register the user
// 3. We need to log them in
router.post('/register', 
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));

router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', 
  authController.confirmedPasswords,
  catchErrors(authController.update)
);

router.get('/map', storeController.mapPage);
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));
router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));

router.get('/top', catchErrors(storeController.getTopStores));

/* API */
router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;
