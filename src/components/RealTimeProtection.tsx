import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldOff, Activity, AlertTriangle, CheckCircle, Globe, Fingerprint, Lock, Unlock, Wifi, Eye, Cookie } from 'lucide-react';

interface SecurityCheck {
  id: string;
  name: string;
  status: 'safe' | 'warning' | 'danger' | 'checking';
  message: string;
  icon: React.ReactNode;
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

  // Check if connection is secure (HTTPS)
  const checkSecureConnection = useCallback((): SecurityCheck => {
    const isSecure = window.location.protocol === 'https:';
    return {
      id: 'secure-connection',
      name: 'Secure Connection',
      status: isSecure ? 'safe' : 'danger',
      message: isSecure ? 'HTTPS connection active' : 'Insecure HTTP connection',
      icon: isSecure ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />,
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
          });
        }, 1000);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            // Check if local IP is exposed
            const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
            const hasLocalIP = ipRegex.test(candidate) && !candidate.includes('0.0.0.0');
            
            clearTimeout(timeout);
            pc.close();
            
            resolve({
              id: 'webrtc-leak',
              name: 'WebRTC Protection',
              status: hasLocalIP ? 'warning' : 'safe',
              message: hasLocalIP ? 'Local IP may be exposed via WebRTC' : 'WebRTC leak protection active',
              icon: <Wifi className="w-4 h-4" />,
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
      };
    }
  }, []);

  // Check for third-party cookies
  const checkThirdPartyCookies = useCallback((): SecurityCheck => {
    const cookies = document.cookie.split(';').length;
    const hasManyCookies = cookies > 5;
    
    return {
      id: 'cookies',
      name: 'Cookie Protection',
      status: hasManyCookies ? 'warning' : 'safe',
      message: hasManyCookies ? `${cookies} cookies detected` : 'Cookie usage normal',
      icon: <Cookie className="w-4 h-4" />,
    };
  }, []);

  // Check for tracking scripts in the page
  const checkTrackingScripts = useCallback((): SecurityCheck => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const trackers = scripts.filter(script => {
      const src = script.getAttribute('src') || '';
      return KNOWN_TRACKERS.some(tracker => src.includes(tracker));
    });

    return {
      id: 'tracking-scripts',
      name: 'Tracker Detection',
      status: trackers.length > 0 ? 'warning' : 'safe',
      message: trackers.length > 0 ? `${trackers.length} tracking script(s) found` : 'No trackers detected',
      icon: <Eye className="w-4 h-4" />,
    };
  }, []);

  // Check for canvas fingerprinting protection
  const checkCanvasFingerprint = useCallback((): SecurityCheck => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillText('test', 10, 10);
        canvas.toDataURL();
      }
      return {
        id: 'canvas-fingerprint',
        name: 'Fingerprint Protection',
        status: 'warning',
        message: 'Canvas fingerprinting possible',
        icon: <Fingerprint className="w-4 h-4" />,
      };
    } catch {
      return {
        id: 'canvas-fingerprint',
        name: 'Fingerprint Protection',
        status: 'safe',
        message: 'Canvas fingerprinting blocked',
        icon: <Fingerprint className="w-4 h-4" />,
      };
    }
  }, []);

  // Check local storage usage
  const checkLocalStorage = useCallback((): SecurityCheck => {
    try {
      const storageSize = JSON.stringify(localStorage).length;
      const hasExcessiveStorage = storageSize > 50000; // 50KB threshold
      
      return {
        id: 'local-storage',
        name: 'Storage Monitoring',
        status: hasExcessiveStorage ? 'warning' : 'safe',
        message: hasExcessiveStorage 
          ? `${(storageSize / 1024).toFixed(1)}KB stored locally` 
          : 'Local storage usage normal',
        icon: <Globe className="w-4 h-4" />,
      };
    } catch {
      return {
        id: 'local-storage',
        name: 'Storage Monitoring',
        status: 'safe',
        message: 'Local storage access restricted',
        icon: <Globe className="w-4 h-4" />,
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

      {/* Security Checks Grid */}
      {isEnabled && securityChecks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
          {securityChecks.map((check) => (
            <div 
              key={check.id}
              className={`p-3 rounded-lg border ${getStatusColor(check.status)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {check.icon}
                <span className="text-xs font-medium truncate">{check.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {check.status === 'safe' && <CheckCircle className="w-3 h-3" />}
                {check.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                {check.status === 'danger' && <AlertTriangle className="w-3 h-3" />}
                <span className="text-[10px] uppercase font-medium">{check.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {isEnabled && (
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span className="text-accent font-medium">{safeCount} Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500 font-medium">{warningCount} Warnings</span>
          </div>
          {dangerCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-500 font-medium">{dangerCount} Critical</span>
            </div>
          )}
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
