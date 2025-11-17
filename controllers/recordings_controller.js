// // controllers/recordings_controller.js
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// const clean = (v) => (v || "").toString().replace(/\r?\n/g, "").trim();
// const mask = (s) => (s ? s.slice(0, 4) + "…" + s.slice(-4) : "(missing)");

// const REGION =
//     clean(process.env.AWS_REGION) ||
//     clean(process.env.AWS_DEFAULT_REGION) ||
//     "ap-southeast-2";

// let s3 = new S3Client({
//     region: REGION,
//     credentials: {
//         accessKeyId: clean(process.env.AWS_ACCESS_KEY_ID),
//         secretAccessKey: clean(process.env.AWS_SECRET_ACCESS_KEY),
//     },
//     endpoint: `https://s3.${REGION}.amazonaws.com`,
//     forcePathStyle: false,
// });

// // helpful, non-sensitive logs
// console.log("[S3] region:", REGION);
// console.log("[S3] accessKeyId:", mask(clean(process.env.AWS_ACCESS_KEY_ID)));

// export const uploadRecording = async (req, res) => {
//     try {
//         const bucket = clean(process.env.S3_BUCKET);
//         const prefix = clean(process.env.S3_PREFIX) || "";
//         if (!bucket) return res.status(500).json({ error: "S3_BUCKET not configured" });
//         if (!req.file) return res.status(400).json({ error: "file field required" });

//         // filename provided by client (fallback to timestamp)
//         const safeName =
//             (req.body.fileName && req.body.fileName.trim()) ||
//             `meeting-${Date.now()}.webm`;

//         const key = `${prefix}${safeName}`.replace(/\/+/g, "/");

//         const put = new PutObjectCommand({
//             Bucket: bucket,
//             Key: key,
//             Body: req.file.buffer,
//             ContentType: req.file.mimetype || "video/webm",
//             ACL: "private", 
//         });

//         try {
//             const putResp = await s3.send(put);
//             console.log(`✅ Uploaded to S3: s3://${bucket}/${key} etag=${putResp.ETag}`);
//             return res.status(200).json({
//                 ok: true,
//                 bucket,
//                 key,
//                 etag: putResp.ETag,
//                 message: "Uploaded to S3",
//             });
//         } catch (err) {
//             // handle region redirect once (PermanentRedirect)
//             const hintedRegion =
//                 err?.$response?.headers?.["x-amz-bucket-region"] ||
//                 err?.$metadata?.hintedBucketRegion;

//             if (err?.Code === "PermanentRedirect" && hintedRegion) {
//                 console.warn(
//                     `[S3] PermanentRedirect. Retrying in hinted region: ${hintedRegion}`
//                 );
//                 s3 = new S3Client({
//                     region: hintedRegion,
//                     credentials: {
//                         accessKeyId: clean(process.env.AWS_ACCESS_KEY_ID),
//                         secretAccessKey: clean(process.env.AWS_SECRET_ACCESS_KEY),
//                         // sessionToken: clean(process.env.AWS_SESSION_TOKEN),
//                     },
//                     endpoint: `https://s3.${hintedRegion}.amazonaws.com`,
//                     forcePathStyle: false,
//                 });

//                 const putResp2 = await s3.send(put);
//                 console.log(
//                     `✅ Uploaded (retry) to S3: s3://${bucket}/${key} etag=${putResp2.ETag}`
//                 );
//                 return res.status(200).json({
//                     ok: true,
//                     bucket,
//                     key,
//                     etag: putResp2.ETag,
//                     message: "Uploaded to S3 (retry)",
//                 });
//             }

//             console.error("S3 upload failed:", err);
//             return res.status(500).json({ error: "Upload failed", details: String(err) });
//         }
//     } catch (outer) {
//         console.error("Upload handler failed:", outer);
//         return res.status(500).json({ error: "Server error", details: String(outer) });
//     }
// };





// controllers/recordings_controller.js
import AWS from "aws-sdk";
const s3 = new AWS.S3();

function normalizePrefix(p) {
    if (!p) return "";
    return p.endsWith("/") ? p : p + "/";
}

export const getPlaylistUrl = async (req, res) => {
    try {
        const room = req.params.room;
        if (!room) return res.status(400).json({ error: "room required" });

        const prefix = normalizePrefix(process.env.S3_PREFIX || "");
        const key = `${prefix}${room}-stream-live.m3u8`.replace(/\/+/g, "/");

        // If you set S3_PUBLIC=true in env, we return the public URL
        if (process.env.S3_PUBLIC === "true") {
            const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
            return res.json({ ok: true, url });
        }

        // Otherwise create a signed URL valid for 15 minutes
        const signedUrl = await s3.getSignedUrlPromise("getObject", {
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Expires: 60 * 15,
        });

        res.json({ ok: true, url: signedUrl });
    } catch (err) {
        console.error("getPlaylistUrl error:", err);
        res.status(500).json({ ok: false, error: String(err.message || err) });
    }
};

