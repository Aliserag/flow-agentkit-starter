import { useState, useEffect } from "react";
import { AgentRequest, AgentResponse } from "../types/api";

/**
 * Sends a user message to the AgentKit backend API and retrieves the agent's response.
 *
 * @async
 * @function callAgentAPI
 * @param {string} userMessage - The message sent by the user.
 * @returns {Promise<string | null>} The agent's response message or `null` if an error occurs.
 *
 * @throws {Error} Logs an error if the request fails.
 */
async function messageAgent(userMessage: string): Promise<string | null> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage } as AgentRequest),
    });

    const data = (await response.json()) as AgentResponse;
    return data.response ?? data.error ?? null;
  } catch (error) {
    console.error("Error communicating with agent:", error);
    return null;
  }
}

// Check if MetaMask is available in browser
const isMetaMaskAvailable = () => {
  return typeof window !== 'undefined' && window.ethereum;
};

/**
 * Hook to detect and connect to MetaMask
 * 
 * @returns Object containing MetaMask connection state and functions
 */
export function useMetaMask() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if MetaMask is already connected on mount
    const checkConnection = async () => {
      if (!isMetaMaskAvailable()) {
        setError("MetaMask is not installed");
        return;
      }
      
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error checking MetaMask connection:", error);
        setError("Failed to check MetaMask connection");
      }
    };
    
    checkConnection();
    
    // Listen for account changes
    if (isMetaMaskAvailable()) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setAccount(null);
          setIsConnected(false);
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      });
    }
    
    return () => {
      // Clean up listeners
      if (isMetaMaskAvailable()) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);
  
  // Function to connect to MetaMask
  const connectMetaMask = async () => {
    if (!isMetaMaskAvailable()) {
      setError("MetaMask is not installed");
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      // Add Flow testnet to MetaMask if not already added
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x221', // 545 in hex
            chainName: 'Flow Testnet',
            nativeCurrency: {
              name: 'FLOW',
              symbol: 'FLOW',
              decimals: 18,
            },
            rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
            blockExplorerUrls: ['https://testnet.flowscan.org'],
          }],
        });
      } catch (error) {
        console.warn("Could not add Flow testnet to MetaMask, it might already be added", error);
      }
      
      // Switch to Flow testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x221' }], // 545 in hex
        });
      } catch (switchError: any) {
        console.error("Error switching to Flow testnet:", switchError);
        setError("Failed to switch to Flow testnet");
      }
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      setError("Failed to connect to MetaMask");
    } finally {
      setIsConnecting(false);
    }
  };
  
  return {
    account,
    isConnected,
    isConnecting,
    error,
    connectMetaMask,
    isMetaMaskAvailable: isMetaMaskAvailable(),
  };
}

/**
 *
 * This hook manages interactions with the AI agent by making REST calls to the backend.
 * It also stores the local conversation state, tracking messages sent by the user and
 * responses from the agent.
 *
 * #### How It Works
 * - `sendMessage(input)` sends a message to `/api/agent` and updates state.
 * - `messages` stores the chat history.
 * - `isThinking` tracks whether the agent is processing a response.
 *
 * #### See Also
 * - The API logic in `/api/agent.ts`
 *
 * @returns {object} An object containing:
 * - `messages`: The conversation history.
 * - `sendMessage`: A function to send a new message.
 * - `isThinking`: Boolean indicating if the agent is processing a response.
 */
export function useAgent() {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "agent" }[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  /**
   * Sends a user message, updates local state, and retrieves the agent's response.
   *
   * @param {string} input - The message from the user.
   */
  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { text: input, sender: "user" }]);
    setIsThinking(true);

    const responseMessage = await messageAgent(input);

    if (responseMessage) {
      setMessages(prev => [...prev, { text: responseMessage, sender: "agent" }]);
    }

    setIsThinking(false);
  };

  return { messages, sendMessage, isThinking };
}
