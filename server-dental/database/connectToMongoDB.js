const mongoose = require("mongoose");

const connectToMongoDB = async () => {
    await mongoose
        .connect(process.env.CONECTION_STRING_DB)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch((error) => {
            console.log("Error connecting to MongoDB", error.message);
        });
}

module.exports = {
    connectToMongoDB
};