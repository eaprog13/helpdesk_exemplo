// Tipos mínimos para a Web Speech API (SpeechRecognition), usada em
// components/chat/ChatInput.tsx para ditado por voz. Não faz parte da
// lib.dom.d.ts padrão do TypeScript — só se declara aqui o suficiente para
// o que é realmente usado. É a API nativa do próprio browser: reconhece a
// fala localmente/no fornecedor do browser, sem passar por nenhum serviço
// nosso — por isso não tem custo associado, ao contrário de uma
// transcrição feita no servidor (ex.: Whisper).

interface SpeechRecognitionResultItem {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}
