require("dotenv").config();
const jwt = require("jsonwebtoken");

const generateToken = (accountID, role, res) => {
    // Thêm role vào token payload
    const token = jwt.sign({ accountID, role }, process.env.JWT_SECRET, {
        expiresIn: "1d", // expires in 1 days
    });

    // Set cookie với token
    res.cookie("jwt", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development", // secure nếu không phải môi trường dev
    });

    return token;
};

module.exports = generateToken;
