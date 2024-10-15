const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'duzypuqnp',
    api_key: '894874229633813',
    api_secret: process.env.API_KEY_CLOUDINARY
});

module.exports = { cloudinary }