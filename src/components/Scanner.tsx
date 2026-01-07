import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Zap, CheckCircle, AlertTriangle, Binary } from 'lucide-react';

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

const QUOTES = [
  "We are the watchers in the void.",
  "Truth cannot be manufactured.",
  "Every mask will fall.",
  "We do not forgive deception.",
  "Authenticity is resistance.",
];

export default function Scanner() {
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [currentAction, setCurrentAction] = useState('');
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

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
    setCurrentAction('> Executing purge protocol...');
    
    threats.forEach((threat, index) => {
      setTimeout(() => {
        setThreats(prev => prev.map(t => 
          t.id === threat.id ? { ...t, eliminated: true } : t
        ));
        setCurrentAction(`> Neutralizing ${threat.name}...`);
        addLog(`> ELIMINATED: ${threat.name}`);
        
        if (index === threats.length - 1) {
          setTimeout(() => {
            setPhase('complete');
            setCurrentAction('');
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
    setCurrentAction('');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-primary';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 relative overflow-hidden">
      {/* CRT Overlay */}
      <div className="crt-overlay" />
      
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(hsl(var(--primary)/0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Floating binary */}
      <div className="fixed top-20 left-10 text-primary/10 font-mono text-xs hidden md:block">
        01001100<br/>01000001<br/>01010010<br/>01010000
      </div>
      <div className="fixed bottom-20 right-10 text-primary/10 font-mono text-xs hidden md:block">
        01010100<br/>01010010<br/>01010101<br/>01000101
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="relative">
              <Eye className="w-16 h-16 text-primary pulse-glow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-primary rounded-full animate-ping" />
              </div>
            </div>
          </div>
          
          <h1 className="font-display text-3xl md:text-5xl font-bold text-primary glitch-text mb-2 tracking-widest">
            LARP HUNTER
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase">
            [ We See Everything ]
          </p>
          
          <div className="mt-6 border border-primary/20 p-3 max-w-md mx-auto bg-card/30">
            <p className="text-primary/70 text-sm italic">"{quote}"</p>
          </div>
        </header>

        {/* Main Scanner Area */}
        <div className="border border-primary/30 bg-card/20 backdrop-blur-sm p-6 md:p-8 mb-8 relative">
          {phase === 'scanning' && <div className="scan-line" />}
          
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/50" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/50" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50" />
          
          {/* Status Display */}
          <div className="text-center mb-8">
            {phase === 'idle' && (
              <div className="fade-in-up">
                <EyeOff className="w-24 h-24 mx-auto mb-6 text-primary/30" />
                <p className="text-xl mb-2 tracking-wider">AWAITING COMMAND</p>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Initiate scan to expose deception vectors within your browser environment
                </p>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="fade-in-up">
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 border border-primary/30 rounded-full" />
                  <div 
                    className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin"
                    style={{ animationDuration: '1s' }}
                  />
                  <div className="absolute inset-4 border border-primary/20 rounded-full" />
                  <div 
                    className="absolute inset-4 border border-transparent border-t-primary/60 rounded-full animate-spin"
                    style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold font-display">{Math.floor(progress)}%</span>
                  </div>
                </div>
                <p className="text-sm tracking-widest cursor-blink uppercase">Scanning</p>
              </div>
            )}

            {phase === 'detected' && (
              <div className="fade-in-up">
                <AlertTriangle className="w-20 h-20 mx-auto mb-4 text-accent threat-pulse" />
                <p className="text-xl text-accent font-bold mb-2 tracking-wider">
                  DECEPTION DETECTED
                </p>
                <p className="text-muted-foreground text-sm">
                  {threats.length} fabricated construct(s) identified
                </p>
              </div>
            )}

            {phase === 'eliminating' && (
              <div className="fade-in-up">
                <Binary className="w-20 h-20 mx-auto mb-4 text-accent animate-pulse" />
                <p className="text-lg text-accent tracking-wider">{currentAction}</p>
              </div>
            )}

            {phase === 'complete' && (
              <div className="fade-in-up">
                <CheckCircle className="w-24 h-24 mx-auto mb-4 text-primary" />
                <p className="text-xl font-bold text-primary mb-2 tracking-wider">
                  PURGE COMPLETE
                </p>
                <p className="text-muted-foreground text-sm">
                  All deception vectors have been neutralized
                </p>
                <p className="text-primary/50 text-xs mt-4 italic">
                  "The truth cannot hide from those who seek it."
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {phase === 'scanning' && (
            <div className="mb-6">
              <div className="h-1 bg-secondary border border-primary/20 progress-glow">
                <div 
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Threat List */}
          {(phase === 'detected' || phase === 'eliminating' || phase === 'complete') && threats.length > 0 && (
            <div className="mb-6 space-y-2">
              <h3 className="text-xs text-muted-foreground mb-3 tracking-[0.2em] uppercase">
                // Identified Constructs
              </h3>
              {threats.map((threat, index) => (
                <div 
                  key={threat.id}
                  className={`flex items-center justify-between p-3 border border-primary/20 bg-secondary/20 transition-all duration-300 ${
                    threat.eliminated ? 'eliminate opacity-0' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <Eye className={`w-4 h-4 ${threat.eliminated ? 'text-primary' : 'text-accent'}`} />
                    <div>
                      <p className="font-mono text-xs">{threat.name}</p>
                      <p className="text-[10px] text-muted-foreground tracking-wider">{threat.type}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${getSeverityColor(threat.severity)}`}>
                    {threat.severity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {phase === 'idle' && (
              <Button variant="terminal" size="xl" onClick={startScan}>
                <Eye className="w-5 h-5 mr-2" />
                Begin Scan
              </Button>
            )}
            
            {phase === 'detected' && (
              <Button variant="danger" size="xl" onClick={eliminateThreats}>
                <Zap className="w-5 h-5 mr-2" />
                Execute Purge
              </Button>
            )}
            
            {phase === 'complete' && (
              <Button variant="terminal" size="lg" onClick={reset}>
                New Operation
              </Button>
            )}
          </div>
        </div>

        {/* Scan Log */}
        {scanLog.length > 0 && (
          <div className="border border-primary/20 bg-card/20 p-4">
            <h3 className="text-[10px] text-muted-foreground mb-3 tracking-[0.2em] uppercase">
              // Operation Log
            </h3>
            <div className="h-32 overflow-y-auto font-mono text-xs space-y-1">
              {scanLog.map((log, index) => (
                <p key={index} className="text-primary/70 fade-in-up">
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 text-[10px] text-muted-foreground/50 tracking-wider">
          <p>WE ARE WATCHING // WE DO NOT FORGET // WE DO NOT FORGIVE</p>
          <a 
            href="https://github.com/Takuini" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-primary/60 hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            @Takuini
          </a>
        </footer>
      </div>
    </div>
  );
}
