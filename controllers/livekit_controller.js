
// // controllers/livekit_controller.js
// import {
//     AccessToken,
//     EgressClient,
//     SegmentedFileOutput,
//     EncodedFileOutput,
//     S3Upload,
//     EncodingOptionsPreset,
// } from "livekit-server-sdk";
// import fs from "fs";
// import AWS from "aws-sdk";
// import path from "path";
// import ffmpeg from "fluent-ffmpeg";

// /**
//  * IMPORTANT env vars:
//  * LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
//  * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
//  * S3_BUCKET, S3_PREFIX
//  * ENABLE_FFMPEG=true (optional)
//  */

// AWS.config.update({
//     region: process.env.AWS_REGION,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// const s3 = new AWS.S3();

// function normalizePrefix(p) {
//     if (!p) return "";
//     return p.endsWith("/") ? p : p + "/";
// }

// function s3Target() {
//     return new S3Upload({
//         accessKey: process.env.AWS_ACCESS_KEY_ID,
//         secret: process.env.AWS_SECRET_ACCESS_KEY,
//         region: process.env.AWS_REGION,
//         bucket: process.env.S3_BUCKET,
//         forcePathStyle: false,
//     });
// }

// /* --------------------------------------------------------
//     ISSUE JOIN TOKEN (POST)
// --------------------------------------------------------- */
// export const issueJoinToken = async (req, res) => {
//     try {
//         const { roomName = "demo-room", identity = `user-${Date.now()}` } =
//             req.body || {};

//         if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
//             console.error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "livekit_keys_missing" });
//         }

//         const at = new AccessToken(
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET,
//             { identity }
//         );

//         at.addGrant({ roomJoin: true, room: roomName });

//         const token = await at.toJwt();

//         console.log(`Issued token for identity=${identity} room=${roomName}`);

//         return res.json({ ok: true, token });
//     } catch (err) {
//         console.error("Token issue error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };

// /* --------------------------------------------------------
//     ISSUE JOIN TOKEN (GET) — same behavior, from query
//     /api/livekit/token?roomName=room-1&identity=user-123
// --------------------------------------------------------- */
// export const issueJoinTokenGET = async (req, res) => {
//     try {
//         console.log("🔵 [GET] /api/livekit/token called");
//         console.log("📥 Query params:", req.query);

//         const { roomName = "demo-room", identity = `user-${Date.now()}` } =
//             req.query || {};

//         if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
//             console.error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "livekit_keys_missing" });
//         }

//         const at = new AccessToken(
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET,
//             { identity }
//         );

//         at.addGrant({ roomJoin: true, room: roomName });

//         const token = await at.toJwt();

//         console.log(
//             `[GET] Issued token for identity=${identity} room=${roomName}`
//         );

//         return res.json({ ok: true, token });
//     } catch (err) {
//         console.error("[GET] Token issue error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };

// /* --------------------------------------------------------
//     START EGRESS (POST)
// --------------------------------------------------------- */
// export const startEgress = async (req, res) => {
//     try {
//         const { roomName = "demo-room" } = req.body || {};

//         if (
//             !process.env.LIVEKIT_HOST ||
//             !process.env.LIVEKIT_API_KEY ||
//             !process.env.LIVEKIT_API_SECRET
//         ) {
//             console.error("❌ Missing LiveKit envs");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "livekit_config_missing" });
//         }

//         const client = new EgressClient(
//             process.env.LIVEKIT_HOST,
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET
//         );

//         // Avoid duplicate
//         const existing = await client.listEgress({ roomName });
//         if (existing.items?.length > 0) {
//             const eg = existing.items[0];
//             console.log(
//                 `⚠️ Egress already running for room=${roomName}, egressId=${eg.egressId}`
//             );
//             return res.json({
//                 ok: true,
//                 message: "Egress already running",
//                 egressId: eg.egressId,
//                 status: eg.status,
//                 playlistUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_PREFIX}${roomName}-stream-live.m3u8`,
//             });
//         }

//         // Timestamp folder
//         // Convert UTC → IST
//         const istDate = new Date(
//             new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
//         );

//         const timestamp =
//             `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, "0")}` +
//             `-${String(istDate.getDate()).padStart(2, "0")}_` +
//             `${String(istDate.getHours()).padStart(2, "0")}-${String(
//                 istDate.getMinutes()
//             ).padStart(2, "0")}-${String(istDate.getSeconds()).padStart(2, "0")}`;


//         const basePrefix = normalizePrefix(process.env.S3_PREFIX || "testvideos/");
//         const prefix = `${basePrefix}${timestamp}/${roomName}/`;

//         console.log("🗂️ S3 Folder:", prefix);

