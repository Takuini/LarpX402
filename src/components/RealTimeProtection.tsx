import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldOff, Activity, AlertTriangle, CheckCircle, Globe, FileText, Cookie, Fingerprint, Zap } from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'blocked' | 'allowed' | 'warning';
  category: 'tracker' | 'malware' | 'phishing' | 'fingerprint' | 'cookie' | 'script';
  source: string;
  action: string;
}

const THREAT_SOURCES = [
  { source: 'ads.doubleclick.net', category: 'tracker' as const, action: 'Tracking pixel blocked' },
  { source: 'analytics.malicious-site.com', category: 'malware' as const, action: 'Malware script blocked' },
  { source: 'facebook.com/tr/', category: 'tracker' as const, action: 'Social tracker blocked' },
  { source: 'cryptominer.xyz', category: 'malware' as const, action: 'Cryptojacking attempt blocked' },
  { source: 'phish-login.com', category: 'phishing' as const, action: 'Phishing site blocked' },
  { source: 'fingerprint.js', category: 'fingerprint' as const, action: 'Fingerprinting blocked' },
  { source: 'third-party-cookies.net', category: 'cookie' as const, action: 'Tracking cookie blocked' },
  { source: 'adserver.tracking.io', category: 'tracker' as const, action: 'Ad tracker blocked' },
  { source: 'malware-dropper.ru', category: 'malware' as const, action: 'Drive-by download blocked' },
  { source: 'evil-script.min.js', category: 'script' as const, action: 'Suspicious script blocked' },
  { source: 'canvas-fingerprint.js', category: 'fingerprint' as const, action: 'Canvas fingerprint blocked' },
  { source: 'webrtc-leak.js', category: 'fingerprint' as const, action: 'WebRTC leak prevented' },
];

const ALLOWED_SOURCES = [
  { source: 'api.stripe.com', action: 'Payment API allowed' },
  { source: 'fonts.googleapis.com', action: 'Font resource loaded' },
  { source: 'cdn.jsdelivr.net', action: 'CDN resource loaded' },
  { source: 'unpkg.com', action: 'Package loaded' },
];

export default function RealTimeProtection() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    blocked: 0,
    allowed: 0,
    warnings: 0,
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tracker': return <Globe className="w-3 h-3" />;
      case 'malware': return <AlertTriangle className="w-3 h-3" />;
      case 'phishing': return <AlertTriangle className="w-3 h-3" />;
      case 'fingerprint': return <Fingerprint className="w-3 h-3" />;
      case 'cookie': return <Cookie className="w-3 h-3" />;
      case 'script': return <FileText className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'malware': return 'text-red-500 bg-red-500/10';
      case 'phishing': return 'text-red-500 bg-red-500/10';
      case 'tracker': return 'text-orange-500 bg-orange-500/10';
      case 'fingerprint': return 'text-yellow-500 bg-yellow-500/10';
      case 'cookie': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const addActivity = useCallback((type: 'blocked' | 'allowed' | 'warning', source: string, action: string, category: ActivityLog['category']) => {
    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      category,
      source,
      action,
    };

    setActivityLog(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50 entries
    setStats(prev => ({
      ...prev,
      [type === 'blocked' ? 'blocked' : type === 'allowed' ? 'allowed' : 'warnings']: 
        prev[type === 'blocked' ? 'blocked' : type === 'allowed' ? 'allowed' : 'warnings'] + 1,
    }));
  }, []);

  // Simulate real-time monitoring
  useEffect(() => {
    if (!isEnabled) return;

    const simulateActivity = () => {
      const rand = Math.random();
      
      if (rand < 0.7) {
        // Block a threat (70% chance)
        const threat = THREAT_SOURCES[Math.floor(Math.random() * THREAT_SOURCES.length)];
        addActivity('blocked', threat.source, threat.action, threat.category);
      } else if (rand < 0.95) {
        // Allow legitimate request (25% chance)
        const allowed = ALLOWED_SOURCES[Math.floor(Math.random() * ALLOWED_SOURCES.length)];
        addActivity('allowed', allowed.source, allowed.action, 'script');
      } else {
        // Warning (5% chance)
        addActivity('warning', 'suspicious-connection.io', 'Suspicious connection detected', 'tracker');
      }
    };

    // Initial activity burst
    const initialTimeout = setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(simulateActivity, i * 300);
      }
    }, 500);

    // Continuous monitoring
    const interval = setInterval(simulateActivity, 2000 + Math.random() * 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isEnabled, addActivity]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card className="p-6 bg-card border-border">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${isEnabled ? 'bg-accent/10' : 'bg-muted'}`}>
            {isEnabled ? (
              <Shield className="w-6 h-6 text-accent" />
            ) : (
              <ShieldOff className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Real-Time Protection</h2>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? 'Actively monitoring browsing activity' : 'Protection disabled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEnabled && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="text-xs text-accent font-medium">ACTIVE</span>
            </div>
          )}
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-500 font-medium">Blocked</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.blocked}</p>
        </div>
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span className="text-xs text-accent font-medium">Allowed</span>
          </div>
          <p className="text-2xl font-bold text-accent">{stats.allowed}</p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-500 font-medium">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{stats.warnings}</p>
        </div>
      </div>

      {/* Activity Log */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-secondary/50 px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider">Activity Log</span>
          </div>
          <span className="text-xs text-muted-foreground">{activityLog.length} events</span>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {!isEnabled ? (
            <div className="p-8 text-center">
              <ShieldOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Protection is disabled</p>
              <p className="text-xs text-muted-foreground mt-1">Enable to start monitoring</p>
            </div>
          ) : activityLog.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">Monitoring started...</p>
              <p className="text-xs text-muted-foreground mt-1">Activity will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activityLog.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`px-3 py-2 flex items-start gap-3 text-sm transition-colors ${
                    activity.type === 'blocked' ? 'bg-red-500/5' : 
                    activity.type === 'warning' ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  <div className={`p-1 rounded ${getCategoryColor(activity.category)}`}>
                    {getCategoryIcon(activity.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium uppercase ${
                        activity.type === 'blocked' ? 'text-red-500' :
                        activity.type === 'warning' ? 'text-yellow-500' :
                        'text-accent'
                      }`}>
                        {activity.type}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.source}</p>
                    <p className="text-xs mt-0.5">{activity.action}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Protection Status */}
      {isEnabled && (
        <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/20 flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-medium text-accent">Protection Active</p>
            <p className="text-xs text-muted-foreground">
              Blocking trackers, malware, phishing attempts, and fingerprinting
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
