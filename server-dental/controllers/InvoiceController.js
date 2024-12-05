const MedicalRecord = require('../models/MedicalRecord');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Service = require('../models/Service');

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

const createInvoice = async (req, res) => {
    try {
        const {medicalRecordId, createBy, discount} = req.body; // Lấy discount từ request body

        if (!medicalRecordId || !createBy) {
            return res.status(400).json({message: "medicalRecordId và createBy là bắt buộc."});
        }

        // Lấy thông tin medicalRecord
        const medicalRecord = await MedicalRecord.findById(medicalRecordId)
            .populate('usedService.service')
            .populate('customerID');

        if (!medicalRecord) {
            return res.status(404).json({message: "Không tìm thấy hồ sơ y tế."});
        }

        // Lấy thông tin customer
        const customer = medicalRecord.customerID;

        if (!customer) {
            return res.status(404).json({message: "Không tìm thấy khách hàng."});
        }

        //kiểm tra đã tạo hóa đơn với medicalRecordId này chưa
        const existedInvoice = await Invoice.findOne({medicalRecordID: medicalRecordId});

        if (existedInvoice) {
            return res.status(400).json({message: "Hóa đơn đã tồn tại."});
        }

        // Tạo danh sách usedServices
        const usedServices = [];
        let totalAmount = 0;
        let totalDiscount = 0;

        for (const item of medicalRecord.usedService) {
            const service = await Service.findById(item.service);
            if (!service) {
                return res.status(404).json({message: `Không tìm thấy dịch vụ với ID: ${item.service}`});
            }

            const finalPrice = service.price * (1 - service.discount / 100);

            usedServices.push({
                service: service._id,
                name: service.name,
                for: item.for,
                price: service.price,
                discount: service.discount,
                unit: service.unit,
                finalPrice: finalPrice,
            });

            totalAmount += finalPrice;
            totalDiscount += service.price * (service.discount / 100); // Tính tổng giảm giá
        }

        // Áp dụng giảm giá cho tổng hóa đơn nếu có
        if (discount && discount > 0) {
            totalAmount = totalAmount * (1 - discount / 100);
            totalDiscount += totalAmount * (discount / 100);
        }

        // Tạo hóa đơn
        const invoice = new Invoice({
            medicalRecordID: medicalRecord._id,
            usedServices,
            totalAmount,
            totalDiscount,
            discount: discount, // Lưu giảm giá cho tổng hóa đơn
            createBy,
            paidBy: "",
            paidAt: "",
        });

        await invoice.save();

        // Trả về thông tin khách hàng và hóa đơn
        res.status(201).json({
            message: "Hóa đơn được tạo thành công.",
            customer: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email || null,
            },
            invoice,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Đã xảy ra lỗi khi tạo hóa đơn.", error: error.message});
    }
};

const getAllInvoice = async (req, res) => {
    try {
        const {year, quarter, month} = req.query;

        // Xây dựng bộ lọc cho Invoice
        const filter = {};

        // Lọc theo năm
        if (year && year !== "all") {
            filter.createdAt = {
                $regex: `.*${year} .*`,  // Tìm kiếm năm trong chuỗi dd/mm/yyyy hh:mm:ss
            };
        }

        // Lọc theo quý
        if (year && year !== "all" && quarter) {
            const quarters = {
                "1": ["01", "02", "03"],  // Quý 1 có các tháng 01, 02, 03
                "2": ["04", "05", "06"],  // Quý 2 có các tháng 04, 05, 06
                "3": ["07", "08", "09"],  // Quý 3 có các tháng 07, 08, 09
                "4": ["10", "11", "12"],  // Quý 4 có các tháng 10, 11, 12
            };

            const monthsInQuarter = quarters[quarter];

            if (monthsInQuarter) {
                filter.createdAt = {
                    $regex: `.*(${monthsInQuarter.join("|")})/${year} .*`,  // Tìm các tháng trong quý và năm
                };
            }
        }

        // Lọc theo tháng và năm
        if (month && year && year !== "all") {
            filter.createdAt = {
                $regex: `.*${month.padStart(2, '0')}/${year} .*`,  // Tìm tháng trong năm (dd/mm/yyyy hh:mm:ss)
            };
        }

        // Lấy danh sách hóa đơn theo bộ lọc
        const invoices = await Invoice.find(filter)
            .populate({
                path: 'medicalRecordID',
                populate: {
                    path: 'customerID',  // Lấy thông tin khách hàng từ customerID
                    model: 'Customer',
                    select: 'name phone email'  // Chỉ lấy các trường cần thiết của khách hàng
                }
            })
            .populate('usedServices.service')
            .populate('createBy');

        const formattedInvoices = invoices.map(invoice => {
            // Lấy thông tin khách hàng từ MedicalRecord
            const customer = invoice.medicalRecordID.customerID
                ? {
                    name: invoice.medicalRecordID.customerID.name,
                    phone: invoice.medicalRecordID.customerID.phone,
                    email: invoice.medicalRecordID.customerID.email,
                }
                : {};  // Trường hợp không tìm thấy thông tin khách hàng

            const invoiceData = {
                medicalRecordID: invoice.medicalRecordID._id,
                usedServices: invoice.usedServices.map(service => ({
                    service: service.service._id, // ID dịch vụ
                    name: service.service.name, // Tên dịch vụ
                    for: service.for,
                    price: service.price,
                    discount: service.discount,
                    unit: service.unit,
                    finalPrice: service.finalPrice,
                    _id: service._id
                })),
                discount: invoice.discount,
                totalDiscount: invoice.totalDiscount,
                totalAmount: invoice.totalAmount,
                createBy: invoice.createBy, // Tên người tạo
                isPaid: invoice.isPaid,
                paidBy: invoice.paidBy,
                paidAt: invoice.paidAt,
                _id: invoice._id,
                createdAt: invoice.createdAt,
            };

            return {customer, invoice: invoiceData};
        });

        res.status(200).json(formattedInvoices);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Đã xảy ra lỗi khi lấy danh sách hóa đơn.", error: error.message});
    }
};

// hàm xác nhận thanh toán hóa đơn
const confirmPayment = async (req, res) => {
    try {
        const {invoiceId, paidBy} = req.body;

        if (!invoiceId || !paidBy) {
            return res.status(400).json({message: "invoiceId và paidBy là bắt buộc."});
        }

        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({message: "Không tìm thấy hóa đơn."});
        }

        if (invoice.isPaid) {
            return res.status(400).json({message: "Hóa đơn đã được thanh toán."});
        }

        // Cập nhật trạng thái thanh toán
        invoice.isPaid = true;
        invoice.paidBy = paidBy;
        invoice.paidAt = getVietnamTimeString();


        // Tìm kiếm MedicalRecord từ invoice.medicalRecordID
        const medicalRecord = await MedicalRecord.findById(invoice.medicalRecordID);

        if (!medicalRecord) {
            return res.status(404).json({message: "Không tìm thấy hồ sơ y tế."});
        }


        // Cập nhật countDone cho khách hàng
        const customer = await Customer.findById(medicalRecord.customerID);

        if (customer) {
            customer.countDone += 1;
            await customer.save();
        }

        await invoice.save();

        res.status(200).json({message: "Xác nhận thanh toán thành công.", invoice});

    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Đã xảy ra lỗi khi xác nhận thanh toán.", error: error.message});
    }
};

