const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now()
    },
    author: {
        type: mongoose.Schema.ObjectId, ref: 'User', required: 'You must supply an author'
    },
    store: {
        type: mongoose.Schema.ObjectId, ref: 'Store', required: 'You must supply a store'
    },
    text: {
        type: String,
        required: 'Your review must have text!'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
});

// MongoDB hook allows us to populate when the document is queries
function autoPopulate(next) {
    this.populate('author');
    next();
}

// This is great!!
reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Review', reviewSchema);