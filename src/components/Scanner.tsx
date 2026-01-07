import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Skull, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'eliminating' | 'complete';

interface Threat {
  id: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  eliminated: boolean;
}

const LARP_THREATS: Omit<Threat, 'id' | 'eliminated'>[] = [
  { name: 'CryptoGuru2024.exe', type: 'Financial LARP', severity: 'critical' },
  { name: 'AlphaMindset.dll', type: 'Motivational LARP', severity: 'high' },
  { name: 'FakeFlex_Instagram.sys', type: 'Social Media LARP', severity: 'medium' },
  { name: 'TrustMeBro.bat', type: 'Investment LARP', severity: 'critical' },
  { name: 'SelfMadeMillionaire.tmp', type: 'Success Theater', severity: 'high' },
  { name: 'DropshippingGuru.log', type: 'Hustle Culture LARP', severity: 'medium' },
  { name: 'LinkedInInfluencer.cache', type: 'Professional LARP', severity: 'low' },
  { name: 'PassiveIncome_Lie.dat', type: 'Financial Fantasy', severity: 'high' },
];

export default function Scanner() {
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [currentAction, setCurrentAction] = useState('');

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const startScan = () => {
    setPhase('scanning');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    addLog('Initializing LARP Detection Protocol v3.7...');
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
          
          // Add scan logs at certain progress points
          if (newProgress > 20 && prev <= 20) addLog('Scanning browser cookies...');
          if (newProgress > 35 && prev <= 35) addLog('Analyzing social media fingerprints...');
          if (newProgress > 50 && prev <= 50) addLog('Detecting motivational quote overload...');
          if (newProgress > 65 && prev <= 65) addLog('Checking for crypto wallet screenshots...');
          if (newProgress > 80 && prev <= 80) addLog('Analyzing LinkedIn activity patterns...');
          if (newProgress > 95 && prev <= 95) addLog('⚠️ MULTIPLE THREATS DETECTED!');
          
          return newProgress;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [phase, addLog]);

  useEffect(() => {
    if (phase === 'detected') {
      // Generate random threats
      const numThreats = Math.floor(Math.random() * 4) + 3;
      const shuffled = [...LARP_THREATS].sort(() => Math.random() - 0.5);
      const selectedThreats = shuffled.slice(0, numThreats).map((t, i) => ({
        ...t,
        id: `threat-${i}`,
        eliminated: false,
      }));
      
      setThreats(selectedThreats);
      addLog(`Found ${selectedThreats.length} LARP instances in your browser!`);
    }
  }, [phase, addLog]);

  const eliminateThreats = () => {
    setPhase('eliminating');
    setCurrentAction('Initiating purge sequence...');
    
    threats.forEach((threat, index) => {
      setTimeout(() => {
        setThreats(prev => prev.map(t => 
          t.id === threat.id ? { ...t, eliminated: true } : t
        ));
        setCurrentAction(`Eliminating ${threat.name}...`);
        addLog(`✓ Eliminated: ${threat.name}`);
        
        if (index === threats.length - 1) {
          setTimeout(() => {
            setPhase('complete');
            setCurrentAction('');
            addLog('🛡️ SYSTEM PURIFIED - All LARPs eliminated!');
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
      <div className="fixed inset-0 bg-[linear-gradient(hsl(120_100%_50%/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(120_100%_50%/0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-primary pulse-glow" />
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary glitch-text">
              LARP SCANNER
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            [ Advanced Browser Authenticity Detection System ]
          </p>
          <p className="text-xs text-muted-foreground mt-2 opacity-60">
            v3.7.2 // Detecting pretenders since 2024
          </p>
        </header>

        {/* Main Scanner Area */}
        <div className="border-2 border-primary/50 bg-card/50 backdrop-blur-sm p-6 md:p-8 mb-8 relative">
          {phase === 'scanning' && <div className="scan-line" />}
          
          {/* Status Display */}
          <div className="text-center mb-8">
            {phase === 'idle' && (
              <div className="fade-in-up">
                <Skull className="w-24 h-24 mx-auto mb-4 text-primary/50" />
                <p className="text-xl mb-2">System Ready</p>
                <p className="text-muted-foreground text-sm">
                  Click below to scan your browser for LARP activity
                </p>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="fade-in-up">
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
                  <div 
                    className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"
                    style={{ animationDuration: '1s' }}
                  />
                  <div className="absolute inset-4 border-2 border-primary/20 rounded-full" />
                  <div 
                    className="absolute inset-4 border-2 border-transparent border-t-primary/60 rounded-full animate-spin"
                    style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold font-display">{Math.floor(progress)}%</span>
                  </div>
                </div>
                <p className="text-lg cursor-blink">Scanning in progress</p>
              </div>
            )}

            {phase === 'detected' && (
              <div className="fade-in-up">
                <AlertTriangle className="w-20 h-20 mx-auto mb-4 text-accent threat-pulse" />
                <p className="text-2xl text-accent font-bold mb-2">
                  ⚠️ THREATS DETECTED ⚠️
                </p>
                <p className="text-muted-foreground">
                  {threats.length} LARP instance(s) found in your browser
                </p>
              </div>
            )}

            {phase === 'eliminating' && (
              <div className="fade-in-up">
                <Zap className="w-20 h-20 mx-auto mb-4 text-accent animate-pulse" />
                <p className="text-xl text-accent">{currentAction}</p>
              </div>
            )}

            {phase === 'complete' && (
              <div className="fade-in-up">
                <CheckCircle className="w-24 h-24 mx-auto mb-4 text-primary" />
                <p className="text-2xl font-bold text-primary mb-2">
                  SYSTEM PURIFIED
                </p>
                <p className="text-muted-foreground">
                  All LARP instances have been eliminated
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {phase === 'scanning' && (
            <div className="mb-6">
              <div className="h-2 bg-secondary border border-primary/30 progress-glow">
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
              <h3 className="text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                Detected Threats:
              </h3>
              {threats.map((threat, index) => (
                <div 
                  key={threat.id}
                  className={`flex items-center justify-between p-3 border border-primary/30 bg-secondary/30 transition-all duration-300 ${
                    threat.eliminated ? 'eliminate opacity-0' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <Skull className={`w-5 h-5 ${threat.eliminated ? 'text-primary' : 'text-accent'}`} />
                    <div>
                      <p className="font-mono text-sm">{threat.name}</p>
                      <p className="text-xs text-muted-foreground">{threat.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs uppercase font-bold ${getSeverityColor(threat.severity)}`}>
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
                <Shield className="w-5 h-5 mr-2" />
                Initialize Scan
              </Button>
            )}
            
            {phase === 'detected' && (
              <Button variant="danger" size="xl" onClick={eliminateThreats}>
                <Zap className="w-5 h-5 mr-2" />
                Eliminate All Threats
              </Button>
            )}
            
            {phase === 'complete' && (
              <Button variant="terminal" size="lg" onClick={reset}>
                Run New Scan
              </Button>
            )}
          </div>
        </div>

        {/* Scan Log */}
        {scanLog.length > 0 && (
          <div className="border border-primary/30 bg-card/30 p-4">
            <h3 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
              System Log:
            </h3>
            <div className="h-32 overflow-y-auto font-mono text-xs space-y-1">
              {scanLog.map((log, index) => (
                <p key={index} className="text-primary/80 fade-in-up">
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 text-xs text-muted-foreground">
          <p>⚠️ For entertainment purposes only. No actual files are scanned or modified.</p>
          <p className="mt-1 opacity-50">Stay authentic. Stay real.</p>
        </footer>
      </div>
    </div>
  );
}
