const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const dotenv = require('dotenv');

dotenv.config();

const USERNAME = process.env.MONGODB_USERNAME;
const PASSWORD = process.env.MONGODB_PASSWORD;

const mongoURI = `mongodb+srv://${USERNAME}:${PASSWORD}@cluster0.c2ijjo2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster00`;

let storage;

try{
  storage = new GridFsStorage({
    url: mongoURI,
    options : {useNewUrlParser : true},
    file : (request, file) =>{
      const match = ["image/png", "image/jpg", "image/jpeg"];

      if(match.indexOf(file.memeType) === -1){
          return `${Date.now()}-blog-${file.originalname}`;
      }
  
      return {
              bucketName : 'uploads',
              filename : `${Date.now()}-blog-${file.originalname}`
      }
    }
  });
}
catch(error){
  console.log(error);
}

module.exports = multer({ storage });
