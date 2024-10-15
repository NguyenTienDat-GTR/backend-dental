const nodemailer = require("nodemailer");
const USER_MAIL = process.env.USER_MAIL;
const PASS_MAIL = process.env.PASS_MAIL;

// Hàm cấu hình transporter dùng chung
const createTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: USER_MAIL,
            pass: PASS_MAIL, // Thay thế bằng mật khẩu ứng dụng của bạn
        },
    });
};

// Hàm để gửi email tạo tài khoản
const sendAccountCreationEmail = async (email, name, username, password) => {
    const transporter = createTransporter();

    const message = {
        from: USER_MAIL,
        to: email,
        subject: "Tạo tài khoản mới - Nha Khoa HBT",
        text: `Chào ${name},\n\nTài khoản của bạn đã được tạo thành công trên hệ thống của nha khoa HBT!\nTên đăng nhập: ${username}\nMật khẩu: ${password}\n\nVui lòng đổi mật khẩu ngay sau khi đăng nhập.`,
    };

    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });
};

// Hàm gửi email reset mật khẩu (ví dụ)
const sendPasswordResetEmail = async (email, resetLink) => {
    const transporter = createTransporter();

    const message = {
        from: USER_MAIL,
        to: email,
        subject: "Yêu cầu đặt lại mật khẩu - Nha Khoa HBT",
        text: `Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu từ bạn. Vui lòng nhấp vào đường link sau để đặt lại mật khẩu của bạn: ${resetLink}`,
    };

    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });
};

module.exports = {
    sendAccountCreationEmail,
    sendPasswordResetEmail,
};
