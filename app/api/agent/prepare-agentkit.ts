import {
  ActionProvider,
  AgentKit,
  cdpApiActionProvider,
  erc20ActionProvider,
  pythActionProvider,
  ViemWalletProvider,
  walletActionProvider,
  WalletProvider,
  wethActionProvider,
} from "@coinbase/agentkit";
import fs from "fs";
import { createWalletClient, http, custom } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Declare ethereum property on window object for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * AgentKit Integration Route
 *
 * This file is your gateway to integrating AgentKit with your product.
 * It defines the core capabilities of your agent through WalletProvider
 * and ActionProvider configuration.
 *
 * Key Components:
 * 1. WalletProvider Setup:
 *    - Configures the blockchain wallet integration with MetaMask for Flow testnet
 *    - Learn more: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#evm-wallet-providers
 *
 * 2. ActionProviders Setup:
 *    - Defines the specific actions your agent can perform
 *    - Choose from built-in providers or create custom ones:
 *      - Built-in: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#action-providers
 *      - Custom: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#creating-an-action-provider
 *
 * # Next Steps:
 * - Explore the AgentKit README: https://github.com/coinbase/agentkit
 * - Experiment with different LLM configurations
 * - Fine-tune agent parameters for your use case
 *
 * ## Want to contribute?
 * Join us in shaping AgentKit! Check out the contribution guide:
 * - https://github.com/coinbase/agentkit/blob/main/CONTRIBUTING.md
 * - https://discord.gg/CDP
 */

// Configure a file to persist a user's private key if none provided
const WALLET_DATA_FILE = "wallet_data.txt";

// Define the Flow blockchain testnet configuration
const flowTestnet = {
  id: 545, // Flow testnet chain ID
  name: 'Flow Testnet',
  network: 'flow-testnet',
  nativeCurrency: {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flowscan',
      url: 'https://testnet.flowscan.org',
    },
  },
  testnet: true,
};

// Custom Flow blockchain action provider
const createFlowActionProvider = (): ActionProvider => {
  return {
    name: 'flow',
    actions: {
      getFlowBalance: {
        description: 'Get the FLOW token balance of an account',
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The Flow account address',
            },
          },
          required: ['address'],
        },
        execute: async ({ address }: { address: string }) => {
          try {
            // This would use Viem to query the Flow EVM balance
            const address0x = address.startsWith('0x') ? address : `0x${address}`;
            // Return placeholder for now
            return { balance: '10.0' };
          } catch (error) {
            console.error("Error getting Flow balance:", error);
            throw error;
          }
        },
      },
    },
  };
};

/**
 * Prepares the AgentKit and WalletProvider.
 *
 * @function prepareAgentkitAndWalletProvider
 * @returns {Promise<{ agentkit: AgentKit, walletProvider: WalletProvider }>} The initialized AI agent.
 *
 * @description Handles agent setup with MetaMask for Flow blockchain testnet
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function prepareAgentkitAndWalletProvider(): Promise<{
  agentkit: AgentKit;
  walletProvider: WalletProvider;
}> {
  try {
    let walletProvider: WalletProvider;
    
    // Check if we're in a browser environment with MetaMask
    const isClient = typeof window !== 'undefined' && window.ethereum;
    
    if (isClient) {
      // For browser environments with MetaMask
      const client = createWalletClient({
        chain: flowTestnet,
        transport: custom(window.ethereum),
      });
      
      walletProvider = new ViemWalletProvider(client);
      console.log('Using MetaMask wallet provider with Flow testnet');
    } else {
      // For server-side or non-MetaMask environments (fallback)
      let privateKey = process.env.PRIVATE_KEY as `0x${string}`;
      if (!privateKey) {
        if (fs.existsSync(WALLET_DATA_FILE)) {
          privateKey = JSON.parse(fs.readFileSync(WALLET_DATA_FILE, "utf8")).privateKey;
          console.info("Found private key in wallet_data.txt");
        } else {
          privateKey = generatePrivateKey();
          fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify({ privateKey }));
          console.log("Created new private key and saved to wallet_data.txt");
          console.log(
            "We recommend you save this private key to your .env file and delete wallet_data.txt afterwards.",
          );
        }
      }
      const account = privateKeyToAccount(privateKey);

      const client = createWalletClient({
        account,
        chain: flowTestnet,
        transport: http(),
      });
      walletProvider = new ViemWalletProvider(client);
      console.log('Using local wallet provider with Flow testnet');
    }

    // Initialize AgentKit with appropriate action providers for Flow testnet
    const actionProviders: ActionProvider[] = [
      walletActionProvider(),
      createFlowActionProvider(),
      // Flow testnet also supports EVM compatibility, so these providers can work
      erc20ActionProvider(),
    ];
    
    // Add CDP API if credentials are available
    const canUseCdpApi = process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY;
    if (canUseCdpApi) {
      actionProviders.push(
        cdpApiActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
        }),
      );
    }
    
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders,
    });

    return { agentkit, walletProvider };
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
