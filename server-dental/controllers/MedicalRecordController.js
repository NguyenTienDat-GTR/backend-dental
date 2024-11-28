const MedicalRecord = require('../models/MedicalRecord');
const Service = require('../models/Service');
const AppointmentTicket = require('../models/AppointmentTicket');
const Customer = require('../models/Customer');
const Tooth = require('../models/Tooth');
const Jaw = require('../models/Jaw');
const getVietnamTimeString = () => {
    const now = new Date();
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    return now.toLocaleString("en-GB", {timeZone: "Asia/Ho_Chi_Minh", ...options}).replace(',', '');
};

const getAllRecords = async (req, res) => {
    try {
        const records = await MedicalRecord.find()
            .populate('customerID', 'name phone email gender')  // Populate customer thông tin
            .populate({
                path: 'usedService.service',  // Populate thông tin Service
                select: 'name price unit'
            })
            .populate({
                path: 'appointmentID',  // Populate thông tin AppointmentTicket
                select: 'status doneBy'
            })
            .populate({
                path: 'usedService.for',  // Populate Tooth or Jaw nếu có
                match: {unit: {$in: ['tooth', 'jaw']}},  // Lọc chỉ Tooth hoặc Jaw
                select: 'name'  // Chọn trường bạn muốn
            });

        res.json(records);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

const createMedicalRecord = async (req, res) => {
    try {
        const {
            customerID,
            doctorID,
            doctorName,
            usedService,
            appointmentID,
            diagnosis,
            result,
            note, // optional,
        } = req.body;
        console.log(req.body);

        // Kiểm tra tất cả các trường bắt buộc
        if (!customerID || !doctorID || !doctorName || !usedService || !appointmentID || !diagnosis || !result) {
            return res.status(400).json({message: "Vui lòng điền đầy đủ thông tin trừ trường ghi chú."});
        }

        // Kiểm tra các dịch vụ sử dụng
        for (const item of usedService) {
            if (!item.service ) {
                return res.status(400).json({message: "'service' fields in usedService are required."});
            }

            // Lấy thông tin Service
            const service = await Service.findById(item.service);
            if (!service) {
                return res.status(404).json({message: `Service with ID ${item.service} not found.`});
            }

            // Kiểm tra 'for' liên kết với Tooth hoặc Jaw dựa trên unit
            if (service.unit === 'tooth') {
                const tooth = await Tooth.findOne({ name: item.for });
                if (!tooth) {
                    return res.status(404).json({ message: `Tooth with name ${item.for} not found.` });
                }
            } else if (service.unit === 'jaw') {
                const jaw = await Jaw.findOne({ name: item.for });
                if (!jaw) {
                    return res.status(404).json({ message: `Jaw with name ${item.for} not found.` });
                }
            }

        }

        // Tạo MedicalRecord
        const medicalRecord = new MedicalRecord({
            customerID,
            doctorID,
            doctorName,
            usedService,
            appointmentID,
            diagnosis,
            result,
            note, // Có thể null
        });

        // Lưu MedicalRecord vào cơ sở dữ liệu
        const savedRecord = await medicalRecord.save();

        // Thêm ID của MedicalRecord vào Customer
        if (savedRecord) {
            await AppointmentTicket.findByIdAndUpdate(appointmentID, {
                status: 'done',
                doneBy: doctorName,
                doneAt: getVietnamTimeString()
            });
            await Customer.findByIdAndUpdate(customerID, {$push: {medicalRecords: savedRecord._id}});
        }
        res.status(201).json({message: "MedicalRecord created successfully", data: savedRecord});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: error.message});
    }
};

const getMedicalRecordsByCustomerID = async (req, res) => {
    const { customerID } = req.params;
    const { page = 1, limit = 5 } = req.query;

    try {
        const records = await MedicalRecord.find({ customerID })
            .populate('usedService.service', 'name price discount') // Populate thông tin dịch vụ
            .populate('appointmentID', 'date time') // Populate thông tin lịch hẹn
            .populate('customerID', 'name phone email') // Populate thông tin khách hàng
            .sort({ date: -1 }) // Sắp xếp mới nhất trước
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalRecords = await MedicalRecord.countDocuments({ customerID });
        res.status(200).json({
            records,
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching medical records' });
    }
};



module.exports = {getAllRecords, createMedicalRecord, getMedicalRecordsByCustomerID};