//         // HLS segmented output
//         const filenamePrefix = `${prefix}${roomName}-stream`;

//         const hlsOut = new SegmentedFileOutput({
//             filenamePrefix,
//             playlistName: `${roomName}-vod.m3u8`,
//             livePlaylistName: `${roomName}-stream-live.m3u8`,
//             segmentDuration: 2,
//             output: { case: "s3", value: s3Target() },
//         });

//         console.log("🎬 Starting LiveKit Egress:", roomName);

//         const info = await client.startRoomCompositeEgress(
//             roomName,
//             hlsOut,
//             {
//                 layout: "grid",
//                 encodingOptions: EncodingOptionsPreset.H264_1080P_30,
//                 audioOnly: false,
//             }
//         );

//         const playlistUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${prefix}${roomName}-stream-live.m3u8`;

//         console.log("🪣 Playlist URL:", playlistUrl);
//         console.log("🎉 Egress output folder:", prefix);

//         // Respond immediately
//         const recordingStartTime = Date.now();
//         console.log("🎥 Recording Started At (UNIX ms):", recordingStartTime);

//         res.json({
//             ok: true,
//             egressId: info.egressId,
//             status: info.status,
//             playlistUrl,
//             recordingStartTime,
//         });

//         // Start MP4 cloud recording
//         (async () => {
//             try {
//                 const mp4File = `${prefix}${roomName}-${Date.now()}.mp4`;

//                 const mp4Out = new EncodedFileOutput({
//                     filepath: mp4File,
//                     output: { case: "s3", value: s3Target() },
//                 });

//                 const mp4Info = await client.startRoomCompositeEgress(
//                     roomName,
//                     mp4Out,
//                     {
//                         layout: "grid",
//                         encodingOptions: EncodingOptionsPreset.H264_1080P_30,
//                         audioOnly: false,
//                     }
//                 );

//                 const mp4Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${mp4File}`;

//                 console.log("📦 MP4 Recording Started:", mp4Info.egressId);
//                 console.log("📁 Saving to:", mp4File);
//                 console.log("📥 MP4 URL:", mp4Url);
//             } catch (err) {
//                 console.error("❌ MP4 recording error:", err);
//             }
//         })();

//         // Optional ffmpeg local recording
//         if (process.env.ENABLE_FFMPEG === "true") {
//             setTimeout(() => recordStreamToMP4(roomName, playlistUrl), 5000);
//         }
//     } catch (err) {
//         console.error("❌ Egress start error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };

// /* --------------------------------------------------------
//     START EGRESS (GET)
//     /api/livekit/egress/start?roomName=room-1
// --------------------------------------------------------- */
// export const startEgressGET = async (req, res) => {
//     try {
//         console.log("🟢 [GET] /api/livekit/egress/start called");
//         console.log("📥 Query params:", req.query);

//         const { roomName = "demo-room" } = req.query || {};

//         if (
//             !process.env.LIVEKIT_HOST ||
//             !process.env.LIVEKIT_API_KEY ||
//             !process.env.LIVEKIT_API_SECRET
//         ) {
//             console.error("❌ Missing LiveKit envs");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "livekit_config_missing" });
//         }

//         const client = new EgressClient(
//             process.env.LIVEKIT_HOST,
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET
//         );

//         // Avoid duplicate
//         const existing = await client.listEgress({ roomName });
//         if (existing.items?.length > 0) {
//             const eg = existing.items[0];
//             console.log(
//                 `[GET] ⚠️ Egress already running for room=${roomName}, egressId=${eg.egressId}`
//             );
//             return res.json({
//                 ok: true,
//                 message: "Egress already running",
//                 egressId: eg.egressId,
//                 status: eg.status,
//                 playlistUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_PREFIX}${roomName}-stream-live.m3u8`,
//             });
//         }

//         // Timestamp folder
//         const d = new Date();
//         const timestamp =
//             `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` +
//             `-${String(d.getDate()).padStart(2, "0")}_` +
//             `${String(d.getHours()).padStart(2, "0")}-${String(
//                 d.getMinutes()
//             ).padStart(2, "0")}-${String(d.getSeconds()).padStart(2, "0")}`;

//         const basePrefix = normalizePrefix(process.env.S3_PREFIX || "testvideos/");
//         const prefix = `${basePrefix}${timestamp}/${roomName}/`;

//         console.log("[GET] 🗂️ S3 Folder:", prefix);

//         // HLS segmented output
//         const filenamePrefix = `${prefix}${roomName}-stream`;

//         const hlsOut = new SegmentedFileOutput({
//             filenamePrefix,
//             playlistName: `${roomName}-vod.m3u8`,
//             livePlaylistName: `${roomName}-stream-live.m3u8`,
//             segmentDuration: 2,
//             output: { case: "s3", value: s3Target() },
//         });

