const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto'); // built-in to Node.js
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
const User = mongoose.model('User');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out! ✋');
    res.redirect('/')
};

exports.isLoggedIn = (req, res, next) => {
    // first check if the user is authenticated
    if(req.isAuthenticated()) {
        next(); // carry on! they are logged in
        return;
    }
    req.flash('error', 'Oops, you must be logged in to do that!');
    res.redirect('/login');
};

exports.forgot = async (req, res) => {
    // 1. See if a user with that email exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        req.flash('error', 'No account with that email exists');
        return res.redirect('/login');
    }
    // 2. Set reset tokens and expiry on their account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();
    // 3. Send them an e-mail with the token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user,
        subject: 'Password Reset',
        resetURL,
        filename: 'password-reset'
    });

    req.flash('success', `You have been e-mailed a password reset link.`);

    // 4. Redirect to the login page
    res.redirect('/login');
};

exports.reset = async (req, res) => {

    // See if there is a user with this token and the token has not expired yet
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired');
        return res.redirect('/login');
    }

    // If there is a user, show the reset password form
    res.render('reset', { title: 'Reset your password '});
};

exports.confirmedPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {
        next(); // keep going if the passwords match
        return;
    }

    req.flash('error', 'Passwords do not match!');
    res.redirect('back');

};

exports.update = async (req, res) => {
    // validate the user is still within the 1-hour limit
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user); //setPassword is made available by plugin
    await setPassword(req.body.password);

    user.resetPasswordExpires = undefined; // removes field from record
    user.resetPasswordToken = undefined; // removes field from record
    const updatedUser = await user.save();
    await req.login(updatedUser); // automatically log the user in
    req.flash('success', 'Nice! You password has been reset 💃');
    res.redirect('/');
};