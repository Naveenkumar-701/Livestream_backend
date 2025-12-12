

////////////////////// Without Mp4 convert


import {
    AccessToken,
    EgressClient,
    SegmentedFileOutput,
    S3Upload,
    EncodingOptionsPreset,
} from "livekit-server-sdk";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

// NOTE: FFMPEG dependencies are kept but commented out for future reference
// import fs from "fs";
// import path from "path";
// import ffmpeg from "fluent-ffmpeg";

/**
 * IMPORTANT env vars:
 * LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 * S3_BUCKET, S3_PREFIX
 * ENABLE_FFMPEG=true (optional - currently disabled)
 */

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd3e1mtgwa6zqfs.cloudfront.net';

function normalizePrefix(p) {
    if (!p) return "";
    return p.endsWith("/") ? p : p + "/";
}

function s3Target() {
    console.log("🔍 Creating S3Upload for LiveKit Egress:");
    console.log("   - Bucket:", process.env.S3_BUCKET);
    console.log("   - Region:", process.env.AWS_REGION);
    console.log("   - Prefix base:", process.env.S3_PREFIX || "leainterview/");
    
    // IMPORTANT: LiveKit requires specific permissions
    try {
        const uploadConfig = new S3Upload({
            accessKey: process.env.AWS_ACCESS_KEY_ID,
            secret: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
            bucket: process.env.S3_BUCKET,
            forcePathStyle: false,
            // Add these for better debugging
            metadata: {
                'livekit-egress': 'true',
                'bucket': process.env.S3_BUCKET,
                'timestamp': new Date().toISOString()
            }
        });
        
        console.log("✅ S3Upload config created successfully");
        return uploadConfig;
        
    } catch (configError) {
        console.error("❌ Failed to create S3Upload config!");
        console.error("Config error:", configError.message);
        throw configError;
    }
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
                playlistUrl: cloudfrontPlaylistUrl,
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

             // ============ ADD THIS DEBUG CODE ============
        console.log("🔍 DEBUG: Testing LiveKit Egress connection...");
        
        try {
            // Test 1: Verify S3 target configuration
            console.log("✅ S3 Target configured for bucket:", process.env.S3_BUCKET);
            
            // Test 2: Try a test upload to verify permissions
            const testKey = `test-livekit-${Date.now()}.txt`;
            console.log("📤 Testing S3 upload permissions...");
            
            await s3.putObject({
                Bucket: process.env.S3_BUCKET,
                Key: testKey,
                Body: `LiveKit test upload at ${new Date().toISOString()}`,
                ContentType: 'text/plain'
            }).promise();
            
            console.log("✅ Test upload successful!");
            
            // Clean up test file
            await s3.deleteObject({
                Bucket: process.env.S3_BUCKET,
                Key: testKey
            }).promise();
            console.log("🗑️ Test file cleaned up");
            
        } catch (s3Error) {
            console.error("❌ S3 permission test failed!");
            console.error("Error:", s3Error.message);
            console.error("Code:", s3Error.code);
            console.error("This could be why LiveKit egress fails!");
        }

        const info = await client.startRoomCompositeEgress(
            roomName,
            hlsOut,
            {
                layout: "grid",
                encodingOptions: EncodingOptionsPreset.H264_1080P_30,
                audioOnly: false,
            }
        );

        console.log("✅ LiveKit Egress STARTED successfully!");
        console.log("📋 Egress ID:", info.egressId);
        console.log("📁 File Prefix:", filenamePrefix);

        // ✅ USE CLOUDFRONT URL INSTEAD OF S3 URL
        const cloudfrontPlaylistUrl = `https://${CLOUDFRONT_DOMAIN}/${prefix}${roomName}-stream-live.m3u8`;
        const cloudfrontVodUrl = `https://${CLOUDFRONT_DOMAIN}/${prefix}${roomName}-vod.m3u8`;

        console.log("🌐 CloudFront Live Playlist URL:", cloudfrontPlaylistUrl);
        console.log("🌐 CloudFront VOD Playlist URL:", cloudfrontVodUrl);

        const recordingStartTime = Date.now();
        console.log("🎥 Recording Started At (UNIX ms):", recordingStartTime);

        res.json({
            ok: true,
            egressId: info.egressId,
            sessionUuid,
            sessionFolder,
            playlistUrl: cloudfrontPlaylistUrl,
            vodUrl: cloudfrontVodUrl,
            recordingStartTime,
        });

    } catch (err) {
        console.error("❌❌❌ EGRESS START FAILED! ❌❌❌");
        console.error("Error message:", err.message);
        console.error("Error code:", err.code);
        console.error("Error stack:", err.stack);
        console.error("S3 Bucket used:", process.env.S3_BUCKET);
        console.error("S3 Prefix used:", prefix);
        
        // Check if it's a bucket permission issue
        if (err.message.includes('permission') || err.message.includes('access') || err.message.includes('denied')) {
            console.error("🔒 Likely S3 PERMISSION issue!");
            console.error("Check bucket policy and IAM permissions for:", process.env.S3_BUCKET);
        }
        
        if (err.message.includes('bucket') || err.message.includes('Bucket')) {
            console.error("🪣 Likely BUCKET configuration issue!");
            console.error("Verify bucket exists and is in correct region");
        }
        
        return res.status(500).json({ 
            ok: false, 
            error: "Failed to start recording",
            details: err.message,
            bucket: process.env.S3_BUCKET
        });
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
            
            const cloudfrontPlaylistUrl = `https://${CLOUDFRONT_DOMAIN}/leainterview/${roomName}-stream-live.m3u8`;
            
            return res.json({
                ok: true,
                message: "Egress already running",
                egressId: eg.egressId,
                status: eg.status,
                playlistUrl: cloudfrontPlaylistUrl,
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

        const cloudfrontPlaylistUrl = `https://${CLOUDFRONT_DOMAIN}/${prefix}${roomName}-stream-live.m3u8`;
        const cloudfrontVodUrl = `https://${CLOUDFRONT_DOMAIN}/${prefix}${roomName}-vod.m3u8`;

        console.log("[GET] 🌐 CloudFront Live Playlist URL:", cloudfrontPlaylistUrl);
        console.log("[GET] 🌐 CloudFront VOD Playlist URL:", cloudfrontVodUrl);

        res.json({
            ok: true,
            egressId: info.egressId,
            sessionUuid,
            sessionFolder,
            playlistUrl: cloudfrontPlaylistUrl,
            vodUrl: cloudfrontVodUrl,
        });

    } catch (err) {
        console.error("❌ [GET] Egress start error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/* --------------------------------------------------------
    FFMPEG LOCAL RECORDING (optional) - KEPT FOR REFERENCE
    NOTE: This function is currently disabled but kept for future use
--------------------------------------------------------- */
/*
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
*/

/* --------------------------------------------------------
    STOP EGRESS (POST)
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
    STOP EGRESS (GET)
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
    LIST RECORDINGS FOR A ROOM (GET)
--------------------------------------------------------- */
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
            cloudfrontUrl: `https://${CLOUDFRONT_DOMAIN}/${f.Key}`,
            isPlaylist: f.Key.endsWith('.m3u8'),
            isSegment: f.Key.endsWith('.ts'),
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
