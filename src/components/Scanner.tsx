import { useState, useEffect, useCallback } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Zap, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'eliminating' | 'complete';

interface Threat {
  id: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  eliminated: boolean;
}

const LARP_THREATS: Omit<Threat, 'id' | 'eliminated'>[] = [
  { name: 'identity_facade_0x7f3a.exe', type: 'PERSONA FABRICATION', severity: 'critical' },
  { name: 'clout_injection.dll', type: 'SOCIAL ENGINEERING', severity: 'high' },
  { name: 'manufactured_reality.sys', type: 'PERCEPTION MANIPULATION', severity: 'medium' },
  { name: 'trust_exploit_v2.bat', type: 'PSYCHOLOGICAL BREACH', severity: 'critical' },
  { name: 'false_authority.tmp', type: 'HIERARCHY SIMULATION', severity: 'high' },
  { name: 'synthetic_success.log', type: 'ACHIEVEMENT THEATER', severity: 'medium' },
  { name: 'persona_mask_layer.cache', type: 'IDENTITY OBFUSCATION', severity: 'low' },
  { name: 'narrative_control.dat', type: 'REALITY DISTORTION', severity: 'high' },
];

export default function Scanner() {
  const { connected, publicKey } = useWallet();
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const startScan = () => {
    setPhase('scanning');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    addLog('> INITIATING PROTOCOL...');
    addLog('> ANONYMOUS SCAN ENGAGED');
  };

  useEffect(() => {
    if (phase === 'scanning') {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 3;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setPhase('detected');
            return 100;
          }
          
          if (newProgress > 15 && prev <= 15) addLog('> Infiltrating browser memory...');
          if (newProgress > 30 && prev <= 30) addLog('> Decrypting identity layers...');
          if (newProgress > 45 && prev <= 45) addLog('> Analyzing behavioral patterns...');
          if (newProgress > 60 && prev <= 60) addLog('> Cross-referencing authenticity matrix...');
          if (newProgress > 75 && prev <= 75) addLog('> Exposing fabricated constructs...');
          if (newProgress > 90 && prev <= 90) addLog('> !! DECEPTION DETECTED !!');
          
          return newProgress;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [phase, addLog]);

  useEffect(() => {
    if (phase === 'detected') {
      const numThreats = Math.floor(Math.random() * 4) + 3;
      const shuffled = [...LARP_THREATS].sort(() => Math.random() - 0.5);
      const selectedThreats = shuffled.slice(0, numThreats).map((t, i) => ({
        ...t,
        id: `threat-${i}`,
        eliminated: false,
      }));
      
      setThreats(selectedThreats);
      addLog(`> ${selectedThreats.length} DECEPTION NODES IDENTIFIED`);
    }
  }, [phase, addLog]);

  const eliminateThreats = () => {
    setPhase('eliminating');
    
    threats.forEach((threat, index) => {
      setTimeout(() => {
        setThreats(prev => prev.map(t => 
          t.id === threat.id ? { ...t, eliminated: true } : t
        ));
        addLog(`> ELIMINATED: ${threat.name}`);
        
        if (index === threats.length - 1) {
          setTimeout(() => {
            setPhase('complete');
            addLog('> PURGE COMPLETE');
            addLog('> THE TRUTH REMAINS');
          }, 800);
        }
      }, (index + 1) * 800);
    });
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.jpg" 
              alt="LarpX402" 
              className="w-8 h-8 rounded-sm object-cover object-center"
            />
            <span className="text-lg font-semibold tracking-tight">LarpX402</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/launchpad">
              <Button variant="outline" size="sm" className="gap-2">
                <Rocket className="w-4 h-4" />
                Launchpad
              </Button>
            </Link>
            {connected && publicKey && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {formatAddress(publicKey.toBase58())}
              </span>
            )}
            <WalletMultiButton className="!bg-card !border !border-border !rounded-md !h-9 !px-4 !text-sm !font-medium hover:!bg-secondary transition-colors" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Scanner Card */}
        <div className="border border-border rounded-lg bg-card p-6 md:p-8">
          {/* Status Display */}
          <div className="text-center mb-8">
            {phase === 'idle' && (
              <div className="fade-in-up">
                <EyeOff className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
                <h1 className="text-2xl font-semibold mb-2">Awaiting Command</h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Initiate scan to expose deception vectors within your browser environment
                </p>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="fade-in-up">
                <div className="relative w-32 h-32 mx-auto mb-6">
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
                    <span className="text-2xl font-semibold">{Math.floor(progress)}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Scanning...</p>
              </div>
            )}

            {phase === 'detected' && (
              <div className="fade-in-up">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
                <h2 className="text-xl font-semibold text-destructive mb-1">Deception Detected</h2>
                <p className="text-muted-foreground text-sm">
                  {threats.length} fabricated construct(s) identified
                </p>
              </div>
            )}

            {phase === 'eliminating' && (
              <div className="fade-in-up">
                <div className="loader w-16 h-16 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Executing purge protocol...</p>
              </div>
            )}

            {phase === 'complete' && (
              <div className="fade-in-up">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-accent" />
                <h2 className="text-xl font-semibold mb-1">Purge Complete</h2>
                <p className="text-muted-foreground text-sm">
                  All deception vectors have been neutralized
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {phase === 'scanning' && (
            <div className="mb-6">
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-100 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Threat List */}
          {(phase === 'detected' || phase === 'eliminating' || phase === 'complete') && threats.length > 0 && (
            <div className="mb-6 space-y-2">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Identified Constructs
              </h3>
              {threats.map((threat) => (
                <div 
                  key={threat.id}
                  className={`flex items-center justify-between p-3 border border-border rounded-md bg-secondary/50 transition-all duration-300 ${
                    threat.eliminated ? 'opacity-30 line-through' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Eye className={`w-4 h-4 ${threat.eliminated ? 'text-accent' : 'text-destructive'}`} />
                    <div>
                      <p className="text-sm">{threat.name}</p>
                      <p className="text-xs text-muted-foreground">{threat.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs uppercase font-medium ${getSeverityColor(threat.severity)}`}>
                    {threat.severity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            {phase === 'idle' && (
              <Button onClick={startScan} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Eye className="w-4 h-4" />
                Begin Scan
              </Button>
            )}
            
            {phase === 'detected' && (
              <Button onClick={eliminateThreats} variant="destructive" className="gap-2">
                <Zap className="w-4 h-4" />
                Execute Purge
              </Button>
            )}
            
            {phase === 'complete' && (
              <Button onClick={reset} variant="outline">
                New Operation
              </Button>
            )}
          </div>
        </div>

        {/* Scan Log */}
        {scanLog.length > 0 && (
          <div className="border border-border rounded-lg bg-card p-4 mt-4">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Operation Log
            </h3>
            <div className="h-32 overflow-y-auto space-y-1">
              {scanLog.map((log, index) => (
                <p key={index} className="text-xs text-muted-foreground font-mono">
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            LarpX402 · We See Everything
          </p>
          <a 
            href="https://github.com/Takuini" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            @Takuini
          </a>
        </div>
      </footer>
    </div>
  );
}
