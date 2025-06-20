const bcrypt = require('bcrypt')
// const saltRounds = 10;
const {Admin} = require('../db/index')

// admin123

async function adminAuth(req, res, next) {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email: email });
        if (admin) {
            const hash = admin.password;
            const isVerified = await bcrypt.compare(password, hash);
            if (isVerified) {
                req.admin = admin; // pass admin to next handler
                return next();
            }
        }
        return res.status(401).send("Not An Admin");
    } catch (err) {
        return res.status(500).send("Server error");
    }
}

module.exports = {
    adminAuth
}