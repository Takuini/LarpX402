import { useNetwork, SolanaNetwork } from '@/contexts/WalletContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, TestTube } from 'lucide-react';

export function NetworkSelector() {
  const { network, setNetwork } = useNetwork();

  return (
    <Select value={network} onValueChange={(v) => setNetwork(v as SolanaNetwork)}>
      <SelectTrigger className="w-[140px] h-9 bg-card border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="mainnet-beta">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span>Mainnet</span>
          </div>
        </SelectItem>
        <SelectItem value="devnet">
          <div className="flex items-center gap-2">
            <TestTube className="w-3.5 h-3.5 text-yellow-500" />
            <span>Devnet</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
