import { useNetwork } from '@/contexts/WalletContext';
import { Globe, TestTube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function NetworkBadge() {
  const { network } = useNetwork();

  const isMainnet = network === 'mainnet-beta';

  return (
    <Badge 
      variant="outline" 
      className={`gap-1.5 h-7 px-2.5 font-medium ${
        isMainnet 
          ? 'border-accent/50 text-accent bg-accent/10' 
          : 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
      }`}
    >
      {isMainnet ? (
        <Globe className="w-3 h-3" />
      ) : (
        <TestTube className="w-3 h-3" />
      )}
      <span className="text-xs">{isMainnet ? 'Mainnet' : 'Devnet'}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-accent' : 'bg-yellow-500'} animate-pulse`} />
    </Badge>
  );
}
