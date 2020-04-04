const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // use ES6 promises instead of callbacks
const slug = require('slugs'); // make URL friendly names

// Tags is an array of strings
const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address'
        }
    },
    photo: String,
    author: { type: mongoose.Schema.ObjectId, ref: 'User', required: 'You must supply an author' }
}, {
    toJSON: { virtuals: true }, // not available for view unless you do this. The data does exist without this though
    toObject: { virtuals: true }
});

// Define our indexes
// This is our compound index. MondoDB allows you to search for anything indexed as text
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({ location: '2dsphere' }); // geospatial index

storeSchema.statics.getTagsList = function() { // proper function because we need this binding
    // the array is the aggregation pipeline. Data flows through each object
    return this.aggregate([
        { $unwind: '$tags' }, // $tags tells Mongo tags is a field in our document
        { $group : { _id: '$tags', count: { $sum: 1 }}},
        { $sort: { count: -1 }}
    ]);
}

// How we add a method
storeSchema.statics.getTopStores = function() {
    return this.aggregate([
        // Lookup stores and populate their reviews
        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews'}}, // basically the same as Mongoose virtual
        // filter for only items that have 2 or more reviews
        { $match: { 'reviews.1': { $exists: true }}}, // saying that reviews has an index of 1, which means there are at least 2 items
        // add the average reviews field
        { $addFields: {
            averageRating: { $avg: '$reviews.rating'}
        }}, 
        // sort it by our new field, highest reviews first
        { $sort: { averageRating: -1 }},
        // limit to at most 10
        { $limit: 10 }
    ]);
}

// Before the store is saved in mongoDB we are going to create the slug and set the property
// We only need to create the slug when the name changes
storeSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        next(); // skip it
        return // stop this function from running
    }
    this.slug = slug(this.name);
    // find other stores that have a slug of josh, josh-1, josh2
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx }); // this.constructor = Store schema because Store doesn't exist yet
    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`
    }
    next(); // run the next statement
});

// Go to another model and return those records from the relationship
// Find reviews where the stores _id property === reviews store property
// NOTE: Virtual is only for mongoose, MongoDB does not natively have it!
storeSchema.virtual('reviews', {
    ref: 'Review', // what model to link?
    localField: '_id', // which field on the store?
    foreignField: 'store' // which field on the review?
});

function autopopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

// Export our model
module.exports = mongoose.model('Store', storeSchema);