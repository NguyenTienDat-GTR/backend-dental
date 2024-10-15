const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const port = process.env.PORT || 3000;
const IP = process.env.IP_SERVER;

const app = express();
const http = require("http").createServer(app);

const { connectToMongoDB } = require("./database/connectToMongoDB")
const doctorRoute = require("./routes/DoctorRoute");
const accountRoute = require("./routes/AccountRoute");

// Cấu hình CORS
const corsOptions = {
    origin: "*", // Cho phép tất cả các domain. Thay đổi thành domain cụ thể nếu cần.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Các phương thức HTTP được phép
    allowedHeaders: ["Content-Type", "Authorization"], // Các header được phép
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("Welcome to the homepage!");
});

app.listen(port, () => {
    //ket noi database
    connectToMongoDB();
    console.log(`Server is running on ${IP}${port}`);
});

app.use('/doctor', doctorRoute);
app.use('/account', accountRoute);