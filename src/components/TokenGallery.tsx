import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Rocket, Users, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    // Fetch initial tokens
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

    // Subscribe to realtime updates
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
          console.log('New token launched:', payload.new);
          setTokens(prev => [payload.new as LaunchedToken, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter tokens based on search query
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
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="border border-primary/30 bg-card/20 backdrop-blur-sm p-6 md:p-8 relative">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-primary/30 bg-card/20 backdrop-blur-sm p-6 md:p-8 relative">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50" />

      <div className="text-center mb-6">
        <Users className="w-10 h-10 mx-auto mb-3 text-primary" />
        <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-2 tracking-widest">
          RECENT LAUNCHES
        </h2>
        <p className="text-muted-foreground text-sm tracking-wider">
          Tokens deployed through LarpX402
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, symbol, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 bg-secondary/20 border-primary/20"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Found {filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </p>
      )}

      {tokens.length === 0 ? (
        <div className="text-center py-12 border border-primary/10 bg-secondary/10">
          <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No tokens launched yet</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Be the first to launch!</p>
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-12 border border-primary/10 bg-secondary/10">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No tokens match your search</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try a different query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTokens.map((token) => (
            <div
              key={token.id}
              className="border border-primary/20 bg-secondary/20 p-4 hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-start gap-3 mb-3">
                {token.image_url ? (
                  <img
                    src={token.image_url}
                    alt={token.name}
                    className="w-12 h-12 rounded object-cover border border-primary/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded border border-primary/20 bg-secondary/50 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-primary/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-sm font-bold text-primary truncate">
                    {token.name}
                  </h3>
                  <p className="text-xs text-accent font-mono">${token.symbol}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                  {formatTime(token.created_at)}
                </span>
              </div>

              {token.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {token.description}
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mb-3">
                <span>Creator: {formatAddress(token.creator_address)}</span>
                <span>CA: {formatAddress(token.mint_address)}</span>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://pump.fun/${token.mint_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="terminal" size="sm" className="w-full text-[10px]">
                    View on PumpFun
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>

              {/* Social Links */}
              {(token.twitter || token.telegram || token.website) && (
                <div className="flex gap-2 mt-2 justify-center">
                  {token.twitter && (
                    <a
                      href={token.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary/40 hover:text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {token.telegram && (
                    <a
                      href={token.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary/40 hover:text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                    </a>
                  )}
                  {token.website && (
                    <a
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary/40 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
