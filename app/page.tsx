"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent, useMetaMask } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";

/**
 * Home page for the AgentKit Quickstart
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();
  const { 
    account, 
    isConnected, 
    isConnecting,
    error: metamaskError,
    connectMetaMask,
    isMetaMaskAvailable
  } = useMetaMask();

  // Ref for the messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  return (
    <div className="flex flex-col w-full max-w-5xl shadow-lg rounded-lg overflow-hidden">
      {/* MetaMask Connection Panel */}
      <div className="bg-gray-200 dark:bg-gray-800 p-3 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {isMetaMaskAvailable ? (
            isConnected ? (
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Connected to Flow Testnet: {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
              </div>
            ) : (
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                MetaMask not connected
              </div>
            )
          ) : (
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              MetaMask not detected
            </div>
          )}
        </div>
        
        {isMetaMaskAvailable && !isConnected && (
          <button 
            onClick={connectMetaMask}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>
        )}
      </div>
      
      {metamaskError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {metamaskError}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-grow p-4 bg-white dark:bg-gray-900 overflow-y-auto max-h-[60vh]">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <h2 className="text-2xl font-bold mb-2">Welcome to AgentKit</h2>
            <p className="mb-4 max-w-lg mx-auto">
              I can help you interact with Flow Testnet using MetaMask. Ask me anything about FLOW tokens, 
              balances, or transactions!
            </p>
            <p className="text-sm">Try asking: "What is my wallet address?" or "How do I check my balance?"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${
                    msg.sender === "user"
                      ? "bg-blue-100 dark:bg-blue-800 text-gray-900 dark:text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  }`}
                >
                  <ReactMarkdown 
                    components={{
                      p: ({node, ...props}) => <p className="prose dark:prose-invert" {...props} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex">
          <input
            type="text"
            placeholder="Ask about Flow blockchain, FLOW tokens, or transactions..."
            className="flex-grow p-2 rounded-l border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
          />
          <button
            onClick={onSendMessage}
            disabled={isThinking || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r disabled:opacity-50 transition-colors"
          >
            {isThinking ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
