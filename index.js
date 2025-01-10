const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
const IP = process.env.IP_SERVER;
const { initializeSocket } = require("./socket");
const app = express();
const cookieParser = require("cookie-parser");

const {connectToMongoDB} = require("./database/connectToMongoDB");
const employeeRoute = require("./routes/EmployeeRoute");
const accountRoute = require("./routes/AccountRoute");
const authRoute = require("./routes/AuthRoute");
const serviceTypeRoute = require("./routes/ServiceTypeRoute");
const serviceRoute = require("./routes/ServiceRoute");
const appointmentRequestRoute = require("./routes/AppointmentRequestRoute");
const articleRoute = require("./routes/ArticleRoute")
const ticketRoute = require("./routes/AppointmentTicketRoute");
const customerRoute = require("./routes/CustomerRoute");
const medicalRecordRoute = require("./routes/MedicalRecordRoute");
const policyRoute = require("./routes/PolicyRoute");
const invoiceRoute = require("./routes/InvoiceRoute");
const knowledgeRoute = require("./routes/KnowledgeRoute")
// Cấu hình CORS
const corsOptions = {
    origin: "*", // Cho phép tất cả các domain. Thay đổi thành domain cụ thể nếu cần.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Các phương thức HTTP được phép
    allowedHeaders: ["Content-Type", "Authorization"], // Các header được phép
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.send("Welcome to the homepage!");
});


app.use("/employee", employeeRoute);
app.use("/account", accountRoute);
app.use("/auth", authRoute);
app.use("/service-type", serviceTypeRoute);
app.use("/service", serviceRoute);
app.use("/appointment-request", appointmentRequestRoute);
app.use("/article", articleRoute)
app.use("/ticket", ticketRoute);
app.use("/customer", customerRoute);
app.use("/medical-record", medicalRecordRoute);
app.use("/policy", policyRoute);
app.use("/invoice", invoiceRoute);
app.use("/knowledge", knowledgeRoute)

const { server, io } = initializeSocket(app);

server.listen(port, () => {
    // Kết nối đến MongoDB
    connectToMongoDB();
    console.log(`Server is running on ${IP}:${port}`);
});