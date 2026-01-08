import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import TokenLaunchpad from '@/components/TokenLaunchpad';
import TokenGallery from '@/components/TokenGallery';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { NetworkSelector } from '@/components/NetworkSelector';

export default function Launchpad() {
  const { connected, publicKey } = useWallet();

  const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.jpg" 
              alt="LarpX402" 
              className="w-10 h-10 rounded-sm object-cover object-center"
            />
            <span className="text-lg font-semibold tracking-tight">LarpX402</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                Scanner
              </Button>
            </Link>
            <NetworkSelector />
            {connected && publicKey && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {formatAddress(publicKey.toBase58())}
              </span>
            )}
            <WalletMultiButton className="!bg-card !border !border-border !rounded-md !h-9 !px-4 !text-sm !font-medium hover:!bg-secondary transition-colors" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Analytics */}
          <div className="lg:col-span-3 space-y-4">
            <AnalyticsDashboard />
          </div>

          {/* Center Column - Launchpad */}
          <div className="lg:col-span-5">
            <TokenLaunchpad />
          </div>

          {/* Right Column - Recent Launches */}
          <div className="lg:col-span-4">
            <TokenGallery />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            LarpX402 Token Launchpad
          </p>
          <a 
            href="https://github.com/Takuini" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            @Takuini
          </a>
        </div>
      </footer>
    </div>
  );
}
