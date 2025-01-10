const crypto = require('crypto');

const generateID = async (birthdate, phone, citizenID) => {
    // Chuyển ngày sinh sang định dạng mmdd
    const date = new Date(birthdate);
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Đảm bảo 2 chữ số cho tháng
    const day = date.getDate().toString().padStart(2, "0"); // Đảm bảo 2 chữ số cho ngày

    // Kết hợp ngày, tháng sinh, số điện thoại và số căn cước công dân
    const combinedData = month + day + phone + citizenID;

    // Sử dụng SHA-256 để băm chuỗi kết hợp
    const hash = crypto.createHash('sha256').update(combinedData).digest('hex');

    // Lấy 8 chữ số từ kết quả băm
    const id = parseInt(hash.substring(0, 15), 16) % 100000000; // Chuyển đổi 15 ký tự đầu thành số và lấy mod 100000000 để đảm bảo có 8 chữ số

    // Trả về kết quả đảm bảo 8 chữ số
    return id.toString().padStart(8, '0');
};

module.exports = { generateID };
