const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // getting store from our Mongoose model that is already created in start.js
const User = mongoose.model('User'); // getting store from our Mongoose model that is already created in start.js
const multer = require('multer'); // allows us to send multipart forms for sending images
const jimp = require('jimp');
const uuid = require('uuid');
const multerOptions = {
    storage: multer.memoryStorage(), // read to memory for resizing
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/'); // allow all images files
        if (isPhoto) {
            next(null, true);
        } else {
            next({message: 'That file type isn\'t allowed!'}, false);
        }
    }
};

exports.homePage = (req, res) => {
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async(req, res, next) => {
    // Check if there is no new file to resize
    if (!req.file) {
        next(); // skip to the next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    // now we resize the photo
    const photo = await jimp.read(req.file.buffer); // receives an image from storage or a buffer
    await photo.resize(800, jimp.AUTO); // width = 800, height = auto
    await photo.write(`./public/uploads/${req.body.photo}`);
    // Once we have written the photo to our file system, keep going!
    next();
};

exports.createStore = async (req, res) => {
    req.body.author = req.user._id; // get the id of the currently logged-in user
    const store = await (new Store(req.body)).save(); // req.body = { name, description, tags }
    await store.save();
    req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 4;
    const skip = (page * limit) - limit;
    // 1. Query the database for a list of all stores
    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created: 'desc' });

    const countPromise = Store.count(); // count the number of documents
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);
    if (!stores.length && skip) {
        req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on the page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return ;
    }
    
    res.render('stores', { title: 'Stores', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) { // .equals is a mongoose method that compares ObjectIDs for you
        throw Error('You must own a store in order to edit it!');
    }
};

exports.editStore = async (req, res) => {
    // 1. Find the store given the ID
    const store = await Store.findOne({_id: req.params.id});
    // 2. Confirm they are the owner of the store
    confirmOwner(store, req.user);
    // 3. Render out the edit form so the user can edit their store
    res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
    // set the location data to be a point
    req.body.location.type = 'Point';
    // 1. Find and update the store
    const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
        new: true, // return the new store instead of the old one
        runValidators: true // run the validators when editing (by default they only run on creation)
    }).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href='/stores/${store.slug}'>View Store ➡️</a>`);
    // 2. Redirect them to the store and tell them it worked
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async(req, res, next) => {
    // Query db for the store
    const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
    if (!store) {
        next();
        return;
    }
    res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true } // Give me any store that has at least one tag
    const tagsPromise = Store.getTagsList(); // We create our own methods on the Store model
    const storesPromise = Store.find({ tags: tagQuery });
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    res.render('tags', { tags, title: 'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text: {
            $search: req.query.q
        }
    }, {
        score: { $meta: 'textScore' } // textScore is the only metadata available in MongoDB right now
    }).sort({
        score: { $meta: 'textScore' } // sort them by the score
    }).limit(5);

    res.json(stores);
};

exports.mapStores = async (req, res) => {
    const coordinates = [+req.query.lng, +req.query.lat]; // cast to number
    const query = {
        location: {
            $near: {
                $geometry: {
                    type: 'point',
                    coordinates
                },
                $maxDistance: 10000 // 10km
            }
        }
    }

    const stores = await Store.find(query).select('slug name description location photo').limit(10); // can also use -location to remove fields
    res.json(stores);
};

exports.mapPage = async (req, res) => {
    res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
    // If store is already hearted, then remove it
    const hearts = req.user.hearts.map(obj => obj.toString()) // MongoDB has overwritten toString() method;
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'; // We use set instead of $push to avoid duplicates at all cost
    const user = await User
    .findByIdAndUpdate(
        req.user._id,
        { [operator]: {hearts: req.params.id}},
        { new: true}
    );
    res.json(user);
};

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts }
    });
    res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores(); // When the queries get large, add them to your model
    res.render('topStores', { stores, title: '⭐️ Top Stores!' });
}