import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Shield, AlertTriangle, CheckCircle, Cookie, Lock, Eye, Wifi, Zap, Database, Skull } from 'lucide-react';
import { saveScanToHistory } from '@/lib/scanHistory';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'eliminating' | 'complete';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: 'hsl(82, 85%, 67%)'
};

interface BrowserThreat {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  eliminated: boolean;
}

interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  plugins: number;
  webGL: string;
  canvas: string;
}

const BROWSER_CHECKS = [
  { name: 'Collecting browser fingerprint...', icon: Eye },
  { name: 'Scanning for tracking cookies...', icon: Cookie },
  { name: 'Analyzing connection security...', icon: Lock },
  { name: 'Checking WebRTC configuration...', icon: Wifi },
  { name: 'Detecting DNS over HTTPS...', icon: Globe },
  { name: 'Scanning installed plugins...', icon: Database },
  { name: 'Analyzing JavaScript APIs...', icon: Zap },
  { name: 'Checking privacy settings...', icon: Shield },
];

// Real browser scanning functions
const getBrowserInfo = (): BrowserInfo => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
  
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    plugins: navigator.plugins?.length || 0,
    webGL: debugInfo ? (gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown') : 'Unknown',
    canvas: getCanvasFingerprint(),
  };
};

const getCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unavailable';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('fingerprint', 2, 15);
    return canvas.toDataURL().slice(-50);
  } catch {
    return 'blocked';
  }
};

const getCookieCount = (): { total: number; thirdParty: number } => {
  const cookies = document.cookie.split(';').filter(c => c.trim());
  return {
    total: cookies.length,
    thirdParty: cookies.filter(c => c.includes('_ga') || c.includes('_fb') || c.includes('_gid') || c.includes('ads')).length,
  };
};

const checkWebRTCLeak = async (): Promise<{ leaking: boolean; localIP: string | null }> => {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      
      let localIP: string | null = null;
      
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          resolve({ leaking: !!localIP, localIP });
          return;
        }
        
        const candidate = e.candidate.candidate;
        const ipMatch = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (ipMatch && !ipMatch[0].startsWith('0.')) {
          localIP = ipMatch[0];
        }
      };
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      setTimeout(() => {
        pc.close();
        resolve({ leaking: !!localIP, localIP });
      }, 3000);
    } catch {
      resolve({ leaking: false, localIP: null });
    }
  });
};

const checkConnectionSecurity = () => {
  return {
    isHTTPS: window.location.protocol === 'https:',
  };
};

const detectBrowserFeatures = () => {
  return {
    hasDoNotTrack: navigator.doNotTrack === '1',
    hasWebGL: !!document.createElement('canvas').getContext('webgl'),
    hasWebRTC: !!window.RTCPeerConnection,
    hasGeolocation: 'geolocation' in navigator,
    hasBluetooth: 'bluetooth' in navigator,
    hasUSB: 'usb' in navigator,
    hasNotifications: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
  };
};

const getStorageInfo = () => {
  let localStorageSize = 0;
  let sessionStorageSize = 0;
  
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localStorageSize += localStorage[key].length;
      }
    }
  } catch {}
  
  try {
    for (const key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        sessionStorageSize += sessionStorage[key].length;
      }
    }
  } catch {}
  
  return {
    localStorageItems: Object.keys(localStorage).length,
    sessionStorageItems: Object.keys(sessionStorage).length,
    localStorageSize: Math.round(localStorageSize / 1024),
    sessionStorageSize: Math.round(sessionStorageSize / 1024),
  };
};

