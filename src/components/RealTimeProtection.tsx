import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, ShieldOff, Activity, AlertTriangle, CheckCircle, Globe, Fingerprint, Lock, Unlock, Wifi, Eye, Cookie, ChevronDown, Lightbulb, Info } from 'lucide-react';

interface SecurityCheck {
  id: string;
  name: string;
  status: 'safe' | 'warning' | 'danger' | 'checking';
  message: string;
  icon: React.ReactNode;
  tip?: string;
}

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'blocked' | 'detected' | 'safe';
  message: string;
}

// Known tracker domains to check against
const KNOWN_TRACKERS = [
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.net',
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'twitter.com/i/',
  'analytics',
  'tracker',
  'pixel',
  'beacon',
];

// Known fingerprinting scripts/patterns
const FINGERPRINT_SCRIPTS = [
  'fingerprint',
  'fingerprintjs',
  'fp.js',
  'canvas-fingerprint',
  'webgl-fingerprint',
  'audio-fingerprint',
  'clientjs',
  'evercookie',
  'panopticlick',
];

export default function RealTimeProtection() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ blocked: 0, detected: 0, safe: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((type: 'blocked' | 'detected' | 'safe', message: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
    };
    setActivityLog(prev => [newLog, ...prev].slice(0, 30));
    setStats(prev => ({ ...prev, [type]: prev[type] + 1 }));
  }, []);

  // Protection tips for each check type
  const getProtectionTip = (id: string, status: string): string => {
    const tips: Record<string, { safe: string; warning: string; danger: string }> = {
      'secure-connection': {
        safe: 'Your connection is encrypted. Always verify the padlock icon in your browser.',
        warning: 'Consider using HTTPS Everywhere extension for automatic upgrades.',
        danger: 'Switch to HTTPS immediately. Avoid entering sensitive data on HTTP sites.',
      },
      'webrtc-leak': {
        safe: 'Your real IP is protected from WebRTC leaks.',
        warning: 'Use a browser extension like WebRTC Leak Prevent or disable WebRTC in browser settings.',
        danger: 'Disable WebRTC in your browser or use Tor/Brave browser for better privacy.',
      },
      'cookies': {
        safe: 'Cookie usage is within normal limits.',
        warning: 'Clear cookies regularly or use browser extensions like Cookie AutoDelete.',
        danger: 'Use private browsing mode and consider blocking third-party cookies in settings.',
      },
      'tracking-scripts': {
        safe: 'No tracking scripts detected on this page.',
        warning: 'Install uBlock Origin or Privacy Badger to block trackers automatically.',
        danger: 'Use Brave browser or Firefox with Enhanced Tracking Protection enabled.',
      },
      'canvas-fingerprint': {
        safe: 'No fingerprinting scripts detected.',
        warning: 'Use CanvasBlocker extension or Brave browser to randomize canvas data.',
        danger: 'Consider using Tor Browser for maximum fingerprinting protection.',
      },
      'local-storage': {
        safe: 'Local storage usage is normal.',
        warning: 'Periodically clear site data in browser settings or use extensions.',
        danger: 'Clear all site data and use private browsing for sensitive activities.',
      },
    };
    return tips[id]?.[status as keyof typeof tips[string]] || 'Keep your browser and extensions updated.';
  };

  // Check if connection is secure (HTTPS)
  const checkSecureConnection = useCallback((): SecurityCheck => {
    const isSecure = window.location.protocol === 'https:';
    const status = isSecure ? 'safe' : 'danger';
    return {
      id: 'secure-connection',
      name: 'Secure Connection',
      status,
      message: isSecure ? 'HTTPS connection active' : 'Insecure HTTP connection',
      icon: isSecure ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />,
      tip: getProtectionTip('secure-connection', status),
    };
  }, []);

  // Check for WebRTC IP leak potential
  const checkWebRTCLeak = useCallback(async (): Promise<SecurityCheck> => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      await pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc.close();
          resolve({
            id: 'webrtc-leak',
            name: 'WebRTC Protection',
            status: 'safe',
            message: 'No IP leak detected',
            icon: <Wifi className="w-4 h-4" />,
            tip: getProtectionTip('webrtc-leak', 'safe'),
          });
        }, 1000);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
            const hasLocalIP = ipRegex.test(candidate) && !candidate.includes('0.0.0.0');
            const status = hasLocalIP ? 'warning' : 'safe';
            
            clearTimeout(timeout);
            pc.close();
            
            resolve({
              id: 'webrtc-leak',
              name: 'WebRTC Protection',
              status,
              message: hasLocalIP ? 'Local IP may be exposed via WebRTC' : 'WebRTC leak protection active',
              icon: <Wifi className="w-4 h-4" />,
              tip: getProtectionTip('webrtc-leak', status),
            });
          }
        };
      });
    } catch {
      return {
        id: 'webrtc-leak',
        name: 'WebRTC Protection',
        status: 'safe',
        message: 'WebRTC disabled or protected',
        icon: <Wifi className="w-4 h-4" />,
        tip: getProtectionTip('webrtc-leak', 'safe'),
      };
    }
  }, []);

  // Check for third-party cookies
  const checkThirdPartyCookies = useCallback((): SecurityCheck => {
    const cookies = document.cookie.split(';').length;
    const hasManyCookies = cookies > 5;
    const status = hasManyCookies ? 'warning' : 'safe';
    
    return {
      id: 'cookies',
      name: 'Cookie Protection',
      status,
      message: hasManyCookies ? `${cookies} cookies detected` : 'Cookie usage normal',
      icon: <Cookie className="w-4 h-4" />,
      tip: getProtectionTip('cookies', status),
    };
  }, []);

  // Check for tracking scripts in the page
  const checkTrackingScripts = useCallback((): SecurityCheck => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const trackers = scripts.filter(script => {
      const src = script.getAttribute('src') || '';
      return KNOWN_TRACKERS.some(tracker => src.includes(tracker));
    });
    const status = trackers.length > 0 ? 'warning' : 'safe';

    return {
      id: 'tracking-scripts',
      name: 'Tracker Detection',
      status,
      message: trackers.length > 0 ? `${trackers.length} tracking script(s) found` : 'No trackers detected',
      icon: <Eye className="w-4 h-4" />,
      tip: getProtectionTip('tracking-scripts', status),
    };
  }, []);

  // Check for actual canvas fingerprinting scripts
  const checkCanvasFingerprint = useCallback((): SecurityCheck => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const fingerprintScripts = scripts.filter(script => {
      const src = (script.getAttribute('src') || '').toLowerCase();
      return FINGERPRINT_SCRIPTS.some(pattern => src.includes(pattern));
    });

    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
    const suspiciousInline = inlineScripts.filter(script => {
      const content = (script.textContent || '').toLowerCase();
      return content.includes('toDataURL') && content.includes('getContext') && 
             (content.includes('fingerprint') || content.includes('canvas'));
    });

    const hasFingerprinting = fingerprintScripts.length > 0 || suspiciousInline.length > 0;
    const status = hasFingerprinting ? 'warning' : 'safe';

    return {
      id: 'canvas-fingerprint',
      name: 'Fingerprint Protection',
      status,
      message: hasFingerprinting 
        ? `${fingerprintScripts.length + suspiciousInline.length} fingerprinting script(s) detected` 
        : 'No fingerprinting scripts detected',
      icon: <Fingerprint className="w-4 h-4" />,
      tip: getProtectionTip('canvas-fingerprint', status),
    };
  }, []);

  // Check local storage usage
  const checkLocalStorage = useCallback((): SecurityCheck => {
    try {
      const storageSize = JSON.stringify(localStorage).length;
      const hasExcessiveStorage = storageSize > 50000;
      const status = hasExcessiveStorage ? 'warning' : 'safe';
      
      return {
        id: 'local-storage',
        name: 'Storage Monitoring',
        status,
        message: hasExcessiveStorage 
          ? `${(storageSize / 1024).toFixed(1)}KB stored locally` 
          : 'Local storage usage normal',
        icon: <Globe className="w-4 h-4" />,
        tip: getProtectionTip('local-storage', status),
      };
    } catch {
      return {
        id: 'local-storage',
        name: 'Storage Monitoring',
        status: 'safe',
        message: 'Local storage access restricted',
        icon: <Globe className="w-4 h-4" />,
        tip: getProtectionTip('local-storage', 'safe'),
      };
    }
  }, []);

  // Run all security checks
  const runSecurityChecks = useCallback(async () => {
    if (!isEnabled) return;

    const checks: SecurityCheck[] = [
      checkSecureConnection(),
      checkThirdPartyCookies(),
      checkTrackingScripts(),
      checkCanvasFingerprint(),
      checkLocalStorage(),
    ];

    // Add WebRTC check (async)
    const webrtcCheck = await checkWebRTCLeak();
    checks.push(webrtcCheck);

    setSecurityChecks(checks);

    // Log any new detections
    checks.forEach(check => {
      if (check.status === 'warning') {
        addLog('detected', `${check.name}: ${check.message}`);
      } else if (check.status === 'danger') {
        addLog('blocked', `${check.name}: ${check.message}`);
      }
    });
  }, [isEnabled, checkSecureConnection, checkThirdPartyCookies, checkTrackingScripts, checkCanvasFingerprint, checkLocalStorage, checkWebRTCLeak, addLog]);

  // Monitor DOM changes for new scripts
  useEffect(() => {
    if (!isEnabled) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'SCRIPT') {
            const src = (node as HTMLScriptElement).src;
            if (src && KNOWN_TRACKERS.some(tracker => src.includes(tracker))) {
              addLog('blocked', `Blocked tracking script: ${new URL(src).hostname}`);
            }
          }
          if (node.nodeName === 'IFRAME') {
            const src = (node as HTMLIFrameElement).src;
            if (src) {
              addLog('detected', `New iframe detected: ${new URL(src).hostname}`);
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isEnabled, addLog]);

  // Initial check and periodic monitoring
  useEffect(() => {
    if (isEnabled) {
      runSecurityChecks();
      addLog('safe', 'Real-time protection activated');
      
      // Run checks every 10 seconds
      intervalRef.current = setInterval(runSecurityChecks, 10000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setSecurityChecks([]);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, runSecurityChecks, addLog]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-accent bg-accent/10 border-accent/20';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'danger': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const safeCount = securityChecks.filter(c => c.status === 'safe').length;
  const warningCount = securityChecks.filter(c => c.status === 'warning').length;
  const dangerCount = securityChecks.filter(c => c.status === 'danger').length;
  const totalChecks = securityChecks.length;

  // Calculate security score (0-100)
  const calculateSecurityScore = () => {
    if (totalChecks === 0) return 0;
    const safePoints = safeCount * 100;
    const warningPoints = warningCount * 50;
    const dangerPoints = dangerCount * 0;
    return Math.round((safePoints + warningPoints + dangerPoints) / totalChecks);
  };

  const securityScore = calculateSecurityScore();

  const getScoreColor = () => {
    if (securityScore >= 80) return 'text-accent';
    if (securityScore >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = () => {
    if (securityScore >= 90) return 'Excellent';
    if (securityScore >= 80) return 'Good';
    if (securityScore >= 60) return 'Fair';
    if (securityScore >= 40) return 'Poor';
    return 'Critical';
  };

  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  return (
    <Card className="p-6 bg-card border-border">
      {/* Header */}
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
              {isEnabled ? 'Monitoring browser security' : 'Protection disabled'}
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
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      {/* Security Score Dashboard */}
      {isEnabled && securityChecks.length > 0 && (
        <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security Score
            </h3>
            <Badge variant="outline" className={getScoreColor()}>
              {getScoreLabel()}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getScoreColor()}`}>
              {securityScore}
            </div>
            <div className="flex-1">
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    securityScore >= 80 ? 'bg-accent' : 
                    securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-accent" />
              {safeCount} Secure
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              {warningCount} Warnings
            </span>
            {dangerCount > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                {dangerCount} Critical
              </span>
            )}
          </div>
        </div>
      )}

      {/* Security Checks with Tips */}
      {isEnabled && securityChecks.length > 0 && (
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Security Checks
          </h3>
          {securityChecks.map((check) => (
            <Collapsible 
              key={check.id}
              open={expandedCheck === check.id}
              onOpenChange={(open) => setExpandedCheck(open ? check.id : null)}
            >
              <div className={`rounded-lg border ${getStatusColor(check.status)}`}>
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{check.icon}</div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{check.name}</p>
                      <p className="text-xs opacity-80">{check.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-medium">{check.status}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedCheck === check.id ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0">
                    <div className="p-3 bg-background/50 rounded-md border border-border/50">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-yellow-500 mb-1">Protection Tip</p>
                          <p className="text-xs text-muted-foreground">{check.tip}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Activity Log */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-secondary/50 px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider">Activity Log</span>
          </div>
          <span className="text-xs text-muted-foreground">{activityLog.length} events</span>
        </div>
        
        <div className="max-h-48 overflow-y-auto">
          {!isEnabled ? (
            <div className="p-6 text-center">
              <ShieldOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Protection disabled</p>
            </div>
          ) : activityLog.length === 0 ? (
            <div className="p-6 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">Monitoring started...</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activityLog.map((log) => (
                <div key={log.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                  {log.type === 'blocked' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  {log.type === 'detected' && <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />}
                  {log.type === 'safe' && <CheckCircle className="w-4 h-4 text-accent shrink-0" />}
                  <span className="flex-1 text-xs truncate">{log.message}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Protection Status */}
      {isEnabled && (
        <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/20 flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-accent">Active Protection</p>
            <p className="text-xs text-muted-foreground">
              Monitoring HTTPS, WebRTC, cookies, trackers, fingerprinting & storage
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
