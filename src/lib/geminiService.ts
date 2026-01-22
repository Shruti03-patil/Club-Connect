import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper to convert Blob to Base64 for Gemini
async function fileToGenerativePart(blob: Blob) {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: blob.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Chat Completion
export const getGeminiChatCompletion = async (messages: any[]) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Parse messages to separate system prompt and history
        let systemInstruction = undefined;
        let history = [];
        let lastMessage = "";

        // Iterate through messages to structure them for Gemini
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            if (msg.role === 'system') {
                systemInstruction = msg.content;
            } else if (i === messages.length - 1 && msg.role === 'user') {
                // The very last message is the new prompt
                lastMessage = msg.content;
            } else {
                // History
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        const chat = model.startChat({
            history: history,
            systemInstruction: systemInstruction,
        });

        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw error;
    }
};

// Audio Transcription (using Gemini's multimodal capabilities)
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Convert Blob to Part
        const audioPart = await fileToGenerativePart(audioBlob);

        const result = await model.generateContent([
            "Transcribe this audio exactly as it is spoken. Do not add any commentary users or timestamps, just the text.",
            audioPart
        ]);

        return result.response.text();
    } catch (error) {
        console.error("Gemini Transcription Error:", error);
        throw error;
    }
};

// Vision (Image Captioning/Analysis)
export const generateImageCaption = async (imageBase64: string, prompt: string): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: "image/jpeg", // Assuming JPEG for simplicity, or pass type if needed
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        throw error;
    }
};
