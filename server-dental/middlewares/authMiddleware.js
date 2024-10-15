const jwt = require("jsonwebtoken");

const authMiddleware = (roles = []) => {
    return (req, res, next) => {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Kiểm tra xem người dùng có role phù hợp hay không
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: "Forbidden: Bạn không có quyền truy cập" });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: "Invalid token" });
        }
    };
};

module.exports = authMiddleware;
