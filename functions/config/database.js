const mongoose = require("mongoose");

const Connection = async (URL) =>{
    try{
        await mongoose.connect(URL);
        console.log("MongoDb Database Connected...")
    }
    catch(error){
            console.log("Error While connecting with the database : ", error);
    }
}

module.exports = Connection;
