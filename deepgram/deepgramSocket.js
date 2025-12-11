

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { WebSocketServer } from "ws";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

export function initDeepgramSocket(server) {
    const wss = new WebSocketServer({
        server,
        path: "/stt",
    });

    wss.on("connection", async (client) => {
        console.log("🎤 Frontend connected to Deepgram STT");

        // 1. Initialize Deepgram Connection
        const dgConnection = deepgram.listen.live({
            model: "nova-2",
            language: "en-IN",
            punctuate: true,
            smart_format: true,
            interim_results: true,
            encoding: "linear16",
            sample_rate: 16000,
            channels: 1,

            vad_events: true,
            endpointing: 300,       // 300ms of silence ⇒ final result
        });

        // 2. Deepgram WebSocket opened
        dgConnection.on(LiveTranscriptionEvents.Open, () => {
            console.log("✅ Deepgram connection opened");
            dgConnection.keepAlive();
        });

        // 3. Listen for TRANSCRIPT events (not Results)
        dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
            try {
                const transcript =
                    data?.channel?.alternatives?.[0]?.transcript || "";

                if (!transcript || !transcript.trim()) return;

                const isFinal = data.is_final === true || data.speech_final === true;

                console.log(
                    `📝 DG Transcript: "${transcript}" | final=${isFinal}`
                );

                // Send to frontend
                client.send(
                    JSON.stringify({
                        transcript,
                        isFinal,
                    })
                );
            } catch (err) {
                console.error("❌ Error handling Deepgram transcript:", err);
            }
        });

        // 4. Handle Errors
        dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
            console.error("❌ Deepgram error:", err);
        });

        // 5. Handle Close
        dgConnection.on(LiveTranscriptionEvents.Close, () => {
            console.log("🔌 Deepgram connection closed");
        });

        
        client.on("message", (audioChunk /* , isBinary */) => {
            if (dgConnection.getReadyState() !== 1) return; // 1 = OPEN

            try {
                // Convert EVERYTHING to Buffer
                const buffer = Buffer.isBuffer(audioChunk)
                    ? audioChunk
                    : Buffer.from(audioChunk);

                dgConnection.send(buffer);
            } catch (err) {
                console.error("❌ Error sending audio to Deepgram:", err);
            }
        });

        // 7. Cleanup when frontend disconnects
        client.on("close", () => {
            console.log("❌ Frontend STT disconnected");
            try {
                dgConnection.finish(); // politely end Deepgram stream
            } catch (e) {
                console.error("Error finishing Deepgram:", e);
            }
        });
    });
}
