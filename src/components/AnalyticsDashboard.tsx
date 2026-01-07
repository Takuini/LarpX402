import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Coins, Rocket, TrendingUp, Trophy } from 'lucide-react';

// Platform fee in SOL (should match TokenLaunchpad)
const PLATFORM_FEE_SOL = 0.01;

interface TokenStats {
  totalTokens: number;
  totalFees: number;
  topCreators: { address: string; count: number }[];
  recentLaunches: number; // last 24h
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<TokenStats>({
    totalTokens: 0,
    totalFees: 0,
    topCreators: [],
    recentLaunches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total token count
        const { count: totalCount, error: countError } = await supabase
          .from('launched_tokens')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Get all tokens for analysis
        const { data: tokens, error: tokensError } = await supabase
          .from('launched_tokens')
          .select('creator_address, created_at')
          .order('created_at', { ascending: false });

        if (tokensError) throw tokensError;

        // Calculate top creators
        const creatorCounts: Record<string, number> = {};
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        let recentCount = 0;

        tokens?.forEach(token => {
          creatorCounts[token.creator_address] = (creatorCounts[token.creator_address] || 0) + 1;
          if (new Date(token.created_at) > oneDayAgo) {
            recentCount++;
          }
        });

        const topCreators = Object.entries(creatorCounts)
          .map(([address, count]) => ({ address, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalTokens: totalCount || 0,
          totalFees: (totalCount || 0) * PLATFORM_FEE_SOL,
          topCreators,
          recentLaunches: recentCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to realtime updates for live stats
    const channel = supabase
      .channel('stats-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'launched_tokens',
        },
        () => {
          // Refetch stats on new token
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="border border-accent/30 bg-card/20 backdrop-blur-sm p-6 md:p-8 relative">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-accent/30 bg-card/20 backdrop-blur-sm p-6 md:p-8 relative">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent/50" />

      <div className="text-center mb-6">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 text-accent" />
        <h2 className="font-display text-xl md:text-2xl font-bold text-accent mb-2 tracking-widest">
          PLATFORM ANALYTICS
        </h2>
        <p className="text-muted-foreground text-sm tracking-wider">
          Real-time launchpad statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-primary/20 bg-secondary/20 p-4 text-center">
          <Rocket className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="font-display text-2xl md:text-3xl font-bold text-primary">
            {stats.totalTokens}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            Total Tokens
          </p>
        </div>

        <div className="border border-primary/20 bg-secondary/20 p-4 text-center">
          <Coins className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="font-display text-2xl md:text-3xl font-bold text-accent">
            {stats.totalFees.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            SOL Collected
          </p>
        </div>

        <div className="border border-primary/20 bg-secondary/20 p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
          <p className="font-display text-2xl md:text-3xl font-bold text-green-500">
            {stats.recentLaunches}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            Last 24h
          </p>
        </div>

        <div className="border border-primary/20 bg-secondary/20 p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
          <p className="font-display text-2xl md:text-3xl font-bold text-yellow-500">
            {stats.topCreators.length}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            Creators
          </p>
        </div>
      </div>

      {/* Top Creators */}
      {stats.topCreators.length > 0 && (
        <div>
          <h3 className="text-xs text-muted-foreground mb-3 tracking-[0.2em] uppercase text-center">
            // Top Creators
          </h3>
          <div className="space-y-2">
            {stats.topCreators.map((creator, index) => (
              <div
                key={creator.address}
                className="flex items-center justify-between p-3 border border-primary/10 bg-secondary/10"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-display text-lg font-bold ${
                    index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-gray-400' : 
                    index === 2 ? 'text-orange-600' : 'text-muted-foreground'
                  }`}>
                    #{index + 1}
                  </span>
                  <a
                    href={`https://solscan.io/account/${creator.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    {formatAddress(creator.address)}
                  </a>
                </div>
                <span className="text-sm text-accent font-bold">
                  {creator.count} token{creator.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalTokens === 0 && (
        <div className="text-center py-8 border border-primary/10 bg-secondary/10">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No analytics yet</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Launch a token to see stats!</p>
        </div>
      )}
    </div>
  );
}
