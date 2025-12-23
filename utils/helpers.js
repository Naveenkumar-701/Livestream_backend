import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
// utils/helpers.js

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

export const uploadToS3 = async (file, key) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return key;
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.REFRESH_TOKEN_KEY,
    { expiresIn: "2d" }
  );
};

export const uploadFile = async (file, key) => {
  const uploadParams = {
    Bucket: bucketName,
    Body: file.buffer,
    Key: key,
    ContentType: file.mimetype,
  };
  const command = new PutObjectCommand(uploadParams);
  await s3.send(command);

  return {
    key: uploadParams.Key,
    name: file.originalname,
  };
};