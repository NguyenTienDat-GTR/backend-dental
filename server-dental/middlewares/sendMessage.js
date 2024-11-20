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
const sendCreateAppointmentRequest = async (email, name, date, time, service, note, concern) => {
    const transporter = createTransporter();
    const message = {
        from: USER_MAIL,
        to: email,
        subject: "Yêu cầu đặt lịch khám - Nha Khoa HBT",
        text: `Xin chào ${name},\n\nYêu cầu đặt lịch khám của bạn đã được gửi thành công.\n\nDịch vụ: ${service}\nNgày: ${date}\nGiờ: ${time}\nGhi chú: ${note}\n\nNhững vấn đề quan tâm: ${concern}\n\nChúng tôi sẽ phản hồi cho bạn trong vòng 15 phút \n\nNếu quá 15 phút yêu cầu sẽ bị từ chối bởi hệ thống\n\nXin cảm ơn!`,
    };

    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });
}

const sendResponseAppointmentRequest = async (email, name, date, time, doctor, service) => {
    const transporter = createTransporter();
    let message = {};

    message = {
        from: USER_MAIL,
        to: email,
        subject: "Phản hồi yêu cầu đăt lịch khám - Nha Khoa HBT",
        text: `Xin chào ${name},\n\nYêu cầu đặt lịch khám của bạn đã được tạo thành công.\n\nBác sĩ yêu cầu: ${doctor}\n\nDịch vụ yêu cầu: ${service}\n\nBạn vui lòng đến phòng khám sớm hơn 30 phút vào ngày ${date} lúc ${time} để xác nhận.\n\nXin cảm ơn!`,
    };


    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });
};

const sendCancellAppointmentTicket = async (email, name, status, date, time, service, by, reason) => {
    const transporter = createTransporter();
    let message = {};
    if (status === "rejected") {
        const reject = "Đã bị từ chối";
        message = {
            from: USER_MAIL,
            to: email,
            subject: "Phản hồi yêu cầu đăt lịch khám - Nha Khoa HBT",
            text: `Xin chào ${name},\n\nPhiếu hẹn của bạn có thông tin như sau:\n\n Tên khách hàng: ${name}\n\n Ngày hẹn: ${date}\n\n Giờ hẹn: ${time}\n\n Dịch vụ: ${service}\n\nHiện tại đã quá giờ hẹn nhưng chúng tôi chưa thấy bạn đến phòng khám.\n\nChúng tôi xin thông báo phiếu hẹn của bạn đã bị hủy.\n\nLý do hủy: ${reason}\n\nHủy bởi: ${by}\n\nXin cảm ơn!`,
        }
    }

    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });

}

module.exports = {
    sendAccountCreationEmail,
    sendPasswordResetEmail,
    sendResponseAppointmentRequest,
    sendCreateAppointmentRequest,
    sendCancellAppointmentTicket
};
