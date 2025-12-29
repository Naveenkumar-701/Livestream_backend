// // controllers/ttsController.js
// import fetch from "node-fetch";
// import { Buffer } from "buffer";

// export const generateTTS = async (req, res) => {
//   try {
//     const { text, voiceId = "eleven_multilingual_v1" } = req.body;

//     if (!text || !text.trim()) {
//       return res.status(400).json({ ok: false, error: "No text provided" });
//     }

//     const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
//     if (!ELEVEN_KEY) {
//       return res.status(500).json({ ok: false, error: "Missing ElevenLabs API key" });
//     }

//     const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

//     const elevenResp = await fetch(url, {
//       method: "POST",
//       headers: {
//         "xi-api-key": ELEVEN_KEY,
//         "Content-Type": "application/json",
//         "Accept": "audio/mpeg"
//       },
//       body: JSON.stringify({
//         text,
//         model: "eleven_multilingual_v1",
//         voice_settings: {
//           stability: 0.6,
//           similarity_boost: 0.8
//         }
//       })
//     });

//     if (!elevenResp.ok) {
//       const err = await elevenResp.text();
//       return res.status(500).json({ ok: false, error: err });
//     }

//     const arrayBuffer = await elevenResp.arrayBuffer();
//     const base64Audio = Buffer.from(arrayBuffer).toString("base64");

//     res.json({
//       ok: true,
//       audioBase64: base64Audio
//     });

//   } catch (err) {
//     console.error("TTS Error:", err);
//     res.status(500).json({ ok: false, error: "TTS failed" });
//   }
// };



// controllers/ttsController.js
import fetch from "node-fetch";
import { Buffer } from "buffer";

export const generateTTS = async (req, res) => {
  try {
    const { text, voiceId = "RnW8EXHv9GqGMgyP0sXG" } = req.body; // Use your correct voice ID

    if (!text || !text.trim()) {
      return res.status(400).json({ ok: false, error: "No text provided" });
    }

    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVEN_KEY) {
      return res.status(500).json({ 
        ok: false, 
        error: "Missing ElevenLabs API key. Please set ELEVENLABS_API_KEY in .env file." 
      });
    }

    // Truncate very long text
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) + "..." : text;

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    console.log(`🎙️ Calling ElevenLabs API with voice ID: ${voiceId}, text length: ${truncatedText.length}`);

    const elevenResp = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: "eleven_multilingual_v2", // Use v2 for better quality
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!elevenResp.ok) {
      let errorText;
      try {
        errorText = await elevenResp.text();
      } catch {
        errorText = "Could not read error response";
      }
      
      console.error("❌ ElevenLabs API error:", errorText);
      
      return res.status(elevenResp.status).json({ 
        ok: false, 
        error: "ElevenLabs TTS failed",
        details: errorText,
        statusCode: elevenResp.status
      });
    }

    const arrayBuffer = await elevenResp.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    console.log(`✅ TTS successful with voice ID ${voiceId}: ${base64Audio.length} bytes`);

    res.json({
      ok: true,
      audioBase64: base64Audio,
      voiceId: voiceId,
      textLength: truncatedText.length,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ TTS Error:", err);
    res.status(500).json({ 
      ok: false, 
      error: "TTS failed", 
      details: err.message 
    });
  }
};