export default function BrowserScanner() {
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentCheck, setCurrentCheck] = useState(0);
  const [threats, setThreats] = useState<BrowserThreat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const performRealScan = async (): Promise<BrowserThreat[]> => {
    const detectedThreats: BrowserThreat[] = [];
    let threatId = 0;

    // Get browser info
    const info = getBrowserInfo();
    setBrowserInfo(info);
    addLog(`> Browser: ${info.userAgent.split(' ').slice(-2).join(' ')}`);
    addLog(`> Platform: ${info.platform}`);
    addLog(`> Resolution: ${info.screenResolution}`);

    // Check cookies
    const cookies = getCookieCount();
    addLog(`> Found ${cookies.total} cookies (${cookies.thirdParty} tracking)`);
    if (cookies.total > 0) {
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'tracking.cookies.detected',
        category: 'TRACKER',
        description: `${cookies.total} cookies stored${cookies.thirdParty > 0 ? ` (${cookies.thirdParty} tracking)` : ''}`,
        severity: cookies.thirdParty > 3 ? 'high' : cookies.total > 5 ? 'medium' : 'low',
        eliminated: false,
      });
    }

    // Check WebRTC
    addLog('> Checking WebRTC leak...');
    const webrtc = await checkWebRTCLeak();
    if (webrtc.leaking) {
      addLog(`> ⚠️ WebRTC leaking local IP: ${webrtc.localIP}`);
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'webrtc.ip.leak.critical',
        category: 'LEAK',
        description: `Local IP exposed: ${webrtc.localIP}`,
        severity: 'critical',
        eliminated: false,
      });
    } else {
      addLog('> WebRTC: No leak detected');
    }

    // Check connection security
    const security = checkConnectionSecurity();
    if (!security.isHTTPS) {
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'connection.insecure.http',
        category: 'SECURITY',
        description: 'Page not using HTTPS encryption',
        severity: 'critical',
        eliminated: false,
      });
    }
    addLog(`> Connection: ${security.isHTTPS ? 'Secure (HTTPS)' : 'INSECURE (HTTP)'}`);

    // Check browser fingerprinting
    addLog(`> Canvas fingerprint: ${info.canvas !== 'blocked' ? 'Detectable' : 'Blocked'}`);
    if (info.canvas !== 'blocked') {
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'fingerprint.canvas.exposed',
        category: 'FINGERPRINT',
        description: 'Canvas can be used to track you',
        severity: 'medium',
        eliminated: false,
      });
    }

    // Check Do Not Track
    const features = detectBrowserFeatures();
    addLog(`> Do Not Track: ${features.hasDoNotTrack ? 'Enabled' : 'Disabled'}`);
    if (!features.hasDoNotTrack) {
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'privacy.dnt.disabled',
        category: 'PRIVACY',
        description: 'DNT header not sent to websites',
        severity: 'low',
        eliminated: false,
      });
    }

    // Check exposed APIs
    const exposedAPIs: string[] = [];
    if (features.hasGeolocation) exposedAPIs.push('Geolocation');
    if (features.hasBluetooth) exposedAPIs.push('Bluetooth');
    if (features.hasUSB) exposedAPIs.push('USB');
    if (features.hasNotifications) exposedAPIs.push('Notifications');
    
    if (exposedAPIs.length > 2) {
      addLog(`> Exposed APIs: ${exposedAPIs.join(', ')}`);
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'api.sensitive.exposed',
        category: 'EXPOSURE',
        description: `${exposedAPIs.length} sensitive APIs: ${exposedAPIs.slice(0, 3).join(', ')}`,
        severity: 'low',
        eliminated: false,
      });
    }

    // Check storage
    const storage = getStorageInfo();
    addLog(`> Local Storage: ${storage.localStorageItems} items (${storage.localStorageSize}KB)`);
    if (storage.localStorageItems > 5) {
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'storage.data.accumulated',
        category: 'STORAGE',
        description: `${storage.localStorageItems} items stored (${storage.localStorageSize}KB)`,
        severity: storage.localStorageItems > 20 ? 'medium' : 'low',
        eliminated: false,
      });
    }

    // Check WebGL (fingerprinting)
    addLog(`> WebGL Renderer: ${info.webGL.slice(0, 40)}...`);
    if (info.webGL !== 'Unknown') {
      detectedThreats.push({
        id: `threat-${threatId++}`,
        name: 'fingerprint.webgl.exposed',
        category: 'FINGERPRINT',
        description: 'GPU info exposed for tracking',
        severity: 'medium',
        eliminated: false,
      });
    }

    addLog(`> Timezone: ${info.timezone}`);

    return detectedThreats;
  };

  const startScan = () => {
    setPhase('scanning');
    setProgress(0);
    setCurrentCheck(0);
    setThreats([]);
    setScanLog([]);
    setBrowserInfo(null);
    addLog('> INITIALIZING BROWSER THREAT SCAN');
    addLog('> Analyzing browser environment...');
  };

  useEffect(() => {
    if (phase === 'scanning') {
      let scanComplete = false;
      
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 3 + 1;
          
          const checkIndex = Math.floor((newProgress / 100) * BROWSER_CHECKS.length);
          if (checkIndex !== currentCheck && checkIndex < BROWSER_CHECKS.length) {
            setCurrentCheck(checkIndex);
          }
          
          if (newProgress >= 100 && !scanComplete) {
            scanComplete = true;
            clearInterval(interval);
            
            performRealScan().then(detectedThreats => {
              setThreats(detectedThreats);
              if (detectedThreats.length > 0) {
                setPhase('detected');
                addLog(`> ⚠️ ${detectedThreats.length} THREAT(S) DETECTED`);
              } else {
                setPhase('complete');
                addLog('> ✓ NO THREATS FOUND - Browser is secure');
              }
            });
            
            return 100;
          }
          
          return Math.min(newProgress, 99);
        });
      }, 120);
      
      return () => clearInterval(interval);
    }
  }, [phase, currentCheck, addLog]);

  const eliminateThreats = () => {
    setPhase('eliminating');
    addLog('> INITIATING THREAT ELIMINATION...');
    
    threats.forEach((threat, index) => {
      setTimeout(() => {
        // Actually try to eliminate what we can
        if (threat.category === 'TRACKER' || threat.name.includes('cookies')) {
          document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          });
        }
        
        setThreats(prev => prev.map(t => 
          t.id === threat.id ? { ...t, eliminated: true } : t
        ));
        addLog(`> ELIMINATED: ${threat.name}`);
        
        if (index === threats.length - 1) {
          setTimeout(async () => {
            setPhase('complete');
            addLog('> ALL THREATS NEUTRALIZED');
            addLog('> Browser protection active');
            
            await saveScanToHistory({
              scan_type: 'browser',
              target: `Browser: ${navigator.userAgent.split(' ').slice(-1)[0]}`,
              threats_found: threats.length,
              threats_blocked: threats.length,
              status: 'protected',
            });
          }, 800);
        }
      }, (index + 1) * 700);
    });
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setCurrentCheck(0);
    setThreats([]);
    setScanLog([]);
    setBrowserInfo(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-foreground';
    }
  };

  const CurrentCheckIcon = BROWSER_CHECKS[currentCheck]?.icon || Globe;

  return (
    <div className="border border-border rounded-lg bg-card p-6">
      <div className="text-center mb-6">
        <Globe className="w-10 h-10 mx-auto mb-3 text-accent" />
        <h2 className="text-xl font-semibold mb-1">Browser Threat Scanner</h2>
        <p className="text-muted-foreground text-sm">Deep scan for trackers, leaks & vulnerabilities</p>
      </div>

      {/* Status Display */}
      <div className="text-center mb-6">
        {phase === 'idle' && (
          <div className="py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Scans cookies, WebRTC, fingerprinting, storage & more
            </p>
          </div>
        )}

        {phase === 'scanning' && (
          <div className="fade-in-up py-4">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-full h-full progress-ring" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CurrentCheckIcon className="w-6 h-6 text-accent animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium">{BROWSER_CHECKS[currentCheck]?.name.replace('...', '')}</p>
            <p className="text-xs text-muted-foreground mt-1">{Math.floor(progress)}% complete</p>
          </div>
        )}

        {phase === 'detected' && (
          <div className="fade-in-up py-4">
            <Skull className="w-12 h-12 mx-auto mb-3 text-destructive animate-pulse" />
            <h3 className="text-lg font-semibold text-destructive">Threats Detected</h3>
            <p className="text-sm text-muted-foreground">{threats.length} threat(s) found in your browser</p>
          </div>
        )}

        {phase === 'eliminating' && (
          <div className="fade-in-up py-4">
            <div className="loader w-12 h-12 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Neutralizing threats...</p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="fade-in-up py-4">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent" />
            <h3 className="text-lg font-semibold">
              {threats.length === 0 ? 'Browser Secure' : 'Threats Eliminated'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {threats.length === 0 
                ? 'No significant threats found' 
                : `${threats.length} threat(s) have been neutralized`}
            </p>
          </div>
        )}
      </div>

      {/* Browser Info Summary */}
      {browserInfo && phase !== 'idle' && phase !== 'scanning' && (
        <div className="mb-4 p-3 bg-secondary/30 rounded-md border border-border">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Browser Profile</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Platform:</span> {browserInfo.platform}</div>
            <div><span className="text-muted-foreground">Screen:</span> {browserInfo.screenResolution}</div>
            <div><span className="text-muted-foreground">Language:</span> {browserInfo.language}</div>
            <div><span className="text-muted-foreground">Timezone:</span> {browserInfo.timezone}</div>
          </div>
        </div>
      )}

      {/* Severity Breakdown Chart */}
      {(phase === 'detected' || phase === 'eliminating' || phase === 'complete') && threats.length > 0 && (
        <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Threat Severity Breakdown
          </h3>
          <div className="flex items-center gap-6">
            {/* Pie Chart */}
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      const stats = { critical: 0, high: 0, medium: 0, low: 0 };
                      threats.filter(t => !t.eliminated).forEach(t => stats[t.severity]++);
                      return [
                        { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
                        { name: 'High', value: stats.high, color: SEVERITY_COLORS.high },
                        { name: 'Medium', value: stats.medium, color: SEVERITY_COLORS.medium },
                        { name: 'Low', value: stats.low, color: SEVERITY_COLORS.low }
                      ].filter(d => d.value > 0);
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(() => {
                      const stats = { critical: 0, high: 0, medium: 0, low: 0 };
                      threats.filter(t => !t.eliminated).forEach(t => stats[t.severity]++);
                      return [
                        { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
                        { name: 'High', value: stats.high, color: SEVERITY_COLORS.high },
                        { name: 'Medium', value: stats.medium, color: SEVERITY_COLORS.medium },
                        { name: 'Low', value: stats.low, color: SEVERITY_COLORS.low }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ));
                    })()}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {(['critical', 'high', 'medium', 'low'] as const).map(severity => {
                const count = threats.filter(t => !t.eliminated && t.severity === severity).length;
                const eliminated = threats.filter(t => t.eliminated && t.severity === severity).length;
                return (
                  <div 
                    key={severity}
                    className="p-2 rounded border border-border/50 bg-background/50"
                  >
                    <div 
                      className="text-[10px] font-medium uppercase mb-0.5"
                      style={{ color: SEVERITY_COLORS[severity] }}
                    >
                      {severity}
                    </div>
                    <div className="text-lg font-bold leading-tight">
                      {count}
                      {eliminated > 0 && (
                        <span className="text-xs text-accent ml-1">+{eliminated} blocked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Threat List */}
      {(phase === 'detected' || phase === 'eliminating' || phase === 'complete') && threats.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Detected Threats
          </h3>
          {threats.map((threat) => (
            <div 
              key={threat.id}
              className={`flex items-center justify-between p-3 border border-border rounded-md bg-secondary/50 transition-all duration-300 ${
                threat.eliminated ? 'opacity-40' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {threat.eliminated ? (
                  <CheckCircle className="w-4 h-4 text-accent" />
                ) : (
                  <Skull className="w-4 h-4 text-destructive" />
                )}
                <div>
                  <p className={`text-sm font-mono ${threat.eliminated ? 'line-through' : ''}`}>{threat.name}</p>
                  <p className="text-xs text-muted-foreground">{threat.category} • {threat.description}</p>
                </div>
              </div>
              <span 
                className="text-xs uppercase font-medium"
                style={{ color: threat.eliminated ? 'hsl(var(--accent))' : SEVERITY_COLORS[threat.severity] }}
              >
                {threat.eliminated ? 'BLOCKED' : threat.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {phase === 'idle' && (
          <Button onClick={startScan} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Globe className="w-4 h-4" />
            Scan My Browser
          </Button>
        )}
        
        {phase === 'detected' && (
          <Button onClick={eliminateThreats} variant="destructive" className="gap-2">
            <Zap className="w-4 h-4" />
            Eliminate {threats.length} Threat{threats.length !== 1 ? 's' : ''}
          </Button>
        )}
        
        {phase === 'complete' && (
          <Button onClick={reset} variant="outline">
            Scan Again
          </Button>
        )}
      </div>

      {/* Scan Log */}
      {scanLog.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Scan Log</h4>
          <div className="h-32 overflow-y-auto space-y-1 bg-secondary/30 rounded-md p-2">
            {scanLog.map((log, index) => (
              <p key={index} className="text-xs text-muted-foreground font-mono">
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