// tính tổng tiền của tất cả hóa đơn
const calculateTotalAmount = async (req, res) => {
    try {
        const {year, quarter, month} = req.query; // Lấy year, quarter, và month từ query string

        // Lấy tất cả hóa đơn từ database
        const invoices = await Invoice.find();

        // Tính tổng tiền của các hóa đơn đã lọc
        let totalAmount = 0;

        // Bộ lọc các hóa đơn theo năm, quý và tháng
        const filteredInvoices = invoices.filter(invoice => {
            const createAt = invoice.createdAt; // Trường createAt là chuỗi "dd/mm/yyyy hh:mm:ss"
            let isValid = true;

            // Lọc theo năm
            if (year && year !== "all") {
                const yearRegex = new RegExp(`^.*${year} .*`);
                if (!yearRegex.test(createAt)) {
                    isValid = false;
                }
            }

            // Lọc theo quý
            if (isValid && year && year !== "all" && quarter) {
                const quarters = {
                    "1": ["01", "02", "03"],  // Quý 1
                    "2": ["04", "05", "06"],  // Quý 2
                    "3": ["07", "08", "09"],  // Quý 3
                    "4": ["10", "11", "12"],  // Quý 4
                };
                const monthsInQuarter = quarters[quarter];

                if (monthsInQuarter) {
                    const monthRegex = new RegExp(`.*(${monthsInQuarter.join("|")})/${year} .*`);
                    if (!monthRegex.test(createAt)) {
                        isValid = false;
                    }
                }
            }

            // Lọc theo tháng và năm
            if (isValid && month && year && year !== "all") {
                const monthRegex = new RegExp(`.*${month.padStart(2, '0')}/${year} .*`);
                if (!monthRegex.test(createAt)) {
                    isValid = false;
                }
            }

            return isValid;
        });

        // Tính tổng tiền của các hóa đơn đã lọc
        totalAmount = filteredInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);

        // Trả về kết quả
        res.status(200).json({totalAmount});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Đã xảy ra lỗi khi tính tổng tiền hóa đơn", error: error.message});
    }
}

