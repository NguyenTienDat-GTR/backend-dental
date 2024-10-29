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

        // Gửi tin nhắn chứa thông tin tài khoản đến email của bác sĩ
        await sendAccountCreationEmail(employee.employeeEmail, employee.employeeName, username, password);

        return res.status(201).json({ message: "Tạo tài khoản thành công" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getAllAccount = async (req, res) => {
    try {
        // Lấy danh sách tất cả các tài khoản, loại bỏ trường password
        const accounts = await Account.find().select("-password");

        // Mảng mới để lưu trữ tài khoản cùng thông tin nhân viên
        const accountsWithEmployee = [];

        // Lặp qua từng tài khoản để tìm kiếm thông tin nhân viên
        for (const account of accounts) {
            const employee = await Employee.findOne({ employeeID: account.username });

            // Nếu tìm thấy employee, thêm thông tin employeeID và employeeName
            if (employee) {
                accountsWithEmployee.push({
                    ...account._doc,  // Sử dụng _doc để lấy dữ liệu thô từ Mongoose document
                    employeeID: employee.employeeID,
                    employeeName: employee.employeeName,
                });
            } else {
                // Nếu không tìm thấy employee, vẫn đẩy account vào nhưng để employeeID và employeeName là null
                accountsWithEmployee.push({
                    ...account._doc,
                    employeeID: null,
                    employeeName: null,
                });
            }
        }

        // Trả về danh sách tài khoản với thông tin nhân viên
        return res.status(200).json(accountsWithEmployee);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};



// lấy danh sách employee chưa có account
const getEmployeeWithoutAccount = async (req, res) => {
    try {
        const employees = await Employee.find({ employeeID: { $nin: await Account.distinct("username") } });
        return res.status(200).json(employees);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { createAccount, getAllAccount, getEmployeeWithoutAccount };
