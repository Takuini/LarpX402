import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Search, X, ArrowLeft, Biohazard, Bug, Shield, Skull, AlertTriangle, Filter, Copy, Check, Share2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const THREAT_TYPES = ['ALL', 'TROJAN', 'RANSOMWARE', 'SPYWARE', 'PHISHING', 'WORM', 'ROOTKIT', 'BOTNET', 'CRYPTOJACKER', 'ADWARE', 'MALWARE'] as const;
const PAGE_SIZE = 20;

export default function Gallery() {
  const [tokens, setTokens] = useState<LaunchedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedToken, setSelectedToken] = useState<LaunchedToken | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchTokens = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    const { data, error, count } = await supabase
      .from('launched_tokens')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching tokens:', error);
    } else {
      if (append) {
        setTokens(prev => [...prev, ...(data || [])]);
      } else {
        setTokens(data || []);
      }
      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchTokens();

    const channel = supabase
      .channel('gallery-tokens')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'launched_tokens',
        },
        (payload) => {
          setTokens(prev => [payload.new as LaunchedToken, ...prev]);
          setTotalCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTokens]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchTokens(tokens.length, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loadingMore, loading, tokens.length, fetchTokens]);

  const getThreatType = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('trojan')) return 'TROJAN';
    if (lowerName.includes('ransom')) return 'RANSOMWARE';
    if (lowerName.includes('spyware') || lowerName.includes('keylogger')) return 'SPYWARE';
    if (lowerName.includes('phish')) return 'PHISHING';
    if (lowerName.includes('worm')) return 'WORM';
    if (lowerName.includes('rootkit')) return 'ROOTKIT';
    if (lowerName.includes('botnet')) return 'BOTNET';
    if (lowerName.includes('crypto') || lowerName.includes('miner')) return 'CRYPTOJACKER';
    if (lowerName.includes('adware')) return 'ADWARE';
    return 'MALWARE';
  };

  const filteredTokens = useMemo(() => {
    let result = tokens;
    
    if (selectedType !== 'ALL') {
      result = result.filter(token => getThreatType(token.name) === selectedType);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(token => 
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.description?.toLowerCase().includes(query) ||
        token.creator_address.toLowerCase().includes(query) ||
        token.mint_address.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [tokens, searchQuery, selectedType]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getThreatColor = (name: string): string => {
    const type = getThreatType(name);
    switch (type) {
      case 'TROJAN': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'RANSOMWARE': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'SPYWARE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'PHISHING': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'WORM': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'ROOTKIT': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'BOTNET': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'CRYPTOJACKER': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'ADWARE': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-destructive/20 text-destructive border-destructive/30';
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shareOnTwitter = (token: LaunchedToken) => {
    const text = `Check out $${token.symbol} - ${token.name} on pump.fun! 🦠\n\nCA: ${token.mint_address}\n\nhttps://pump.fun/${token.mint_address}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Biohazard className="w-5 h-5 text-destructive" />
              <span className="text-lg font-semibold">Virus Gallery</span>
            </div>
          </div>
          <Badge variant="outline" className="gap-2">
            <Bug className="w-3 h-3" />
            {totalCount} Deployed
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
            <Skull className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Captured Threats</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Deployed Virus Tokens</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse all malware threats that have been captured and deployed as tokens on the blockchain
          </p>
        </div>

        {/* Search & Filter */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-card border-border"
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
          
          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {THREAT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                  selectedType === type
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-secondary/50 text-muted-foreground border-border hover:border-accent/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-border rounded-lg bg-card p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Total Deployed</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{tokens.filter(t => getThreatType(t.name) === 'TROJAN').length}</p>
            <p className="text-xs text-muted-foreground">Trojans</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{tokens.filter(t => getThreatType(t.name) === 'RANSOMWARE').length}</p>
            <p className="text-xs text-muted-foreground">Ransomware</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{tokens.filter(t => ['SPYWARE', 'PHISHING'].includes(getThreatType(t.name))).length}</p>
            <p className="text-xs text-muted-foreground">Spyware/Phishing</p>
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="loader w-8 h-8" />
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No Matches Found' : 'No Virus Tokens Yet'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Scan files and URLs to capture threats and deploy them as tokens!'
              }
            </p>
            {!searchQuery && (
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Start Scanning
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTokens.map((token) => (
                <div
                  key={token.id}
                  className="border border-border rounded-lg bg-card overflow-hidden hover:border-accent/50 transition-all duration-300 group"
                >
                  {/* Token Image */}
                  <div 
                    className="aspect-square bg-secondary/50 relative overflow-hidden cursor-pointer"
                    onClick={() => setSelectedToken(token)}
                  >
                    {token.image_url ? (
                      <img
                        src={token.image_url}
                        alt={token.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Skull className="w-20 h-20 text-muted-foreground/30" />
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 text-[10px] ${getThreatColor(token.name)}`}>
                      {getThreatType(token.name)}
                    </Badge>
                  </div>

                  {/* Token Info */}
                  <div className="p-4">
                    <div 
                      className="flex items-start justify-between gap-2 mb-2 cursor-pointer"
                      onClick={() => setSelectedToken(token)}
                    >
                      <h3 className="font-semibold text-sm truncate flex-1">{token.name}</h3>
                      <span className="text-xs text-accent font-mono">${token.symbol}</span>
                    </div>

                    {token.description && (
                      <p 
                        className="text-xs text-muted-foreground line-clamp-2 mb-3 cursor-pointer"
                        onClick={() => setSelectedToken(token)}
                      >
                        {token.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="font-mono">{formatAddress(token.mint_address)}</span>
                      <span>{formatTime(token.created_at)}</span>
                    </div>

                    {/* Copy CA Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(token.mint_address, `card-${token.id}`);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-secondary/50 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-all border border-border"
                    >
                      {copiedField === `card-${token.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy CA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More / Infinite Scroll Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && tokens.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground py-6">
                All {totalCount} tokens loaded
              </p>
            )}
          </>
        )}

        {/* Token Detail Modal */}
        <Dialog open={!!selectedToken} onOpenChange={() => setSelectedToken(null)}>
          <DialogContent className="max-w-lg bg-card border-border">
            {selectedToken && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Skull className="w-5 h-5 text-destructive" />
                    {selectedToken.name}
                    <Badge className={`ml-2 text-[10px] ${getThreatColor(selectedToken.name)}`}>
                      {getThreatType(selectedToken.name)}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Image */}
                  {selectedToken.image_url && (
                    <div className="aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden bg-secondary/50">
                      <img
                        src={selectedToken.image_url}
                        alt={selectedToken.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Description */}
                  {selectedToken.description && (
                    <p className="text-sm text-muted-foreground">{selectedToken.description}</p>
                  )}

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
                      <span className="text-muted-foreground">Symbol</span>
                      <span className="font-mono text-accent">${selectedToken.symbol}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
                      <span className="text-muted-foreground">Contract Address</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{formatAddress(selectedToken.mint_address)}</span>
                        <button
                          onClick={() => copyToClipboard(selectedToken.mint_address, 'mint')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedField === 'mint' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
                      <span className="text-muted-foreground">Creator</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{formatAddress(selectedToken.creator_address)}</span>
                        <button
                          onClick={() => copyToClipboard(selectedToken.creator_address, 'creator')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedField === 'creator' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
                      <span className="text-muted-foreground">TX Signature</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{formatAddress(selectedToken.tx_signature)}</span>
                        <button
                          onClick={() => copyToClipboard(selectedToken.tx_signature, 'tx')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedField === 'tx' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
                      <span className="text-muted-foreground">Deployed</span>
                      <span className="text-xs">{new Date(selectedToken.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={`https://pump.fun/${selectedToken.mint_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full gap-2">
                        View on Pump.fun
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    
                    <a
                      href={`https://solscan.io/tx/${selectedToken.tx_signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full gap-2">
                        View Transaction
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>

                    <Button 
                      onClick={() => shareOnTwitter(selectedToken)}
                      className="w-full gap-2 bg-[#1DA1F2] hover:bg-[#1a8cd8]"
                    >
                      <Share2 className="w-4 h-4" />
                      Share on X/Twitter
                    </Button>
                  </div>

                  {/* Social Links */}
                  {(selectedToken.twitter || selectedToken.telegram || selectedToken.website) && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      {selectedToken.twitter && (
                        <a
                          href={selectedToken.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Twitter
                        </a>
                      )}
                      {selectedToken.telegram && (
                        <a
                          href={selectedToken.telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Telegram
                        </a>
                      )}
                      {selectedToken.website && (
                        <a
                          href={selectedToken.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            LarpX402 · Virus Token Gallery
          </p>
        </div>
      </footer>
    </div>
  );
}