//         console.log("[GET] 🎬 Starting LiveKit Egress:", roomName);

//         const info = await client.startRoomCompositeEgress(
//             roomName,
//             hlsOut,
//             {
//                 layout: "grid",
//                 encodingOptions: EncodingOptionsPreset.H264_1080P_30,
//                 audioOnly: false,
//             }
//         );

//         const playlistUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${prefix}${roomName}-stream-live.m3u8`;

//         console.log("[GET] 🪣 Playlist URL:", playlistUrl);
//         console.log("[GET] 🎉 Egress output folder:", prefix);

//         // Respond immediately
//         res.json({
//             ok: true,
//             egressId: info.egressId,
//             status: info.status,
//             playlistUrl,
//         });

//         // Start MP4 cloud recording
//         (async () => {
//             try {
//                 const mp4File = `${prefix}${roomName}-${Date.now()}.mp4`;

//                 const mp4Out = new EncodedFileOutput({
//                     filepath: mp4File,
//                     output: { case: "s3", value: s3Target() },
//                 });

//                 const mp4Info = await client.startRoomCompositeEgress(
//                     roomName,
//                     mp4Out,
//                     {
//                         layout: "grid",
//                         encodingOptions: EncodingOptionsPreset.H264_1080P_30,
//                         audioOnly: false,
//                     }
//                 );

//                 const mp4Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${mp4File}`;

//                 console.log("[GET] 📦 MP4 Recording Started:", mp4Info.egressId);
//                 console.log("[GET] 📁 Saving to:", mp4File);
//                 console.log("[GET] 📥 MP4 URL:", mp4Url);
//             } catch (err) {
//                 console.error("[GET] ❌ MP4 recording error:", err);
//             }
//         })();

//         // Optional ffmpeg local recording
//         if (process.env.ENABLE_FFMPEG === "true") {
//             setTimeout(() => recordStreamToMP4(roomName, playlistUrl), 5000);
//         }
//     } catch (err) {
//         console.error("❌ [GET] Egress start error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };

// /* --------------------------------------------------------
//     FFMPEG LOCAL RECORDING (optional)
// --------------------------------------------------------- */
// async function recordStreamToMP4(roomName, playlistUrl) {
//     try {
//         if (!playlistUrl) return;

//         console.log(`⏺ Recording stream from ${playlistUrl}`);

//         const outputFile = path.resolve(`./${roomName}-${Date.now()}.mp4`);

//         await new Promise((resolve, reject) => {
//             ffmpeg(playlistUrl)
//                 .inputOptions("-re")
//                 .outputOptions("-c copy")
//                 .on("start", (cmd) => console.log("FFMPEG START:", cmd))
//                 .on("stderr", (l) => console.log("FFMPEG:", l))
//                 .on("end", resolve)
//                 .on("error", reject)
//                 .save(outputFile);
//         });

//         console.log(`✅ Local saved: ${outputFile}`);

//         const key = `${normalizePrefix(
//             process.env.S3_PREFIX
//         )}recordings/${roomName}-${Date.now()}.mp4`;

//         await s3
//             .upload({
//                 Bucket: process.env.S3_BUCKET,
//                 Key: key,
//                 Body: fs.readFileSync(outputFile),
//                 ContentType: "video/mp4",
//             })
//             .promise();

//         fs.unlinkSync(outputFile);
//     } catch (err) {
//         console.error("❌ Recording upload failed:", err);
//     }
// }

// /* --------------------------------------------------------
//     STOP EGRESS  (POST - final updated version)
// --------------------------------------------------------- */
// export const stopEgress = async (req, res) => {
//     try {
//         const { egressId } = req.body || {};
//         if (!egressId)
//             return res
//                 .status(400)
//                 .json({ ok: false, error: "egressId required" });

//         if (
//             !process.env.LIVEKIT_HOST ||
//             !process.env.LIVEKIT_API_KEY ||
//             !process.env.LIVEKIT_API_SECRET
//         ) {
//             console.error("❌ Missing LiveKit env vars");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "livekit_config_missing" });
//         }

//         const client = new EgressClient(
//             process.env.LIVEKIT_HOST,
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET
//         );

//         console.log("🛑 Stopping egress:", egressId);

//         let info;

//         try {
//             info = await client.stopEgress(egressId);
//         } catch (err) {
//             // FIX: EGRESS_COMPLETE (412)
//             if (err.code === "failed_precondition") {
//                 console.log(
//                     `⚠️ Egress ${egressId} already completed (treat as success).`
//                 );
//                 return res.json({
//                     ok: true,
//                     status: "already_completed",
//                 });
//             }

