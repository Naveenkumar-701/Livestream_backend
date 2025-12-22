import { PutObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.REFRESH_TOKEN_KEY,
    { expiresIn: "30d" }
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