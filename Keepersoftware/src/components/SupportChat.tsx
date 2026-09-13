import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatMessage } from '../types';
import { MessageSquare, Send, AlertCircle, Sparkles, User, ShieldAlert } from 'lucide-react';

interface SupportChatProps {
  userProfile: UserProfile;
}

export default function SupportChat({ userProfile }: SupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form fields
  const [topic, setTopic] = useState('');
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages in real-time
  useEffect(() => {
    if (!userProfile?.uid) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'chat_messages'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          userId: data.userId || '',
          userName: data.userName || '',
          topic: data.topic || '',
          message: data.message || '',
          timestamp: data.timestamp || 0,
          senderRole: data.senderRole || 'User'
        });
      });
      
      // Sort messages by timestamp in ascending order
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(msgs);
      setLoading(false);
      
      // Scroll to bottom after state updates
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.error('Error fetching chat messages:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!topic.trim()) {
      setError('Bitte gib ein zentrales Thema an.');
      return;
    }
    if (!messageText.trim()) {
      setError('Bitte gib eine Nachricht ein.');
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'chat_messages'), {
        userId: userProfile.uid,
        userName: userProfile.name || userProfile.username || 'Spieler',
        topic: topic.trim(),
        message: messageText.trim(),
        timestamp: Date.now(),
        senderRole: 'User'
      });

      setMessageText('');
      setSuccess('Nachricht erfolgreich gesendet!');
      
      // Keep topic prefilled or let user change it? Let's keep it so they can easily continue, but they can edit it if they change topic.
      // Clear success message after a few seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error sending support message:', err);
      setError('Fehler beim Senden der Nachricht. Bitte versuche es erneut.');
    } finally {
      setSending(false);
    }
  };

  // If user role is 'kraftsport', block access completely as requested
  if (userProfile.role === 'kraftsport') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center" id="support-chat-forbidden">
        <div className="bg-slate-900 border border-red-900/30 p-8 rounded-2xl max-w-lg mx-auto space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
          <h2 className="text-lg font-bold text-white uppercase font-mono">Zugriff verweigert</h2>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Als Kraftsport-Mitglied hast du keinen Zugriff auf die Coaching-Support-Chatfunktion. 
            Bitte wende dich direkt an deinen zuständigen Trainer oder Betreuer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 font-sans space-y-6" id="support-chat-container">
      {/* Header section with instructions */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white uppercase font-mono flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-neon" />
            <span>Support & Trainer-Chat</span>
          </h2>
          <p className="text-xs text-slate-400">
            Hier kannst du direkt Fragen, Feedback oder Anliegen an deinen Coach senden. Alle Nachrichten werden persistent gespeichert.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
          <Sparkles className="w-3.5 h-3.5 text-brand-neon animate-pulse" />
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Direktverbindung Aktiv</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Live Chat History */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[550px] overflow-hidden">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 shrink-0 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 font-mono uppercase">Chatverlauf</span>
            <span className="text-[10px] font-mono text-brand-neon bg-brand-neon/10 px-2 py-0.5 rounded">
              {messages.length} Nachricht{messages.length === 1 ? '' : 'en'}
            </span>
          </div>

          {/* Chat Messages Scrolling Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-900/40">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                Lade Chatverlauf...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="text-xs text-slate-400 font-medium">Noch keine Nachrichten vorhanden.</p>
                <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                  Schreibe deine erste Nachricht im rechten Formular, um einen Chat mit deinem Trainer zu starten!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdminMessage = msg.senderRole === 'Admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isAdminMessage ? 'mr-auto items-start' : 'ml-auto items-end'
                    }`}
                  >
                    {/* Header: Sender info */}
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono font-bold text-zinc-500">
                      {isAdminMessage ? (
                        <>
                          <span className="text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded text-[9px] uppercase font-bold mr-0.5">Coach</span>
                          <span>{msg.userName}</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-brand-neon" />
                          <span>{msg.userName}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Chat Bubble Body */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        isAdminMessage
                          ? 'bg-slate-950 border border-slate-850 text-white rounded-tl-none'
                          : 'bg-brand-neon/10 border border-brand-neon/20 text-brand-neon-hover rounded-tr-none'
                      }`}
                    >
                      {/* Topic Tag */}
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <span className="text-zinc-500 font-bold">Thema:</span>
                        <span className={isAdminMessage ? 'text-zinc-300' : 'text-brand-neon font-black'}>
                          {msg.topic}
                        </span>
                      </div>
                      
                      {/* Message Content */}
                      <p className="whitespace-pre-line text-white font-sans">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Right Side: Message Submission Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase font-mono">Neue Nachricht senden</h3>
            </div>

            {/* Field 1: Name (Read-Only) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Absender (Name)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userProfile.name || userProfile.username || ''}
                  disabled
                  readOnly
                  className="w-full bg-slate-950 border border-slate-800 text-slate-500 font-bold rounded-xl px-3 py-2.5 text-xs select-none opacity-70 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-zinc-600 font-mono">Automatischer Systemabgleich mit deinem Profil.</p>
            </div>

            {/* Field 2: Zentrales Thema */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Zentrales Thema <span className="text-brand-neon">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="z.B. Trainingsplan, Verletzungsupdate, Video-Frage..."
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-neon/60 text-white rounded-xl px-3 py-2.5 text-xs outline-none transition-all placeholder:text-zinc-600"
              />
            </div>

            {/* Field 3: Nachricht */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Deine Nachricht <span className="text-brand-neon">*</span>
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Schreibe hier dein Anliegen ausführlich auf..."
                rows={6}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-neon/60 text-white rounded-xl px-3 py-2.5 text-xs outline-none transition-all resize-none placeholder:text-zinc-600 leading-relaxed font-sans"
              />
            </div>

            {/* Error and Success Indicators */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-neon hover:bg-brand-neon-hover text-brand-bg font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-neon/10 disabled:opacity-50 cursor-pointer"
            >
              {sending ? 'Wird gesendet...' : 'Nachricht Senden'}
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Explicit Notice: No File Uploads */}
          <div className="mt-5 pt-3 border-t border-slate-850 text-center">
            <span className="inline-block text-[10px] font-mono text-zinc-500 uppercase tracking-wide">
              🚫 Keine Anhänge / Datei-Uploads unterstützt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
