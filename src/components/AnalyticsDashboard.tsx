import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, Coins, TrendingUp, Trophy } from 'lucide-react';

const PLATFORM_FEE_SOL = 0.01;

interface TokenStats {
  totalTokens: number;
  totalFees: number;
  topCreators: { address: string; count: number }[];
  recentLaunches: number;
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
        const { count: totalCount } = await supabase
          .from('launched_tokens')
          .select('*', { count: 'exact', head: true });

        const { data: tokens } = await supabase
          .from('launched_tokens')
          .select('creator_address, created_at')
          .order('created_at', { ascending: false });

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

    const channel = supabase
      .channel('stats-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'launched_tokens',
        },
        () => fetchStats()
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
      <div className="border border-border rounded-lg bg-card p-5">
        <div className="flex items-center justify-center py-12">
          <div className="loader w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-semibold">{stats.totalTokens}</p>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Fees</span>
          </div>
          <p className="text-2xl font-semibold text-accent">{stats.totalFees.toFixed(2)}</p>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">24h</span>
          </div>
          <p className="text-2xl font-semibold text-green-500">{stats.recentLaunches}</p>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Creators</span>
          </div>
          <p className="text-2xl font-semibold text-yellow-500">{stats.topCreators.length}</p>
        </div>
      </div>

      {/* Top Creators */}
      {stats.topCreators.length > 0 && (
        <div className="border border-border rounded-lg bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Top Creators</h3>
          <div className="space-y-2">
            {stats.topCreators.map((creator, index) => (
              <div
                key={creator.address}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
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
                    className="text-sm hover:text-accent transition-colors"
                  >
                    {formatAddress(creator.address)}
                  </a>
                </div>
                <span className="text-sm text-accent font-medium">
                  {creator.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
