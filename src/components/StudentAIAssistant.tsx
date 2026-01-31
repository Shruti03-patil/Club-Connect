
import { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, StopCircle, Loader2, Sparkles, Trash2, Volume2, VolumeX } from 'lucide-react';
import { getClubs, getPosts } from '../lib/firestoreService';
import { FirestoreClub, FirestorePost } from '../types/auth';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isTranscribing?: boolean;
}

interface StudentAIAssistantProps {
    onNavigateToClub?: (clubId: string) => void;
    onNavigateToEvent?: (eventId: string) => void;
}


// Helper to convert Blob to Base64 (kept properly scoped or removed if unused)
// const blobToBase64 = (blob: Blob): Promise<string> => { ... };

export default function StudentAIAssistant({ onNavigateToClub, onNavigateToEvent }: StudentAIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your Campus Guide. Ask me about clubs, upcoming events, or navigate anywhere!",
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);

    // Context Data
    const [clubs, setClubs] = useState<FirestoreClub[]>([]);
    const [events, setEvents] = useState<FirestorePost[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const speak = (text: string) => {
        if (!isSpeakerOn) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        // Try to find a good voice
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Microsoft David")) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    useEffect(() => {
        // Fetch context data on load
        const loadContext = async () => {
            try {
                const [clubsData, postsData] = await Promise.all([
                    getClubs(),
                    getPosts()
                ]);
                setClubs(clubsData);
                // Filter for upcoming events/announcements only
                const upcoming = postsData.filter(p => new Date(p.date) >= new Date());
                setEvents(upcoming);
            } catch (error) {
                console.error("Failed to load AI context:", error);
            }
        };

        if (isOpen && clubs.length === 0) {
            loadContext();
        }
    }, [isOpen]);

    // Stop speaking immediately if speaker is turned off
    useEffect(() => {
        if (!isSpeakerOn) {
            window.speechSynthesis.cancel();
        }
    }, [isSpeakerOn]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // Prepare Context for the System Prompt
            const clubsContext = clubs.map(c => `
            - Club: ${c.name} (ID: ${c.id})
              Description: ${c.description || 'No description'}
              WhatsApp: ${c.whatsappLink || 'N/A'}
              Instagram: ${c.instagramLink || 'N/A'}
            `).join('\n');
            const eventsContext = events.map(e => `
            - Event ID: ${e.id}
              Title: ${e.title}
              Type: ${e.type}
              Club: ${e.clubName}
              Date: ${e.date}
              Time: ${e.time || 'Time not specified'}
              Location: ${e.location || 'Location not specified'}
              RSVPs (Enrolled): ${e.rsvps || 0}
              Registration Start: ${e.registrationStart || 'N/A'} ${e.registrationStartTime || ''}
              Registration Deadline: ${e.registrationEnd || 'N/A'} ${e.registrationEndTime || ''}
              Registration Link: ${e.registrationLink || 'N/A'}
            `).join('\n');

            const systemPrompt = `
        You are the Campus Guide AI Assistant for Walchand College of Engineering.
        
        Strict Persona Rules:
        - Be helpful, enthusiastic, and concise.
        - Answer questions about clubs and events using the Context Data below.
        - You have access to detailed data like Registration Deadlines, RSVP counts, Locations, and specific Times. USE IT.
        - If asked about "remaining slots", explain that you only know the current RSVP count (unless a capacity is explicitly mentioned in the description).
        - If the user explicitly asks to go to a club page, you may answer and then append: [[NAVIGATE_TO_CLUB:club_id]].
        - If the user explicitly asks to go to an event page, you may answer and then append: [[NAVIGATE_TO_EVENT:event_id]].
        - Do NOT invent information. If you don't know, say "I don't have that info right now."
        - CRITICAL: You must ONLY use the IDs listed in the Context Data. Do not guess IDs.
        - CRITICAL: When navigating, the tag must be at the end of the message.

        Context Data:
        [CLUBS]
        ${clubsContext}

        [UPCOMING EVENTS]
        ${eventsContext}
      `;

            console.log("System Prompt:", systemPrompt); // DEBUG

            // Import dynamically to avoid circular dependencies if any (standard practice)
            const { getGeminiChatCompletion } = await import('../lib/geminiService');

            // Construct messages array for Gemini
            // Filter out the initial greeting (id: '1') to avoid "First content should be with role 'user'" error
            const validHistory = messages.filter(m => m.id !== '1');

            const chatMessages = [
                { role: "system", content: systemPrompt },
                ...validHistory.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content
                })),
                { role: "user", content: inputText }
            ];

            // @ts-ignore
            const responseText = await getGeminiChatCompletion(chatMessages);
            console.log("AI Response:", responseText); // DEBUG

            // Check for Navigation Tags
            let finalContent = responseText;

            // Club Navigation
            const navClubMatch = responseText.match(/\[\[NAVIGATE_TO_CLUB:\s*(.+?)\]\]/); // Added \s* for safety
            if (navClubMatch && onNavigateToClub) {
                const clubId = navClubMatch[1];
                finalContent = finalContent.replace(navClubMatch[0], '');
                onNavigateToClub(clubId);
            }

            // Event Navigation
            const navEventMatch = responseText.match(/\[\[NAVIGATE_TO_EVENT:\s*(.+?)\]\]/);
            if (navEventMatch && onNavigateToEvent) {
                const eventId = navEventMatch[1];
                finalContent = finalContent.replace(navEventMatch[0], '');
                onNavigateToEvent(eventId.trim());
            }

            // Fallback if AI navigated but said nothing (should be successful now with new prompt, but safe to keep)
            if (!finalContent.trim() && (navClubMatch || navEventMatch)) {
                finalContent = "Navigating to the requested page...";
            }

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: finalContent.trim(),
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
            speak(finalContent.trim());

        } catch (error: any) {
            console.error("AI Chat Error:", error);

            let errorMessage = `Connection Error: ${error.message}`;

            // specific check for rate limits
            if (error.message?.includes('429')) {
                errorMessage = "I'm currently overloaded with requests (Rate Limit Exceeded). Please try again later.";
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
            }]);
            speak(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = handleStopRecording;

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleStopRecording = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);

        try {
            const { transcribeAudio } = await import('../lib/geminiService');

            const text = await transcribeAudio(audioBlob);
            setInputText(text.trim());
        } catch (error) {
            console.error("Transcription error:", error);
            setInputText("Error transcribing audio.");
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleClearChat = () => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your Campus Guide. Ask me about clubs, upcoming events, or navigate anywhere!",
            timestamp: new Date()
        }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none font-sans" id="tour-ai-assistant">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[450px] sm:w-[500px] h-[700px] flex flex-col overflow-hidden pointer-events-auto transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 rounded-3xl shadow-2xl border border-white/10 ring-1 ring-black/5 bg-slate-900/95 backdrop-blur-xl">

                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-5 flex items-center justify-between shrink-0 shadow-lg z-10">
                        {/* Decorative background glow */}
                        <div className="absolute inset-0 bg-white/5 opacity-50"></div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg shadow-sm">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-white tracking-wide">Campus AI</h3>
                                <p className="text-[11px] text-blue-50 font-medium flex items-center gap-1.5 opacity-90">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                                    </span>
                                    Always Online
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 relative z-10">
                            <button
                                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                className={`text-white/70 hover:text-white p-2 hover:bg-white/15 rounded-full transition-all duration-200 ${isSpeakerOn ? 'text-green-300 bg-white/10' : ''}`}
                                title={isSpeakerOn ? "Mute Jarvis" : "Enable Jarvis Voice"}
                            >
                                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleClearChat}
                                className="text-white/70 hover:text-white p-2 hover:bg-white/15 rounded-full transition-all duration-200"
                                title="Clear Chat"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/70 hover:text-white p-2 hover:bg-white/15 rounded-full transition-all duration-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div className="flex justify-center pb-2">
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold bg-slate-800/50 px-3 py-1 rounded-full">
                                Today
                            </span>
                        </div>

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div
                                    className={`max-w-[85%] px-5 py-3.5 text-[14px] leading-relaxed shadow-md ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                        : 'bg-slate-800/80 hover:bg-slate-800 transition-colors text-slate-100 border border-slate-700/50 rounded-2xl rounded-tl-sm'
                                        }`}
                                >
                                    {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                        part.match(/https?:\/\/[^\s]+/) ? (
                                            <a
                                                key={i}
                                                href={part}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-300 hover:text-blue-100 underline break-all"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {part}
                                            </a>
                                        ) : (
                                            part
                                        )
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start animate-in fade-in duration-300">
                                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-slate-900/95 border-t border-slate-800/50 shrink-0 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-2">
                            {/* Mic Button */}
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`p-3 rounded-xl flex-shrink-0 transition-all duration-200 ${isRecording
                                    ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50'
                                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                                    }`}
                                title="Voice Input"
                            >
                                {isTranscribing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isRecording ? (
                                    <StopCircle className="w-5 h-5" />
                                ) : (
                                    <Mic className="w-5 h-5" />
                                )}
                            </button>

                            {/* Input Field */}
                            <input
                                type="text"
                                placeholder={isTranscribing ? "Listening..." : "Ask about events..."}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isLoading || isRecording || isTranscribing}
                                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 text-sm"
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !inputText.trim()}
                                className={`p-3 rounded-xl flex-shrink-0 transition-all duration-200 ${inputText.trim()
                                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-500'
                                    : 'bg-slate-800 text-slate-600 border border-slate-700/50 cursor-not-allowed'
                                    }`}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-[10px] text-center text-slate-600 flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Powered by Gemini</span>
                        </div>
                    </div>
                </div >
            )
            }

            {/* Floating Toggle Button */}
            {
                !isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="group relative flex items-center gap-3 pl-5 pr-6 py-4 bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 text-white rounded-full shadow-2xl transition-all duration-300 pointer-events-auto hover:-translate-y-1 hover:shadow-blue-900/20 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center gap-3">
                            <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 p-2 rounded-lg shadow-lg group-hover:rotate-12 transition-transform duration-300">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <span className="block font-bold text-sm tracking-wide group-hover:text-blue-200 transition-colors">AI Assistant</span>
                                <span className="block text-[10px] text-slate-400 group-hover:text-slate-300">Chat with Campus Guide</span>
                            </div>
                        </div>
                    </button>
                )
            }
        </div >
    );
}
