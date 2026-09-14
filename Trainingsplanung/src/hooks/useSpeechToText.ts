import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (chunk: string, fullTranscript?: string) => void;
  onError?: (error: any) => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const {
    lang = 'de-DE',
    continuous = false,
    interimResults = true,
    onResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, [lang, continuous, interimResults]);

  const startListening = useCallback(() => {
    setError(null);
    if (!recognitionRef.current) {
      setError('Spracherkennung wird von diesem Browser nicht unterstützt.');
      return;
    }

    try {
      const recognition = recognitionRef.current;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscriptChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptChunk += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(currentInterim);
        if (finalTranscriptChunk) {
          const chunk = finalTranscriptChunk.trim();
          setTranscript(prev => {
            const next = prev ? `${prev} ${chunk}` : chunk;
            if (onResult) onResult(chunk, next);
            return next;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(event.error);
          if (onError) onError(event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
    }
  }, [onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping recognition:', err);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript
  };
}
