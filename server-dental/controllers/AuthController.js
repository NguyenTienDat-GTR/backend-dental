const Account = require("../models/Account");
const Employee = require("../models/Employee");
const bcrypt = require("bcrypt");

const generateToken = require("../utils/generateToken");

const getUserInfo = async (username) => {
    try {
        // Tìm tài khoản theo username
        const account = await Account.findOne({ username });

        if (!account) {
            throw new Error("Account not found");
        }

        // Lấy thông tin chung của tài khoản
        const userInfo = {
            username: account.username,
            role: account.role,
            createAt: account.createAt,
            createBy: account.createBy,
        };

        const employee = await Employee.findOne({ employeeID: account.username });

        if (!employee) {
            throw new Error("Employee not found");
        }

        // Thêm thông tin nhân viên vào userInfo
        userInfo.details = {
            employeeID: employee.employeeID,
            employeeName: employee.employeeName,
            gender: employee.gender,
            birthDate: employee.birthDate,
            employeePhone: employee.employeePhone,
            employeeEmail: employee.employeeEmail,
            citizenID: employee.citizenID,
            address: employee.address,
            workingTime: employee.workingTime,
            employeeSpecialization: employee.employeeSpecialization,
            urlAvatar: employee.urlAvatar,
            isWorking: employee.isWorking,
            position: employee.position,
            createBy: employee.createBy,
            createAt: employee.createAt,
        };

        // Trả về toàn bộ thông tin
        return userInfo;
    } catch (error) {
        console.error(error);
        throw new Error("Unable to fetch user information");
    }
};

const Login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Kiểm tra xem username đã tồn tại chưa
        const existAccount = await Account.findOne({ username });

        if (!existAccount) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        const isActive = existAccount.isActive;
        if (!isActive) {
            return res.status(400).json({ message: "Tài khoản đã bị khóa" });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, existAccount.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không chính xác" });
        }

        // Tạo token
        const user = await getUserInfo(existAccount.username);
        const token = generateToken( user,res);


        return res.status(200).json({ message: "Đăng nhập thành công", token});
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { Login };
