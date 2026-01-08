import { FC, ReactNode, useMemo, useState, useEffect, createContext, useContext } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

import '@solana/wallet-adapter-react-ui/styles.css';

export type SolanaNetwork = 'mainnet-beta' | 'devnet';

interface NetworkContextType {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
  customRpcUrl: string | null;
}

const NetworkContext = createContext<NetworkContextType>({
  network: 'mainnet-beta',
  setNetwork: () => {},
  customRpcUrl: null,
});

export const useNetwork = () => useContext(NetworkContext);

interface WalletContextProviderProps {
  children: ReactNode;
}

const NETWORK_STORAGE_KEY = 'solana-network';

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const [network, setNetworkState] = useState<SolanaNetwork>(() => {
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
    return (stored === 'devnet' ? 'devnet' : 'mainnet-beta') as SolanaNetwork;
  });
  const [customRpcUrl, setCustomRpcUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setNetwork = (newNetwork: SolanaNetwork) => {
    setNetworkState(newNetwork);
    localStorage.setItem(NETWORK_STORAGE_KEY, newNetwork);
    // Reload to apply new network connection
    window.location.reload();
  };

  useEffect(() => {
    const fetchRpcUrl = async () => {
      // Only fetch custom RPC for mainnet
      if (network === 'mainnet-beta') {
        try {
          const { data, error } = await supabase.functions.invoke('get-rpc-url');
          if (!error && data?.rpcUrl) {
            setCustomRpcUrl(data.rpcUrl);
          }
        } catch (err) {
          console.log('Using default RPC endpoint');
        }
      }
      setIsLoading(false);
    };
    fetchRpcUrl();
  }, [network]);

  const endpoint = useMemo(() => {
    if (network === 'devnet') {
      return clusterApiUrl('devnet');
    }
    if (customRpcUrl) {
      return customRpcUrl;
    }
    return clusterApiUrl('mainnet-beta');
  }, [network, customRpcUrl]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <NetworkContext.Provider value={{ network, setNetwork, customRpcUrl }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
};
