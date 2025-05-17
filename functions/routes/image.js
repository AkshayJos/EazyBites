const express = require("express");
const router = express.Router();
const grid = require("gridfs-stream");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const upload = require("./upload");

dotenv.config();

const url = process.env.SERVER_URL;

let gfs, gridfsBucket;
const conn = mongoose.connection;
conn.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "fs",
  });

  gfs = grid(conn.db, mongoose.mongo);
  gfs.collection("fs");
});

router.post("/file/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    console.log("Image not found !!");
    return;
  }

  const imageUrl = `${url}/image/file/${req.file.filename}`;

  return res.status(200).json(imageUrl);
});

router.get("/file/:filename", async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    const readStream = gridfsBucket.openDownloadStream(file._id);
    readStream.pipe(res);
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
