const Employee = require("../models/Employee");
const Account = require("../models/Account");
const { generateID } = require("../utils/generateId");

// Hàm để kiểm tra định dạng email
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Hàm để kiểm tra tên bác sĩ
const validateName = (name) => {
    const regex = /^[A-Za-zÀ-ỹ\s]+$/; // Chỉ cho phép ký tự chữ cái và khoảng trắng
    return regex.test(name);
};

// Hàm để kiểm tra số điện thoại
const validatePhone = (phone) => {
    const regex = /^0[0-9]{9}$/; // Bắt đầu bằng 0 và có 10 số
    return regex.test(phone);
};

// Hàm để kiểm tra citizenID
const validateCitizenID = (citizenID) => {
    const regex = /^[0-9]{12}$/; // 12 số
    return regex.test(citizenID);
};

// Hàm để kiểm tra địa chỉ
const validateAddress = (address) => {
    const regex = /^[A-Za-z0-9]/; // Bắt đầu bằng số hoặc chữ cái
    return regex.test(address);
};

const validateWorkingTime = (workingTime) => {
    if (!workingTime || !Array.isArray(workingTime)) {
        return false; // Kiểm tra workingTime phải là mảng
    }

    // Kiểm tra từng đối tượng trong workingTime
    return workingTime.every(dayObj => {
        // Kiểm tra ngày hợp lệ và timeSlots hợp lệ
        const validDay = typeof dayObj.day === 'string' && dayObj.day.length > 0;
        const validTimeSlots = Array.isArray(dayObj.timeSlots) && dayObj.timeSlots.every(slot => {
            return /^[0-9]{1,2}:[0-9]{2} - [0-9]{1,2}:[0-9]{2}$/.test(slot);
        });

        return validDay && validTimeSlots;
    });
};

// Hàm để kiểm tra specialization
const validateSpecialization = (specialization) => {
    return specialization && Array.isArray(specialization) && specialization.length > 0;
};

// hàm kiểm tra birthDate
const validateBirthDate = (birthDate) => {
    const date = new Date(birthDate);// chuyển birthDate thành kiểu Date
    return date instanceof Date && !isNaN(date);// kiểm tra xem date có phải là kiểu Date và không phải là NaN
}

const createEmployee = async (req, res) => {
    try {
        // Lấy thông tin từ request body
        const {
            employeeName,
            gender,
            employeePhone,
            employeeEmail,
            citizenID,
            address,
            employeeSpecialization,
            birthDate,
            position,
            createBy,
            workingTime,
        } = req.body;

        let urlAvatar = "";

        const parsedWorkingTime = JSON.parse(workingTime);
        const parsedSpecialization = JSON.parse(employeeSpecialization);


        // Validate thông tin đầu vào
        if (!employeeName || !validateName(employeeName)) {
            return res.status(400).json({
                message: "Tên không được bỏ trống. Không được chứa kí tự đặc biệt hoặc số",
            });
        }

        if (!gender) {
            return res.status(400).json({ message: "Giới tính không được bỏ trống" });
        }

        if (!employeePhone || !validatePhone(employeePhone)) {
            return res.status(400).json({
                message:
                    "Số điện thoại bắt đầu bằng 0, có 10 số, không chứa chữ cái và kí tự đặc biệt",
            });
        } else if (await Employee.findOne({ employeePhone })) {
            return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
        }

        if (!employeeEmail || !validateEmail(employeeEmail)) {
            return res.status(400).json({ message: "Email sai định dạng" });
        } else if (await Employee.findOne({ employeeEmail })) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        if (!citizenID || !validateCitizenID(citizenID)) {
            return res.status(400).json({
                message: "Số căn cước phải đủ 12 số, không chứa chữ cái và kí tự đặc biệt",
            });
        } else if (await Employee.findOne({ citizenID })) {
            return res.status(400).json({ message: "Số căn cước đã tồn tại" });
        }

        if (!address || !validateAddress(address)) {
            return res.status(400).json({ message: "Địa chỉ không được để trống" });
        }

        if (!validateWorkingTime(parsedWorkingTime)) {
            return res.status(400).json({ message: "Thời gian làm việc không hợp lệ" });
        }

        if (!validateSpecialization(parsedSpecialization)) {
            return res.status(400).json({ message: "Bằng cấp không được để trống" });
        }

        if (!validateBirthDate(birthDate)) {
            return res.status(400).json({ message: "Ngày sinh không hợp lệ" });
        }

        if (!req.file) {
            console.log("Ảnh đại diện không được để trống");
            return res.status(400).json({ message: "Ảnh đại diện không được để trống" });
        } else {
            urlAvatar = req.file.path;
        }

        // Tạo employeeID bằng cách gọi hàm generateID
        const employeeID = await generateID(birthDate, employeePhone, citizenID);

        // Tạo một nhân viên mới
        const newEmployee = new Employee({
            employeeID,
            employeeName,
            gender,
            birthDate,
            employeePhone,
            employeeEmail,
            citizenID,
            address,
            workingTime: parsedWorkingTime,
            employeeSpecialization: parsedSpecialization,
            urlAvatar,
            position,
            createBy,
        });

        // Lưu nhân viên vào cơ sở dữ liệu
        await newEmployee.save();

        // Trả về phản hồi thành công
        return res.status(201).json({
            message: "Thêm nhân viên mới thành công",
            employee: newEmployee,
        });
    } catch (error) {
        console.error("Error in create Employee", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = { createEmployee };
