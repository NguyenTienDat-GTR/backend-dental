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
const sendCreateAppointmentRequest = async (email, name, date, time, service,doctor, note) => {
    const transporter = createTransporter();
    const message = {
        from: USER_MAIL,
        to: email,
        subject: "Yêu cầu đặt lịch khám - Nha Khoa HBT",
        text: `Xin chào ${name},\n\nYêu cầu đặt lịch khám của bạn đã được gửi thành công.\n\nDịch vụ: ${service}\nNgày: ${date}\nGiờ: ${time}\nBác sĩ: ${doctor}\nGhi chú: ${note}\n\nChúng tôi sẽ phản hồi cho bạn trong vòng 30 phút trong giờ hành chính hoặc 6 giờ sáng hôm sau nếu thời gian gửi yêu cầu không trong giờ hành chính \n\nXin cảm ơn!`,
    };

    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });
}

const sendResponseAppointmentRequest = async (email, name, status, date, time, by, reason,doctor) => {
    const transporter = createTransporter();
    let message = {};
    if (status === "accepted") {
        const accept = "Đã được chấp nhận";
        message = {
            from: USER_MAIL,
            to: email,
            subject: "Phản hồi yêu cầu đăt lịch khám - Nha Khoa HBT",
            text: `Xin chào ${name},\n\nYêu cầu đặt lịch khám của bạn đã được xử lí.\nTrạng thái yêu cầu: ${accept}\n\nBác sĩ:${doctor}\n\nBạn vui lòng đến khám sớm 30 phút vào ngày ${date} lúc ${time}.\n\nĐược chấp nhận bởi: ${by}\n\nXin cảm ơn!`,
        };
    } else if (status === "rejected") {
        const reject = "Đã bị từ chối";
        message = {
            from: USER_MAIL,
            to: email,
            subject: "Phản hồi yêu cầu đăt lịch khám - Nha Khoa HBT",
            text: `Xin chào ${name},\n\nYêu cầu đặt lịch khám của bạn đã được xử lí.\nTrạng thái yêu cầu: ${reject}\n\nLý do từ chối: ${reason}\n\nTừ chối bởi: ${by}\n\nXin cảm ơn!`,
        }
    }

    transporter.sendMail(message, (error, info) => {
        if (error) {
            return console.log("Lỗi khi gửi email:", error);
        }
        console.log("Email đã được gửi:", info.response);
    });
};

const sendCancellAppointmentTicket = async (email, name, status, date, time, service, by, reason,cancellAt) => {
    const transporter = createTransporter();
    let message = {};
    if (by === "Hệ thống") {
        message = {
            from: USER_MAIL,
            to: email,
            subject: "Phản hồi lịch hen khám - Nha Khoa HBT",
            text: `Xin chào ${name},\n\nPhiếu hẹn của bạn có thông tin như sau:\n\n Tên khách hàng: ${name}\n\n Ngày hẹn: ${date}\n\n Giờ hẹn: ${time}\n\n Dịch vụ: ${service}\n\nHiện tại đã quá giờ hẹn nhưng chúng tôi chưa thấy bạn đến phòng khám.\n\nChúng tôi xin thông báo phiếu hẹn của bạn đã bị hủy lúc ${cancellAt}.\n\nLý do hủy: ${reason}\n\nHủy bởi: ${by}\n\nXin cảm ơn!`,
        }
    } else if (by !== "Hệ thống") {
        message = {
            from: USER_MAIL,
            to: email,
            subject: "Phản hồi lịch hẹn khám - Nha Khoa HBT",
            text: `Xin chào ${name},\n\nPhiếu hẹn của bạn có thông tin như sau:\n\n Tên khách hàng: ${name}\n\n Ngày hẹn: ${date}\n\n Giờ hẹn: ${time}\n\n Dịch vụ: ${service}\n\nĐã bị hủy lúc ${cancellAt}.\n\nLý do hủy: ${reason}\n\nHủy bởi: ${by}\n\nXin cảm ơn!`,
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
