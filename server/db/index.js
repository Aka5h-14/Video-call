const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL);

const userSchema = new Schema({
    auth0Id: String,
    email: String,
    videos:[{id: String , date: Date}],
});

const adminSchema = new Schema({
    email: String,
    password: String,
    videos:[{id: String , date: Date}]
})

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model("Admin", adminSchema);

module.exports = {
    User,
    Admin
};