//             throw err;
//         }

//         console.log("✅ Egress stopped:", info.status);

//         if (info.status === 2) {
//             console.log("🎉 LIVE STREAM & RECORDING COMPLETED");
//             console.log("📦 HLS finalized");
//             console.log("🎞️ MP4 available in S3");
//         }

//         return res.json({
//             ok: true,
//             status: info.status,
//         });
//     } catch (err) {
//         console.error("❌ Egress stop error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };

// /* --------------------------------------------------------
//     STOP EGRESS  (GET)
//     /api/livekit/egress/stop?egressId=xxxx
// --------------------------------------------------------- */
// export const stopEgressGET = async (req, res) => {
//     try {
//         console.log("🔴 [GET] /api/livekit/egress/stop called");
//         console.log("📥 Query params:", req.query);

//         const { egressId } = req.query || {};
//         if (!egressId)
//             return res
//                 .status(400)
//                 .json({ ok: false, error: "egressId required" });

//         if (
//             !process.env.LIVEKIT_HOST ||
//             !process.env.LIVEKIT_API_KEY ||
//             !process.env.LIVEKIT_API_SECRET
//         ) {
//             console.error("❌ Missing LiveKit env vars");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "livekit_config_missing" });
//         }

//         const client = new EgressClient(
//             process.env.LIVEKIT_HOST,
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET
//         );

//         console.log("[GET] 🛑 Stopping egress:", egressId);

//         let info;

//         try {
//             info = await client.stopEgress(egressId);
//         } catch (err) {
//             // FIX: EGRESS_COMPLETE (412)
//             if (err.code === "failed_precondition") {
//                 console.log(
//                     `[GET] ⚠️ Egress ${egressId} already completed (treat as success).`
//                 );
//                 return res.json({
//                     ok: true,
//                     status: "already_completed",
//                 });
//             }

//             throw err;
//         }

//         console.log("[GET] ✅ Egress stopped:", info.status);

//         if (info.status === 2) {
//             console.log("[GET] 🎉 LIVE STREAM & RECORDING COMPLETED");
//             console.log("[GET] 📦 HLS finalized");
//             console.log("[GET] 🎞️ MP4 available in S3");
//         }

//         return res.json({
//             ok: true,
//             status: info.status,
//         });
//     } catch (err) {
//         console.error("❌ [GET] Egress stop error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };

// /* --------------------------------------------------------
//     LIST RECORDINGS FOR A ROOM (GET)
//     /api/livekit/list-recordings?roomName=room-001
// --------------------------------------------------------- */
// export const listRecordingsByRoomGET = async (req, res) => {
//     try {
//         console.log("📂 [GET] /api/livekit/list-recordings called");
//         console.log("📥 Query params:", req.query);

//         const { roomName } = req.query || {};
//         if (!roomName) {
//             return res
//                 .status(400)
//                 .json({ ok: false, error: "roomName is required" });
//         }

//         if (!process.env.S3_BUCKET) {
//             console.error("❌ Missing S3_BUCKET env");
//             return res
//                 .status(500)
//                 .json({ ok: false, error: "s3_config_missing" });
//         }

//         const basePrefix = normalizePrefix(process.env.S3_PREFIX || "testvideos/");
//         const searchPrefix = basePrefix; // we'll filter by room in code

//         console.log("📦 Using S3 Bucket:", process.env.S3_BUCKET);
//         console.log("🔎 Searching under prefix:", searchPrefix);
//         console.log("🔎 Filtering by roomName:", roomName);

//         let allObjects = [];
//         let ContinuationToken = undefined;

//         do {
//             const params = {
//                 Bucket: process.env.S3_BUCKET,
//                 Prefix: searchPrefix,
//                 ContinuationToken,
//             };

//             const data = await s3.listObjectsV2(params).promise();
//             allObjects = allObjects.concat(data.Contents || []);
//             ContinuationToken = data.IsTruncated ? data.NextContinuationToken : undefined;
//         } while (ContinuationToken);

//         const roomPathFragment = `/${roomName}/`;
//         const filtered = allObjects.filter((obj) =>
//             obj.Key.includes(roomPathFragment)
//         );

//         console.log(
//             `📄 Found ${filtered.length} objects in S3 for room=${roomName}`
//         );
//         filtered.forEach((f, idx) => {
//             console.log(
//                 `   #${idx + 1} ${f.Key} (${f.Size} bytes, ${f.LastModified})`
//             );
//         });

//         const region = process.env.AWS_REGION;
//         const bucket = process.env.S3_BUCKET;

//         const files = filtered.map((f) => ({
//             key: f.Key,
//             size: f.Size,
//             lastModified: f.LastModified,
//             url: `https://${bucket}.s3.${region}.amazonaws.com/${f.Key}`,
//         }));