// api trả về tổng tiền của hóa đơn đã thanh toán và cha thanh toán
const getTotalAmount = async (req, res) => {
    try {
        const { year, quarter, month } = req.query; // Lấy year, quarter, và month từ query string

        // Lấy tất cả hóa đơn từ database (không lọc theo trạng thái thanh toán)
        const invoices = await Invoice.find();

        // Tính tổng tiền của các hóa đơn đã lọc
        let unpaidAmount = 0; // Tổng tiền chưa thanh toán
        let paidAmount = 0; // Tổng tiền đã thanh toán

        // Bộ lọc các hóa đơn theo năm, quý và tháng
        const filteredInvoices = invoices.filter(invoice => {
            const createAt = invoice.createdAt; // Trường createAt là chuỗi "dd/mm/yyyy hh:mm:ss"
            let isValid = true;

            // Lọc theo năm
            if (year && year !== "all") {
                const yearRegex = new RegExp(`^.*${year} .*`); // Kiểm tra năm trong chuỗi
                if (!yearRegex.test(createAt)) {
                    isValid = false;
                }
            }

            // Lọc theo quý
            if (isValid && year && year !== "all" && quarter) {
                const quarters = {
                    "1": ["01", "02", "03"],  // Quý 1
                    "2": ["04", "05", "06"],  // Quý 2
                    "3": ["07", "08", "09"],  // Quý 3
                    "4": ["10", "11", "12"],  // Quý 4
                };
                const monthsInQuarter = quarters[quarter];

                if (monthsInQuarter) {
                    const monthRegex = new RegExp(`.*(${monthsInQuarter.join("|")})/${year} .*`); // Kiểm tra tháng trong quý
                    if (!monthRegex.test(createAt)) {
                        isValid = false;
                    }
                }
            }

            // Lọc theo tháng và năm
            if (isValid && month && year && year !== "all") {
                const monthRegex = new RegExp(`.*${month.padStart(2, '0')}/${year} .*`); // Kiểm tra tháng trong năm
                if (!monthRegex.test(createAt)) {
                    isValid = false;
                }
            }

            return isValid;
        });

        // Tính tổng tiền cho các hóa đơn đã lọc theo trạng thái thanh toán
        filteredInvoices.forEach(invoice => {
            if (invoice.isPaid) {
                paidAmount += invoice.totalAmount; // Tổng tiền đã thanh toán
            } else {
                unpaidAmount += invoice.totalAmount; // Tổng tiền chưa thanh toán
            }
        });

        // Trả về kết quả
        res.status(200).json({ unpaidAmount, paidAmount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi tính tổng tiền hóa đơn", error: error.message });
    }
};


module.exports = {createInvoice, getAllInvoice, confirmPayment, calculateTotalAmount, getTotalAmount};