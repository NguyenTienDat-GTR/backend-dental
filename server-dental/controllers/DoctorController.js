const Doctor = require("../models/Doctor");
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

// Hàm để kiểm tra workingTime
const validateWorkingTime = (workingTime) => {
    return workingTime && Array.isArray(workingTime) && workingTime.length > 0;
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

const createDoctor = async (req, res) => {
    try {
        // Lấy thông tin từ request body
        const { doctorName, gender, doctorPhone, doctorEmail, citizenID, address, doctorSpecialization, birthDate, workingTime } = req.body;

        let urlAvatar = "";
        // console.log(req.body);


        // Validate thông tin đầu vào
        if (!doctorName || !validateName(doctorName)) {
            return res.status(400).json({ message: "Tên sai định dạng. Không được chứa kí tự đặc biệt hoặc số" });
        }

        if (!gender) {
            return res.status(400).json({ message: "Giới tính không được bỏ trống" });
        }

        if (!doctorPhone || !validatePhone(doctorPhone)) {
            return res.status(400).json({ message: "Số điện thoại bắt đầu bằng 0, có 10 số, không chứa chữ cái và kí tự đặc biệt" });
        }

        if (!doctorEmail || !validateEmail(doctorEmail)) {
            return res.status(400).json({ message: "Email sai định dạng" });
        }

        if (!citizenID || !validateCitizenID(citizenID)) {
            return res.status(400).json({ message: "Số căn cước phải đú 12 số, không chứa chữ cái và kí tự đặc biệt" });
        }

        if (!address || !validateAddress(address)) {
            return res.status(400).json({ message: "Địa chỉ không được để trống" });
        }

        if (!validateWorkingTime(workingTime)) {
            return res.status(400).json({ message: "Thời gian làm việc không được để trống" });
        }

        if (!validateSpecialization(doctorSpecialization)) {
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

        // Tạo doctorID bằng cách gọi hàm generateID
        const doctorID = await generateID(birthDate, doctorPhone, citizenID);

        // Tạo một bác sĩ mới
        const newDoctor = new Doctor({
            doctorID,
            doctorName,
            gender,
            birthDate,
            doctorPhone,
            doctorEmail,
            citizenID,
            address,
            workingTime,
            doctorSpecialization,
            urlAvatar,
        });

        // Lưu bác sĩ vào cơ sở dữ liệu
        await newDoctor.save();

        // Trả về phản hồi thành công
        return res.status(201).json({
            message: "Thêm bác sĩ mới thành công",
            doctor: newDoctor,
        });
    } catch (error) {
        console.error('Error in create Doctor', JSON.stringify(error, null, 2));
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { createDoctor };
