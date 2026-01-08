import { useState, useEffect } from "react";
import { AlertTriangle, Shield, ShieldAlert, X, ExternalLink, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ThreatAlert {
  id: string;
  url: string;
  threatType: "phishing" | "malware" | "scam" | "tracking" | "suspicious";
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  blocked: boolean;
}

const threatDatabase = [
  { pattern: "free-crypto", type: "scam" as const, severity: "high" as const },
  { pattern: "login-verify", type: "phishing" as const, severity: "critical" as const },
  { pattern: "winner-claim", type: "scam" as const, severity: "high" as const },
  { pattern: "tracking.ads", type: "tracking" as const, severity: "low" as const },
  { pattern: "malware-download", type: "malware" as const, severity: "critical" as const },
  { pattern: "suspicious-redirect", type: "suspicious" as const, severity: "medium" as const },
  { pattern: "fake-wallet", type: "phishing" as const, severity: "critical" as const },
  { pattern: "airdrop-claim", type: "scam" as const, severity: "high" as const },
];

const simulatedUrls = [
  "https://free-crypto-giveaway.xyz/claim",
  "https://login-verify-wallet.com/auth",
  "https://tracking.ads.network/pixel",
  "https://winner-claim-prize.net/reward",
  "https://fake-wallet-connect.io/sign",
  "https://airdrop-claim-sol.xyz/get",
];

export const ThreatAlertSystem = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);

  const getSeverityColor = (severity: ThreatAlert["severity"]) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/20 border-red-500/50";
      case "high": return "text-orange-500 bg-orange-500/20 border-orange-500/50";
      case "medium": return "text-yellow-500 bg-yellow-500/20 border-yellow-500/50";
      case "low": return "text-blue-500 bg-blue-500/20 border-blue-500/50";
    }
  };

  const getThreatIcon = (severity: ThreatAlert["severity"]) => {
    switch (severity) {
      case "critical":
      case "high":
        return <ShieldAlert className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const detectThreat = (url: string): ThreatAlert | null => {
    for (const threat of threatDatabase) {
      if (url.toLowerCase().includes(threat.pattern)) {
        return {
          id: Math.random().toString(36).substr(2, 9),
          url,
          threatType: threat.type,
          severity: threat.severity,
          timestamp: new Date(),
          blocked: threat.severity === "critical" || threat.severity === "high",
        };
      }
    }
    return null;
  };

  const blockThreat = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, blocked: true } : alert
    ));
    setBlockedCount(prev => prev + 1);
    toast({
      title: "Threat Blocked",
      description: "The suspicious website has been blocked.",
    });
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  useEffect(() => {
    if (!isMonitoring) return;

    const simulateNavigation = () => {
      const randomUrl = simulatedUrls[Math.floor(Math.random() * simulatedUrls.length)];
      const threat = detectThreat(randomUrl);
      
      if (threat) {
        setAlerts(prev => [threat, ...prev].slice(0, 10));
        
        if (threat.blocked) {
          setBlockedCount(prev => prev + 1);
        }

        toast({
          variant: "destructive",
          title: `${threat.severity.toUpperCase()} Threat Detected!`,
          description: `${threat.threatType} attempt from ${new URL(threat.url).hostname}`,
        });
      }
    };

    const interval = setInterval(simulateNavigation, Math.random() * 5000 + 3000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isMonitoring ? "bg-green-500/20" : "bg-muted"}`}>
            <Shield className={`w-6 h-6 ${isMonitoring ? "text-green-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Real-Time Protection</h3>
            <p className="text-sm text-muted-foreground">
              {isMonitoring ? "Monitoring active" : "Protection disabled"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{blockedCount}</p>
            <p className="text-xs text-muted-foreground">Threats Blocked</p>
          </div>
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            variant={isMonitoring ? "destructive" : "default"}
            className="min-w-[120px]"
          >
            {isMonitoring ? "Stop" : "Start"} Protection
          </Button>
        </div>
      </div>

      {isMonitoring && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-500">Actively monitoring browser activity...</span>
        </div>
      )}

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No threats detected</p>
            <p className="text-sm">Start protection to monitor for suspicious activity</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="mt-0.5">{getThreatIcon(alert.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold capitalize">{alert.threatType}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 uppercase">
                    {alert.severity}
                  </span>
                  {alert.blocked && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/30 text-red-400">
                      BLOCKED
                    </span>
                  )}
                </div>
                <p className="text-sm truncate opacity-80">{alert.url}</p>
                <p className="text-xs opacity-60 mt-1">
                  {alert.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <div className="flex gap-1">
                {!alert.blocked && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => blockThreat(alert.id)}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
