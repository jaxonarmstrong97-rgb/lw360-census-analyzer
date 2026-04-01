import { useState, useRef, useEffect, useCallback } from 'react';

const STEP_HINTS = {
  1: [
    "What's the difference between Private Sector and TRS?",
    "Which pay frequency should I pick?",
    "What does company type affect?",
  ],
  2: [
    "What file formats are accepted?",
    "How do I pick the right header row?",
    "My census has extra rows at the top — what do I do?",
  ],
  3: [
    "What does each required field mean?",
    "When should I use 'per-period' for wages?",
    "What are existing pre-tax deductions?",
  ],
  4: [
    "What do the warning flags mean?",
    "What filing status should I use if it's missing?",
    "Why does pay type matter?",
  ],
  5: [
    "What's the difference between combined and individual PDFs?",
    "Explain the eligibility report sections",
    "What does the raw data export include?",
  ],
};

const GREETING_BY_STEP = {
  1: "I can help you set up the company info. Private vs TRS changes how fees and eligibility work — ask me if you're unsure!",
  2: "Upload your census file and I'll help you make sense of it. I can also help if the format looks weird.",
  3: "I see your data — let me help you map the right columns. You can also use the AI Auto-Detect button above for smart mapping.",
  4: "Review the parsed data below. I can explain any warnings or help you decide on filing statuses.",
  5: "You're ready to generate! I can explain what each report contains or answer questions about the results.",
};

export default function Assistant({ step, context }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSeenStep, setHasSeenStep] = useState(new Set());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-greet on step change
  useEffect(() => {
    if (!hasSeenStep.has(step)) {
      setHasSeenStep(prev => new Set([...prev, step]));
      const greeting = GREETING_BY_STEP[step];
      if (greeting) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: greeting, isGreeting: true },
        ]);
      }
    }
  }, [step, hasSeenStep]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history (exclude greetings from API calls)
      const apiMessages = [...messages.filter(m => !m.isGreeting), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            step,
            ...context,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't connect to the AI service. Make sure the ANTHROPIC_API_KEY is configured in your Vercel environment variables.", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, step, context]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hints = STEP_HINTS[step] || [];

  // Floating button + chat panel
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-200 ${
          isOpen ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#1A395C] hover:bg-[#142d49]'
        }`}
        title={isOpen ? 'Close assistant' : 'Open LW360 assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Notification dot when closed and there are unread greetings */}
      {!isOpen && messages.length > 0 && (
        <div className="fixed bottom-[4.25rem] right-6 z-50 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#1A395C] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              AI
            </div>
            <div>
              <div className="font-semibold text-sm">LW360 Assistant</div>
              <div className="text-xs opacity-70">Step {step} of 5 — {['Company Setup', 'Census Upload', 'Column Mapping', 'Data Review', 'Generate Reports'][step - 1]}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[45vh]">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                Ask me anything about the SIMRP program or this tool.
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1A395C] text-white rounded-br-sm'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick hints */}
          {hints.length > 0 && messages.length < 3 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {hints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(hint)}
                  disabled={loading}
                  className="text-xs bg-blue-50 text-[#1A395C] px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-100 disabled:opacity-50"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 px-3 py-2 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the SIMRP program..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A395C] focus:border-transparent outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="px-3 py-2 bg-[#1A395C] text-white rounded-xl text-sm font-medium hover:bg-[#142d49] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
