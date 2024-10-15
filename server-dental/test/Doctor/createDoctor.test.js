const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createDoctor } = require('../../controllers/DoctorController');
const Doctor = require('../../models/Doctor');

const app = express();
app.use(express.json());
app.post('/doctor/create', createDoctor);

let mongoServer;

beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    await mongoServer.start(); // Khởi động server
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}, 20000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('POST /doctor/create', () => {

    //testcase: create doctor successfully
    it('should create a doctor successfully', async () => {
        const reqBody = {
            doctorName: "Nguyen Van A",
            gender: "nam",
            doctorPhone: "0123456789",
            doctorEmail: "a@example.com",
            citizenID: "123456789012",
            address: "123 Nguyen Trai",
            workingTime: [{ day: "Monday", timeSlots: "8:00-12:00" }],
            doctorSpecialization: ["General Practitioner"],
            birthDate: "1990-01-01",
            file: { path: "path/avatar.png" } // giả định đây là ảnh đại diện
        };

        const response = await request(app)
            .post('/doctor/create')
            .send(reqBody);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Thêm bác sĩ mới thành công");
        expect(response.body.doctor).toHaveProperty('doctorID');
        expect(response.body.doctor.doctorName).toBe(reqBody.doctorName);
    });

    //testcase: field doctorName is invalid
    it('should return 400 if doctorName is invalid', async () => {
        const reqBody = {
            doctorName: "Nguy3n Van A!",
            gender: "nam",
            doctorPhone: "0123456789",
            doctorEmail: "a@example.com",
            citizenID: "123456789012",
            address: "123 Nguyen Trai",
            workingTime: [{ day: "Monday", timeSlots: "8:00-12:00" }],
            doctorSpecialization: ["General Practitioner"],
            birthDate: "1990-01-01",
            // file: { path: "https://picsum.photos/200" }
        };

        const response = await request(app)
            .post('/doctor/create')
            .send(reqBody);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Tên sai định dạng. Không được chứa kí tự đặc biệt hoặc số");
    });

    // testcase: field gender is missing
    it('should return 400 if gender is missing', async () => {
        const reqBody = {
            doctorName: "Nguyen Van A",
            doctorPhone: "0123456789",
            doctorEmail: "a@example.com",
            citizenID: "123456789012",
            address: "123 Nguyen Trai",
            workingTime: [{ day: "Monday", timeSlots: "8:00-12:00" }],
            doctorSpecialization: ["General Practitioner"],
            birthDate: "1990-01-01",
            // file: { path: "https://picsum.photos/200" }
        };

        const response = await request(app)
            .post('/doctor/create')
            .send(reqBody);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Giới tính không được bỏ trống");
    });

    //testcase: filed phone number invalid
    it('should return 400 if phone number is invalid', async () => {
        const reqBody = {
            doctorName: "Nguyen Van A",
            gender: "nam",
            doctorPhone: "123456789", // không đủ 10 số
            doctorEmail: "a@example.com",
            citizenID: "123456789012",
            address: "123 Nguyen Trai",
            workingTime: [{ day: "Monday", timeSlots: "8:00-12:00" }],
            doctorSpecialization: ["General Practitioner"],
            birthDate: "1990-01-01",
            // file: { path: "https://picsum.photos/200" }
        };

        const response = await request(app)
            .post('/doctor/create')
            .send(reqBody);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Số điện thoại bắt đầu bằng 0, có 10 số, không chứa chữ cái và kí tự đặc biệt");
    });

    //testcase: field email is invalid
    it('should return 400 if email is invalid', async () => {
        const reqBody = {
            doctorName: "Nguyen Van A",
            gender: "nam",
            doctorPhone: "0123456789",
            doctorEmail: "aaaexample.com", // email sai định dạng
            citizenID: "123456789012",
            address: "123 Nguyen Trai",
            workingTime: [{ day: "Monday", timeSlots: "8:00-12:00" }],
            doctorSpecialization: ["General Practitioner"],
            birthDate: "1990-01-01",
            // file: { path: "https://picsum.photos/200" }
        }
        const response = await request(app).post('/doctor/create').send(reqBody);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Email sai định dạng");
    });
});
