

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
    ISSUE JOIN TOKEN
--------------------------------------------------------- */
export const issueJoinToken = async (req, res) => {
    try {
        const { roomName = "demo-room", identity = `user-${Date.now()}` } =
            req.body || {};

        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            console.error("Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
            return res.status(500).json({ ok: false, error: "livekit_keys_missing" });
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
    START EGRESS
--------------------------------------------------------- */
export const startEgress = async (req, res) => {
    try {
        const { roomName = "demo-room" } = req.body || {};

        if (!process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET) {
            console.error("❌ Missing LiveKit envs");
            return res.status(500).json({ ok: false, error: "livekit_config_missing" });
        }

        const client = new EgressClient(
            process.env.LIVEKIT_HOST,
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET
        );

        // Avoid duplicate
        const existing = await client.listEgress({ roomName });
        if (existing.items?.length > 0) {
            const eg = existing.items[0];
            return res.json({
                ok: true,
                message: "Egress already running",
                egressId: eg.egressId,
                status: eg.status,
                playlistUrl:
                    `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_PREFIX}${roomName}-stream-live.m3u8`
            });
        }

        // Timestamp folder
        const d = new Date();
        const timestamp =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` +
            `-${String(d.getDate()).padStart(2, "0")}_` +
            `${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}-${String(d.getSeconds()).padStart(2, "0")}`;

        const basePrefix = normalizePrefix(process.env.S3_PREFIX || "testvideos/");
        const prefix = `${basePrefix}${timestamp}/${roomName}/`;

        console.log("🗂️ S3 Folder:", prefix);

        // HLS segmented output
        const filenamePrefix = `${prefix}${roomName}-stream`;

        const hlsOut = new SegmentedFileOutput({
            filenamePrefix,
            playlistName: `${roomName}-vod.m3u8`,
            livePlaylistName: `${roomName}-stream-live.m3u8`,
            segmentDuration: 2,
            output: { case: "s3", value: s3Target() }
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

        const playlistUrl =
            `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${prefix}${roomName}-stream-live.m3u8`;

        console.log("🪣 Playlist URL:", playlistUrl);
        console.log("🎉 Egress output folder:", prefix);

        // Respond immediately
        res.json({
            ok: true,
            egressId: info.egressId,
            status: info.status,
            playlistUrl
        });

        // Start MP4 cloud recording
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

                const mp4Url =
                    `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${mp4File}`;

                console.log("📦 MP4 Recording Started:", mp4Info.egressId);
                console.log("📁 Saving to:", mp4File);
                console.log("📥 MP4 URL:", mp4Url);

            } catch (err) {
                console.error("❌ MP4 recording error:", err);
            }
        })();

        // Optional ffmpeg local recording
        if (process.env.ENABLE_FFMPEG === "true") {
            setTimeout(() => recordStreamToMP4(roomName, playlistUrl), 5000);
        }

    } catch (err) {
        console.error("❌ Egress start error:", err);
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
                .on("start", cmd => console.log("FFMPEG START:", cmd))
                .on("stderr", l => console.log("FFMPEG:", l))
                .on("end", resolve)
                .on("error", reject)
                .save(outputFile);
        });

        console.log(`✅ Local saved: ${outputFile}`);

        const key = `${normalizePrefix(process.env.S3_PREFIX)}recordings/${roomName}-${Date.now()}.mp4`;

        await s3.upload({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: fs.readFileSync(outputFile),
            ContentType: "video/mp4"
        }).promise();

        fs.unlinkSync(outputFile);

    } catch (err) {
        console.error("❌ Recording upload failed:", err);
    }
}

/* --------------------------------------------------------
    STOP EGRESS  (final updated version)
--------------------------------------------------------- */
export const stopEgress = async (req, res) => {
    try {
        const { egressId } = req.body || {};
        if (!egressId)
            return res.status(400).json({ ok: false, error: "egressId required" });

        if (!process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET)
        {
            console.error("❌ Missing LiveKit env vars");
            return res.status(500).json({ ok: false, error: "livekit_config_missing" });
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

            // FIX: EGRESS_COMPLETE (412)
            if (err.code === "failed_precondition") {
                console.log(`⚠️ Egress ${egressId} already completed (treat as success).`);
                return res.json({
                    ok: true,
                    status: "already_completed"
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
            status: info.status
        });

    } catch (err) {
        console.error("❌ Egress stop error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};