//         return res.json({
//             ok: true,
//             roomName,
//             totalFiles: files.length,
//             files,
//         });
//     } catch (err) {
//         console.error("❌ [GET] listRecordingsByRoom error:", err);
//         return res.status(500).json({ ok: false, error: err.message });
//     }
// };








// controllers/livekit_controller.js
import {
    AccessToken,
    EgressClient,
    SegmentedFileOutput,
    EncodedFileOutput,
    S3Upload,
    EncodingOptionsPreset,
} from "livekit-server-sdk";
import fs from "fs";
import AWS from "aws-sdk";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";

/**
 * IMPORTANT env vars:
 * LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 * S3_BUCKET, S3_PREFIX
 * ENABLE_FFMPEG=true (optional)
 */

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd8cele0fjkppb.cloudfront.net';

function normalizePrefix(p) {
    if (!p) return "";
    return p.endsWith("/") ? p : p + "/";
}

function s3Target() {
    return new S3Upload({
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.S3_BUCKET,
        forcePathStyle: false,
    });
}

/* --------------------------------------------------------
    ISSUE JOIN TOKEN (POST)
--------------------------------------------------------- */
export const issueJoinToken = async (req, res) => {
    try {
        // FIX: Properly extract roomName from request body
        const { roomName, identity = `user-${Date.now()}` } = req.body;

        // Validate roomName exists
        if (!roomName) {
            console.error("❌ Room name is required in request body");
            return res.status(400).json({ 
                ok: false, 
                error: "Room name is required" 
            });
        }

        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            console.error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
            return res
                .status(500)
                .json({ ok: false, error: "livekit_keys_missing" });
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            { identity }
        );

        at.addGrant({ roomJoin: true, room: roomName });

        const token = await at.toJwt();

        console.log(`Issued token for identity=${identity} room=${roomName}`);

        return res.json({ ok: true, token });
    } catch (err) {
        console.error("Token issue error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    ISSUE JOIN TOKEN (GET)
--------------------------------------------------------- */
export const issueJoinTokenGET = async (req, res) => {
    try {
        console.log("🔵 [GET] /api/livekit/token called");
        console.log("📥 Query params:", req.query);

        const { roomName = "demo-room", identity = `user-${Date.now()}` } =
            req.query || {};

        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            console.error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
            return res
                .status(500)
                .json({ ok: false, error: "livekit_keys_missing" });
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            { identity }
        );

        at.addGrant({ roomJoin: true, room: roomName });

        const token = await at.toJwt();

        console.log(
            `[GET] Issued token for identity=${identity} room=${roomName}`
        );

        return res.json({ ok: true, token });
    } catch (err) {
        console.error("[GET] Token issue error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    START EGRESS (POST) - UPDATED
--------------------------------------------------------- */

// UPDATED startEgress function - REPLACE YOUR EXISTING ONE
export const startEgress = async (req, res) => {
    try {
        const { roomName } = req.body;
        
        if (!roomName) {
            console.error("❌ Room name is required in request body");
            return res.status(400).json({ 
                ok: false, 
                error: "Room name is required" 
            });
        }

        console.log("🎯 Starting egress for room:", roomName);
        console.log("🌐 CloudFront Domain:", CLOUDFRONT_DOMAIN);

        if (
            !process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET
        ) {
            console.error("❌ Missing LiveKit envs");
            return res
                .status(500)
                .json({ ok: false, error: "livekit_config_missing" });
        }

        const client = new EgressClient(
            process.env.LIVEKIT_HOST,
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET
        );

        // Check for existing egress
        const existing = await client.listEgress({ room: roomName });
        if (existing.items?.length > 0) {
            const eg = existing.items[0];
            console.log(
                `⚠️ Egress already running for room=${roomName}, egressId=${eg.egressId}`
            );
            
            // ✅ USE CLOUDFRONT URL INSTEAD OF S3
            const cloudfrontPlaylistUrl = `https://${CLOUDFRONT_DOMAIN}/leainterview/${roomName}-stream-live.m3u8`;
            
            return res.json({
                ok: true,
                message: "Egress already running",
                egressId: eg.egressId,
                status: eg.status,
                playlistUrl: cloudfrontPlaylistUrl, // ✅ CloudFront URL
            });
        }

        // Your existing timestamp and session setup
        const istDate = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );

        const timestamp =
            `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, "0")}` +
            `-${String(istDate.getDate()).padStart(2, "0")}_` +
            `${String(istDate.getHours()).padStart(2, "0")}-${String(
                istDate.getMinutes()
            ).padStart(2, "0")}-${String(istDate.getSeconds()).padStart(2, "0")}`;

        const sessionUuid = uuidv4();
        const sessionFolder = `${timestamp}-${sessionUuid}`;
        const basePrefix = normalizePrefix(process.env.S3_PREFIX || "leainterview/");
        const prefix = `${basePrefix}${sessionFolder}/${roomName}/`;

        console.log("===============================================");
        console.log("📌 NEW INTERVIEW SESSION STARTED");
        console.log("🕒 Session folder:", sessionFolder);
        console.log("🆕 UUID:", sessionUuid);
        console.log("🎯 Room ID:", roomName);
        console.log("📁 S3 Prefix:", prefix);
        console.log("🌐 CloudFront Domain:", CLOUDFRONT_DOMAIN);
        console.log("===============================================");

        // HLS segmented output (keep existing)
        const filenamePrefix = `${prefix}${roomName}-stream`;

        const hlsOut = new SegmentedFileOutput({
            filenamePrefix,
            playlistName: `${roomName}-vod.m3u8`,
            livePlaylistName: `${roomName}-stream-live.m3u8`,
            segmentDuration: 2,
            output: { case: "s3", value: s3Target() },
        });

        console.log("🎬 Starting LiveKit Egress:", roomName);

        const info = await client.startRoomCompositeEgress(
            roomName,
            hlsOut,
            {
                layout: "grid",
                encodingOptions: EncodingOptionsPreset.H264_1080P_30,
                audioOnly: false,
            }
        );

        // ✅ USE CLOUDFRONT URL INSTEAD OF S3 URL
        const playlistUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${prefix}${roomName}-stream-live.m3u8`;
        const cloudfrontPlaylistUrl = `https://${CLOUDFRONT_DOMAIN}/${prefix}${roomName}-stream-live.m3u8`;
        const cloudfrontVodUrl = `https://${CLOUDFRONT_DOMAIN}/${prefix}${roomName}-vod.m3u8`;

        console.log("🪣 Playlist URL:", playlistUrl);
        console.log("🌐 CloudFront Live Playlist URL:", cloudfrontPlaylistUrl);
        console.log("🌐 CloudFront VOD Playlist URL:", cloudfrontVodUrl);

        const recordingStartTime = Date.now();
        console.log("🎥 Recording Started At (UNIX ms):", recordingStartTime);

        res.json({
            ok: true,
            egressId: info.egressId,
            sessionUuid,
            sessionFolder,
            playlistUrl: cloudfrontPlaylistUrl, // ✅ CloudFront URL
            vodUrl: cloudfrontVodUrl, // ✅ CloudFront URL
            recordingStartTime,
        });

        // Optional: MP4 recording with CloudFront URL
        (async () => {
            try {
                const mp4File = `${prefix}${roomName}-${Date.now()}.mp4`;

                const mp4Out = new EncodedFileOutput({
                    filepath: mp4File,
                    output: { case: "s3", value: s3Target() },
                });

                const mp4Info = await client.startRoomCompositeEgress(
                    roomName,
                    mp4Out,
                    {
                        layout: "grid",
                        encodingOptions: EncodingOptionsPreset.H264_1080P_30,
                        audioOnly: false,
                    }
                );

                const mp4Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${mp4File}`;

                const mp4CloudfrontUrl = `https://${CLOUDFRONT_DOMAIN}/${mp4File}`;

                console.log("📦 MP4 Recording Started:", mp4Info.egressId);
                console.log("📁 MP4 Path:", mp4File);
                console.log("📥 MP4 URL:", mp4Url);
                console.log("🌐 MP4 CloudFront URL:", mp4CloudfrontUrl);
            } catch (err) {
                console.error("❌ MP4 recording error:", err);
            }
        })();

    } catch (err) {
        console.error("❌ Egress start error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    START EGRESS (GET)
--------------------------------------------------------- */
export const startEgressGET = async (req, res) => {
    try {
        console.log("🟢 [GET] /api/livekit/egress/start called");
        console.log("📥 Query params:", req.query);

        const { roomName = "demo-room" } = req.query || {};

        if (
            !process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET
        ) {
            console.error("❌ Missing LiveKit envs");
            return res
                .status(500)
                .json({ ok: false, error: "livekit_config_missing" });
        }

        const client = new EgressClient(
            process.env.LIVEKIT_HOST,
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET
        );

        // Avoid duplicate
        const existing = await client.listEgress({ room: roomName });
        if (existing.items?.length > 0) {
            const eg = existing.items[0];
            console.log(
                `[GET] ⚠️ Egress already running for room=${roomName}, egressId=${eg.egressId}`
            );
            return res.json({
                ok: true,
                message: "Egress already running",
                egressId: eg.egressId,
                status: eg.status,
                playlistUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_PREFIX}${roomName}-stream-live.m3u8`,
            });
        }

        // Normal timestamp (UTC)
        const d = new Date();
        const timestamp =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` +
            `-${String(d.getDate()).padStart(2, "0")}_` +
            `${String(d.getHours()).padStart(2, "0")}-${String(
                d.getMinutes()
            ).padStart(2, "0")}-${String(d.getSeconds()).padStart(2, "0")}`;

        const sessionUuid = uuidv4();
        const sessionFolder = `${timestamp}-${sessionUuid}`;

        const basePrefix = normalizePrefix(process.env.S3_PREFIX || "leainterview/");
        const prefix = `${basePrefix}${sessionFolder}/${roomName}/`;

        console.log("===============================================");
        console.log("📌 [GET] NEW INTERVIEW SESSION STARTED");
        console.log("🕒 Session folder:", sessionFolder);
        console.log("🆕 UUID:", sessionUuid);
        console.log("🎯 Room ID:", roomName);
        console.log("📁 S3 Prefix:", prefix);
        console.log("===============================================");

        const filenamePrefix = `${prefix}${roomName}-stream`;

        const hlsOut = new SegmentedFileOutput({
            filenamePrefix,
            playlistName: `${roomName}-vod.m3u8`,
            livePlaylistName: `${roomName}-stream-live.m3u8`,
            segmentDuration: 2,
            output: { case: "s3", value: s3Target() },
        });

        console.log("[GET] 🎬 Starting LiveKit Egress:", roomName);

        const info = await client.startRoomCompositeEgress(
            roomName,
            hlsOut,
            {
                layout: "grid",
                encodingOptions: EncodingOptionsPreset.H264_1080P_30,
                audioOnly: false,
            }
        );

        const playlistUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${prefix}${roomName}-stream-live.m3u8`;

        console.log("[GET] 🪣 Playlist URL:", playlistUrl);

        res.json({
            ok: true,
            egressId: info.egressId,
            sessionUuid,
            sessionFolder,
            playlistUrl,
        });

        if (process.env.ENABLE_FFMPEG === "true") {
            setTimeout(() => recordStreamToMP4(roomName, playlistUrl), 5000);
        }
    } catch (err) {
        console.error("❌ [GET] Egress start error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    FFMPEG LOCAL RECORDING (optional)
--------------------------------------------------------- */
async function recordStreamToMP4(roomName, playlistUrl) {
    try {
        if (!playlistUrl) return;

        console.log(`⏺ Recording stream from ${playlistUrl}`);

        const outputFile = path.resolve(`./${roomName}-${Date.now()}.mp4`);

        await new Promise((resolve, reject) => {
            ffmpeg(playlistUrl)
                .inputOptions("-re")
                .outputOptions("-c copy")
                .on("start", (cmd) => console.log("FFMPEG START:", cmd))
                .on("stderr", (l) => console.log("FFMPEG:", l))
                .on("end", resolve)
                .on("error", reject)
                .save(outputFile);
        });

        console.log(`✅ Local saved: ${outputFile}`);

        const key = `${normalizePrefix(
            process.env.S3_PREFIX || "leainterview/"
        )}recordings/${roomName}-${Date.now()}.mp4`;

        await s3
            .upload({
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: fs.readFileSync(outputFile),
                ContentType: "video/mp4",
            })
            .promise();

        fs.unlinkSync(outputFile);
    } catch (err) {
        console.error("❌ Recording upload failed:", err);
    }
}

/* --------------------------------------------------------
    STOP EGRESS  (POST)
--------------------------------------------------------- */
export const stopEgress = async (req, res) => {
    try {
        const { egressId } = req.body || {};
        if (!egressId)
            return res
                .status(400)
                .json({ ok: false, error: "egressId required" });

        if (
            !process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET
        ) {
            console.error("❌ Missing LiveKit env vars");
            return res
                .status(500)
                .json({ ok: false, error: "livekit_config_missing" });
        }

        const client = new EgressClient(
            process.env.LIVEKIT_HOST,
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET
        );

        console.log("🛑 Stopping egress:", egressId);

        let info;

        try {
            info = await client.stopEgress(egressId);
        } catch (err) {
            if (err.code === "failed_precondition") {
                console.log(
                    `⚠️ Egress ${egressId} already completed (treat as success).`
                );
                return res.json({
                    ok: true,
                    status: "already_completed",
                });
            }

            throw err;
        }

        console.log("✅ Egress stopped:", info.status);

        if (info.status === 2) {
            console.log("🎉 LIVE STREAM & RECORDING COMPLETED");
            console.log("📦 HLS finalized");
            console.log("🎞️ MP4 available in S3");
        }

        return res.json({
            ok: true,
            status: info.status,
        });
    } catch (err) {
        console.error("❌ Egress stop error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    STOP EGRESS  (GET)
--------------------------------------------------------- */
export const stopEgressGET = async (req, res) => {
    try {
        console.log("🔴 [GET] /api/livekit/egress/stop called");
        console.log("📥 Query params:", req.query);

        const { egressId } = req.query || {};
        if (!egressId)
            return res
                .status(400)
                .json({ ok: false, error: "egressId required" });

        if (
            !process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET
        ) {
            console.error("❌ Missing LiveKit env vars");
            return res
                .status(500)
                .json({ ok: false, error: "livekit_config_missing" });
        }

        const client = new EgressClient(
            process.env.LIVEKIT_HOST,
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET
        );

        console.log("[GET] 🛑 Stopping egress:", egressId);

        let info;

        try {
            info = await client.stopEgress(egressId);
        } catch (err) {
            if (err.code === "failed_precondition") {
                console.log(
                    `[GET] ⚠️ Egress ${egressId} already completed (treat as success).`
                );
                return res.json({
                    ok: true,
                    status: "already_completed",
                });
            }

            throw err;
        }

        console.log("[GET] ✅ Egress stopped:", info.status);

        if (info.status === 2) {
            console.log("[GET] 🎉 LIVE STREAM & RECORDING COMPLETED");
            console.log("[GET] 📦 HLS finalized");
            console.log("[GET] 🎞️ MP4 available in S3");
        }

        return res.json({
            ok: true,
            status: info.status,
        });
    } catch (err) {
        console.error("❌ [GET] Egress stop error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    LIST RECORDINGS FOR A ROOM (GET) 0gov3s3c
--------------------------------------------------------- */
// UPDATED listRecordingsByRoomGET function
export const listRecordingsByRoomGET = async (req, res) => {
    try {
        console.log("📂 [GET] /api/livekit/list-recordings called");
        console.log("📥 Query params:", req.query);

        const { roomName } = req.query || {};
        if (!roomName) {
            return res
                .status(400)
                .json({ ok: false, error: "roomName is required" });
        }

        if (!process.env.S3_BUCKET) {
            console.error("❌ Missing S3_BUCKET env");
            return res
                .status(500)
                .json({ ok: false, error: "s3_config_missing" });
        }

        const basePrefix = normalizePrefix(process.env.S3_PREFIX || "leainterview/");
        const searchPrefix = basePrefix;

        console.log("📦 Using S3 Bucket:", process.env.S3_BUCKET);
        console.log("🔎 Searching under prefix:", searchPrefix);
        console.log("🔎 Filtering by roomName:", roomName);

        let allObjects = [];
        let ContinuationToken = undefined;

        do {
            const params = {
                Bucket: process.env.S3_BUCKET,
                Prefix: searchPrefix,
                ContinuationToken,
            };

            const data = await s3.listObjectsV2(params).promise();
            allObjects = allObjects.concat(data.Contents || []);
            ContinuationToken = data.IsTruncated ? data.NextContinuationToken : undefined;
        } while (ContinuationToken);

        const roomPathFragment = `/${roomName}/`;
        const filtered = allObjects.filter((obj) =>
            obj.Key.includes(roomPathFragment)
        );

        console.log(
            `📄 Found ${filtered.length} objects in S3 for room=${roomName}`
        );

        // ✅ USE CLOUDFRONT URLS INSTEAD OF S3 URLS
        const files = filtered.map((f) => ({
            key: f.Key,
            size: f.Size,
            lastModified: f.LastModified,
            s3Url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${f.Key}`,
            cloudfrontUrl: `https://${CLOUDFRONT_DOMAIN}/${f.Key}`, // ✅ CloudFront URL
            isPlaylist: f.Key.endsWith('.m3u8'),
            isSegment: f.Key.endsWith('.ts'),
            isMp4: f.Key.endsWith('.mp4'),
        }));

        // Find the main playlist files
        const playlists = files.filter(f => f.isPlaylist);
        const livePlaylist = playlists.find(f => f.key.includes('stream-live.m3u8'));
        const vodPlaylist = playlists.find(f => f.key.includes('vod.m3u8'));

        return res.json({
            ok: true,
            roomName,
            totalFiles: files.length,
            cloudfrontDomain: CLOUDFRONT_DOMAIN,
            livePlaylistUrl: livePlaylist ? livePlaylist.cloudfrontUrl : null,
            vodPlaylistUrl: vodPlaylist ? vodPlaylist.cloudfrontUrl : null,
            files,
        });
    } catch (err) {
        console.error("❌ [GET] listRecordingsByRoom error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};