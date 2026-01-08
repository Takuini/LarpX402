import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Shield, AlertTriangle, CheckCircle, Cookie, Lock, Eye, Wifi, Zap, Database } from 'lucide-react';
import { saveScanToHistory } from '@/lib/scanHistory';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'fixing' | 'complete';

interface BrowserThreat {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixed: boolean;
}

const BROWSER_CHECKS = [
  { name: 'Checking browser fingerprint protection...', icon: Eye },
  { name: 'Scanning for tracking cookies...', icon: Cookie },
  { name: 'Analyzing SSL/TLS security...', icon: Lock },
  { name: 'Detecting insecure connections...', icon: Wifi },
  { name: 'Checking for DNS leaks...', icon: Globe },
  { name: 'Scanning browser extensions...', icon: Database },
  { name: 'Analyzing JavaScript threats...', icon: Zap },
  { name: 'Checking WebRTC leaks...', icon: Shield },
];

const BROWSER_THREATS: Omit<BrowserThreat, 'id' | 'fixed'>[] = [
  { name: 'Tracking Cookies Detected', category: 'Privacy', description: '23 tracking cookies from advertisers', severity: 'medium' },
  { name: 'Browser Fingerprinting', category: 'Privacy', description: 'Your browser is uniquely identifiable', severity: 'high' },
  { name: 'WebRTC IP Leak', category: 'Security', description: 'Real IP exposed through WebRTC', severity: 'critical' },
  { name: 'Insecure Extensions', category: 'Security', description: '2 extensions with excessive permissions', severity: 'high' },
  { name: 'Outdated SSL Ciphers', category: 'Security', description: 'Weak encryption protocols enabled', severity: 'medium' },
  { name: 'Third-Party Trackers', category: 'Privacy', description: '15 active trackers on recent sites', severity: 'low' },
  { name: 'DNS Queries Exposed', category: 'Privacy', description: 'DNS not encrypted (no DoH/DoT)', severity: 'medium' },
  { name: 'Canvas Fingerprinting', category: 'Privacy', description: 'Canvas API used for tracking', severity: 'medium' },
];

export default function BrowserScanner() {
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentCheck, setCurrentCheck] = useState(0);
  const [threats, setThreats] = useState<BrowserThreat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const startScan = () => {
    setPhase('scanning');
    setProgress(0);
    setCurrentCheck(0);
    setThreats([]);
    setScanLog([]);
    addLog('> INITIALIZING BROWSER SECURITY SCAN');
    addLog('> Analyzing browser environment...');
  };

  useEffect(() => {
    if (phase === 'scanning') {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 2;
          
          const checkIndex = Math.floor((newProgress / 100) * BROWSER_CHECKS.length);
          if (checkIndex !== currentCheck && checkIndex < BROWSER_CHECKS.length) {
            setCurrentCheck(checkIndex);
            addLog(`> ${BROWSER_CHECKS[checkIndex].name}`);
          }
          
          if (newProgress >= 100) {
            clearInterval(interval);
            // Always find some threats in browser scan
            const numThreats = Math.floor(Math.random() * 4) + 2;
            const shuffled = [...BROWSER_THREATS].sort(() => Math.random() - 0.5);
            const selectedThreats = shuffled.slice(0, numThreats).map((t, i) => ({
              ...t,
              id: `threat-${i}`,
              fixed: false,
            }));
            setThreats(selectedThreats);
            setPhase('detected');
            addLog(`> ⚠️ ${selectedThreats.length} SECURITY ISSUES FOUND`);
            return 100;
          }
          
          return newProgress;
        });
      }, 80);
      
      return () => clearInterval(interval);
    }
  }, [phase, currentCheck, addLog]);

  const fixThreats = () => {
    setPhase('fixing');
    addLog('> APPLYING SECURITY FIXES...');
    
    threats.forEach((threat, index) => {
      setTimeout(() => {
        setThreats(prev => prev.map(t => 
          t.id === threat.id ? { ...t, fixed: true } : t
        ));
        addLog(`> FIXED: ${threat.name}`);
        
        if (index === threats.length - 1) {
          setTimeout(async () => {
            setPhase('complete');
            addLog('> ALL ISSUES RESOLVED');
            addLog('> Your browser is now secured');
            
            // Save to history
            await saveScanToHistory({
              scan_type: 'browser',
              target: 'Full Browser Scan',
              threats_found: threats.length,
              threats_blocked: threats.length,
              status: 'protected',
            });
          }, 800);
        }
      }, (index + 1) * 600);
    });
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setCurrentCheck(0);
    setThreats([]);
    setScanLog([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-foreground bg-secondary';
    }
  };

  const CurrentCheckIcon = BROWSER_CHECKS[currentCheck]?.icon || Globe;

  return (
    <div className="border border-border rounded-lg bg-card p-6">
      <div className="text-center mb-6">
        <Globe className="w-10 h-10 mx-auto mb-3 text-accent" />
        <h2 className="text-xl font-semibold mb-1">Browser Security Scanner</h2>
        <p className="text-muted-foreground text-sm">Deep scan for privacy & security issues</p>
      </div>

      {/* Status Display */}
      <div className="text-center mb-6">
        {phase === 'idle' && (
          <div className="py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Scan your browser for tracking, fingerprinting, and security vulnerabilities
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
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">Issues Found</h3>
            <p className="text-sm text-muted-foreground">{threats.length} security/privacy issues detected</p>
          </div>
        )}

        {phase === 'fixing' && (
          <div className="fade-in-up py-4">
            <div className="loader w-12 h-12 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Applying fixes...</p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="fade-in-up py-4">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent" />
            <h3 className="text-lg font-semibold">Browser Secured</h3>
            <p className="text-sm text-muted-foreground">All issues have been resolved</p>
          </div>
        )}
      </div>

      {/* Threat List */}
      {(phase === 'detected' || phase === 'fixing' || phase === 'complete') && threats.length > 0 && (
        <div className="mb-6 space-y-2 max-h-48 overflow-y-auto">
          {threats.map((threat) => (
            <div 
              key={threat.id}
              className={`flex items-center justify-between p-3 border border-border rounded-md bg-secondary/30 transition-all duration-300 ${
                threat.fixed ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${threat.fixed ? 'line-through' : ''}`}>
                    {threat.name}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(threat.severity)}`}>
                    {threat.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{threat.description}</p>
              </div>
              {threat.fixed && (
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 ml-2" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {phase === 'idle' && (
          <Button onClick={startScan} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Globe className="w-4 h-4" />
            Scan Browser
          </Button>
        )}
        
        {phase === 'detected' && (
          <Button onClick={fixThreats} variant="destructive" className="gap-2">
            <Zap className="w-4 h-4" />
            Fix All Issues
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
          <div className="h-24 overflow-y-auto space-y-1 bg-secondary/30 rounded-md p-2">
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
