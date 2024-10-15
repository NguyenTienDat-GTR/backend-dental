const bcrypt = require("bcrypt");
const Account = require("../models/Account");
const Employee = require("../models/Employee");
const { sendAccountCreationEmail } = require("../middlewares/sendMessage");

const createAccount = async (req, res) => {
    const { username, role, createBy } = req.body;

    try {
        // Kiểm tra xem username đã tồn tại chưa
        const existAccount = await Account.findOne({ username });

        if (existAccount) {
            return res.status(400).json({ message: "Tài khoản đã tồn tại" });
        }

        // Tạo mật khẩu ngẫu nhiên với 6 chữ số
        const password = Math.floor(100000 + Math.random() * 900000).toString();

        // Băm mật khẩu trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tìm bác sĩ dựa trên doctorID
        const employee = await Employee.findOne({ employeeID: username });

        if (!employee) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }

        // Tạo tài khoản mới
        const newAccount = new Account({
            username,
            password: hashedPassword,
            role,
            createBy,
        });

        // Lưu tài khoản vào database
        await newAccount.save();

        // Gửi tin nhắn chứa thông tin tài khoản đến số điện thoại của bác sĩ
        await sendAccountCreationEmail(employee.employeeEmail, employee.employeeName, username, password);

        return res.status(201).json({ message: "Account created successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { createAccount };
