import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Rocket, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LaunchedToken {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  mint_address: string;
  creator_address: string;
  tx_signature: string;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  created_at: string;
}

export default function TokenGallery() {
  const [tokens, setTokens] = useState<LaunchedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTokens = async () => {
      const { data, error } = await supabase
        .from('launched_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching tokens:', error);
      } else {
        setTokens(data || []);
      }
      setLoading(false);
    };

    fetchTokens();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'launched_tokens',
        },
        (payload) => {
          setTokens(prev => [payload.new as LaunchedToken, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens;
    
    const query = searchQuery.toLowerCase().trim();
    return tokens.filter(token => 
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query) ||
      token.creator_address.toLowerCase().includes(query) ||
      token.mint_address.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="border border-border rounded-lg bg-card p-5">
        <div className="flex items-center justify-center py-12">
          <div className="loader w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Launches</h2>
          <p className="text-sm text-muted-foreground">{tokens.length} total</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 bg-secondary border-border text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Token List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <Rocket className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tokens yet</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No matches</p>
          </div>
        ) : (
          filteredTokens.map((token) => (
            <div
              key={token.id}
              className="border border-border rounded-md p-3 card-hover"
            >
              <div className="flex items-start gap-3">
                {token.image_url ? (
                  <img
                    src={token.image_url}
                    alt={token.name}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-sm truncate">{token.name}</h3>
                    <span className="text-xs text-accent font-medium">${token.symbol}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatAddress(token.creator_address)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(token.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  CA: {formatAddress(token.mint_address)}
                </span>
                <a
                  href={`https://pump.fun/${token.mint_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
