const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

// We don't want to store the password itself, we want to store a hash of the password
const userSchema = new Schema({
    email: {
        type: String,
        unique: true, // only allow unique values
        lowercase: true, // always save as lowercase
        trim: true, // trim all spaces
        validate: [validator.isEmail, 'Invalid Email Address'],
        required: 'Please supply an e-mail address'
    },
    name: {
        type: String,
        required: 'Please supply a name',
        trim: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    hearts: [{ type: mongoose.Schema.ObjectId, ref: 'Store'}]
});

// MongoDB virtual field is like a calculated field in relational
userSchema.virtual('gravatar').get(function() {
    const hash = md5(this.email); // Gravatar images hash the e-mail address for protection
    return `https://gravatar.com/avatar/${hash}?s=200`;
});

// Automatically adds authentication to our schema
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler); // Returns more user-friendly from MongoDB

module.exports = mongoose.model('User', userSchema);