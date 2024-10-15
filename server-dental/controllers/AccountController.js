const bcrypt = require("bcrypt");
const Account = require("../models/Account");
const Doctor = require("../models/Doctor");
const { sendAccountCreationEmail } = require("../middlewares/sendMessage");

const createAccount = async (req, res) => {
    const { username, role } = req.body;

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
        const doctor = await Doctor.findOne({ doctorID: username });
        console.log(`Searching for doctor with ID: ${username}`);
        console.log(doctor);
        if (!doctor) {
            return res.status(404).json({ message: "Bác sĩ không tồn tại." });
        }

        // Tạo tài khoản mới
        const newAccount = new Account({
            username,
            password: hashedPassword,
            role,
        });

        // Lưu tài khoản vào database
        await newAccount.save();

        // Gửi tin nhắn chứa thông tin tài khoản đến số điện thoại của bác sĩ
        await sendAccountCreationEmail(doctor.doctorEmail, doctor.doctorName, username, password);

        return res.status(201).json({ message: "Account created successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { createAccount };
