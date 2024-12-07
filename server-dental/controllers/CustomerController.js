const Customer = require('../models/Customer');

const getVietnamTimeString = () => {
    const now = new Date();
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    return now.toLocaleString("en-GB", {timeZone: "Asia/Ho_Chi_Minh", ...options}).replace(',', '');
};

const getAllCustomers = async (req, res) => {
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
        const customers = await Customer.find(filter);
        res.json(customers);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

const getCustomerByID = async (req, res) => {
    try {
        const {id} = req.params;
        const customer = await Customer.findById(id).populate('medicalRecord');
        res.json(customer);
    } catch (error) {
        res.status(500).json({message: error.message});
        console.error("Error fetching customer data:", error)
    }
}

//update customer
const updateCustomer = async (req, res) => {
    try {
        const {id} = req.params;
        const {phone, email, name, gender} = req.body;

        const existingCustomer = await Customer.findById(id);
        if (!existingCustomer) {
            return res.status(404).json({message: "Không tìm thấy bệnh nhân"})
        }

        // Kiểm tra trùng số điện thoại
        const phoneExists = await Customer.findOne({phone, _id: {$ne: id}});
        if (phoneExists) {
            return res.status(400).json({message: "Số điện thoại đã được sử dụng."});
        }

        // Kiểm tra trùng email
        const emailExists = await Customer.findOne({email, _id: {$ne: id}});
        if (emailExists) {
            return res.status(400).json({message: "Email đã được sử dụng."});
        }

        existingCustomer.name = name;
        existingCustomer.phone = phone;
        existingCustomer.email = email;
        existingCustomer.gender = gender;

        await existingCustomer.save();

        return res.status(200).json({
            message: "Cập nhật thông tin bệnh nhân thành công",
            customer: existingCustomer,
        });
    } catch (error) {
        console.error("Error updating customer data:", error);
        res.status(500).json({message: error.message});
    }
};


module.exports = {
    getAllCustomers,
    getCustomerByID,
    updateCustomer
}