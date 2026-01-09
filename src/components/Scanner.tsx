import { useState, useEffect, useCallback, useRef } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Zap, CheckCircle, AlertTriangle, Rocket, Upload, Link, FileText, Shield, Globe, History, Settings, Skull } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VirusDefinitionStats from './VirusDefinitionStats';
import BrowserScanner from './BrowserScanner';
import URLScanner from './URLScanner';
import FileScanner from './FileScanner';
import RealTimeProtection from './RealTimeProtection';
import { ThreatAlertSystem } from './ThreatAlertSystem';
import { saveScanToHistory } from '@/lib/scanHistory';
import { NetworkBadge } from './NetworkBadge';
import { supabase } from '@/integrations/supabase/client';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'eliminating' | 'complete' | 'clean';
type ScanType = 'file' | 'url';

interface Threat {
  id: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  eliminated: boolean;
  destroying: boolean;
  logoUrl?: string;
  generatingLogo?: boolean;
}

const FILE_THREATS: Omit<Threat, 'id' | 'eliminated' | 'destroying'>[] = [
  { name: 'trojan.generic.malware', type: 'TROJAN', severity: 'critical' },
  { name: 'adware.tracking.cookies', type: 'ADWARE', severity: 'medium' },
  { name: 'spyware.keylogger.hidden', type: 'SPYWARE', severity: 'critical' },
  { name: 'ransomware.encrypt.payload', type: 'RANSOMWARE', severity: 'critical' },
  { name: 'pup.unwanted.bundler', type: 'PUP', severity: 'low' },
  { name: 'exploit.cve.2024', type: 'EXPLOIT', severity: 'high' },
  { name: 'worm.autorun.spreader', type: 'WORM', severity: 'critical' },
  { name: 'rootkit.kernel.hijacker', type: 'ROOTKIT', severity: 'critical' },
  { name: 'backdoor.remote.access', type: 'BACKDOOR', severity: 'critical' },
  { name: 'keylogger.input.capture', type: 'KEYLOGGER', severity: 'high' },
  { name: 'rat.remote.control', type: 'RAT', severity: 'critical' },
  { name: 'dropper.payload.installer', type: 'DROPPER', severity: 'high' },
];

const URL_THREATS: Omit<Threat, 'id' | 'eliminated' | 'destroying'>[] = [
  { name: 'phishing.credential.steal', type: 'PHISHING', severity: 'critical' },
  { name: 'malware.download.redirect', type: 'MALWARE', severity: 'critical' },
  { name: 'cryptojacker.script.inject', type: 'CRYPTOJACKER', severity: 'high' },
  { name: 'tracker.fingerprint.browser', type: 'TRACKER', severity: 'medium' },
  { name: 'scam.fake.store', type: 'SCAM', severity: 'high' },
  { name: 'suspicious.redirect.chain', type: 'SUSPICIOUS', severity: 'medium' },
  { name: 'botnet.command.server', type: 'BOTNET', severity: 'critical' },
  { name: 'scareware.fake.alert', type: 'SCAREWARE', severity: 'medium' },
];

export default function Scanner() {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanType, setScanType] = useState<ScanType>('file');
  const [urlInput, setUrlInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedThreatForDeploy, setSelectedThreatForDeploy] = useState<Threat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const startScan = () => {
    if (scanType === 'file' && !fileName) {
      return;
    }
    if (scanType === 'url' && !urlInput.trim()) {
      return;
    }

    setPhase('scanning');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    
    if (scanType === 'file') {
      addLog(`> SCANNING FILE: ${fileName}`);
      addLog('> Analyzing file signature...');
    } else {
      addLog(`> SCANNING URL: ${urlInput}`);
      addLog('> Resolving domain...');
    }
  };

  useEffect(() => {
    if (phase === 'scanning') {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 3;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            // Randomly decide if threats are found (70% chance for demo)
            const hasThreats = Math.random() > 0.3;
            setPhase(hasThreats ? 'detected' : 'clean');
            return 100;
          }
          
          if (scanType === 'file') {
            if (newProgress > 15 && prev <= 15) addLog('> Checking file headers...');
            if (newProgress > 30 && prev <= 30) addLog('> Scanning for malware signatures...');
            if (newProgress > 45 && prev <= 45) addLog('> Analyzing executable code...');
            if (newProgress > 60 && prev <= 60) addLog('> Checking against threat database...');
            if (newProgress > 75 && prev <= 75) addLog('> Deep behavioral analysis...');
            if (newProgress > 90 && prev <= 90) addLog('> Finalizing scan results...');
          } else {
            if (newProgress > 15 && prev <= 15) addLog('> Checking SSL certificate...');
            if (newProgress > 30 && prev <= 30) addLog('> Analyzing page content...');
            if (newProgress > 45 && prev <= 45) addLog('> Scanning for phishing patterns...');
            if (newProgress > 60 && prev <= 60) addLog('> Checking reputation database...');
            if (newProgress > 75 && prev <= 75) addLog('> Detecting trackers & scripts...');
            if (newProgress > 90 && prev <= 90) addLog('> Verifying safe browsing status...');
          }
          
          return newProgress;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [phase, scanType, addLog]);

  // Generate virus logos for detected threats
  const generateVirusLogo = async (threat: Threat) => {
    try {
      setThreats(prev => prev.map(t => 
        t.id === threat.id ? { ...t, generatingLogo: true } : t
      ));
      
      const { data, error } = await supabase.functions.invoke('generate-virus-logo', {
        body: {
          threatName: threat.name,
          threatType: threat.type,
          severity: threat.severity,
        },
      });

      if (error) throw error;
      
      setThreats(prev => prev.map(t => 
        t.id === threat.id ? { ...t, logoUrl: data.imageUrl, generatingLogo: false } : t
      ));
      
      addLog(`> 🎨 Logo generated for ${threat.name}`);
    } catch (err) {
      console.error('Failed to generate logo:', err);
      setThreats(prev => prev.map(t => 
        t.id === threat.id ? { ...t, generatingLogo: false } : t
      ));
    }
  };

  useEffect(() => {
    if (phase === 'detected') {
      const threatList = scanType === 'file' ? FILE_THREATS : URL_THREATS;
      const numThreats = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...threatList].sort(() => Math.random() - 0.5);
      const selectedThreats = shuffled.slice(0, numThreats).map((t, i) => ({
        ...t,
        id: `threat-${i}`,
        eliminated: false,
        destroying: false,
        logoUrl: undefined,
        generatingLogo: false,
      }));
      
      setThreats(selectedThreats);
      addLog(`> ⚠️ ${selectedThreats.length} THREAT(S) DETECTED`);
      
      // Auto-generate logos for all threats
      selectedThreats.forEach((threat) => {
        generateVirusLogo(threat);
      });
    } else if (phase === 'clean') {
      addLog('> ✓ NO THREATS DETECTED');
      addLog('> Target is safe to use');
      
      // Save clean scan to history
      saveScanToHistory({
        scan_type: scanType,
        target: scanType === 'file' ? fileName : urlInput,
        threats_found: 0,
        threats_blocked: 0,
        status: 'clean',
      });
    }
  }, [phase, scanType, addLog, fileName, urlInput]);

  const deployViaBags = (threat: Threat) => {
    setSelectedThreatForDeploy(threat);
    // Navigate to launchpad with threat data
    navigate('/launchpad', { 
      state: { 
        virusThreat: {
          name: threat.name.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          symbol: threat.type.slice(0, 5),
          description: `A dangerous ${threat.type} threat detected and captured. Deploy this malware as a token on BAGS!`,
          logoUrl: threat.logoUrl,
          severity: threat.severity,
        }
      }
    });
  };

  const eliminateThreats = () => {
    setPhase('eliminating');
    
    threats.forEach((threat, index) => {
      // First, start the destroying animation
      setTimeout(() => {
        addLog(`> TARGETING: ${threat.name}`);
        setThreats(prev => prev.map(t => 
          t.id === threat.id ? { ...t, destroying: true } : t
        ));
        
        // Then after animation, mark as eliminated and remove
        setTimeout(() => {
          addLog(`> ☠️ DESTROYED: ${threat.name}`);
          setThreats(prev => prev.map(t => 
            t.id === threat.id ? { ...t, eliminated: true, destroying: false } : t
          ));
          
          // Remove threat from list after elimination
          setTimeout(() => {
            setThreats(prev => prev.filter(t => t.id !== threat.id));
          }, 300);
        }, 600);
        
        if (index === threats.length - 1) {
          setTimeout(async () => {
            setPhase('complete');
            addLog('> 💀 ALL THREATS ANNIHILATED');
            addLog('> Your system is now protected');
            
            // Save to history
            await saveScanToHistory({
              scan_type: scanType,
              target: scanType === 'file' ? fileName : urlInput,
              threats_found: threats.length,
              threats_blocked: threats.length,
              status: 'protected',
            });
          }, 1200);
        }
      }, index * 1000);
    });
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    setFileName('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-foreground';
    }
  };

  const canStartScan = (scanType === 'file' && fileName) || (scanType === 'url' && urlInput.trim());

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.jpg" 
              alt="LarpX402" 
              className="w-10 h-10 rounded-sm object-cover object-center"
            />
            <span className="text-lg font-semibold tracking-tight">LarpX402</span>
          </div>
          
          <div className="flex items-center gap-2">
            <RouterLink to="/history">
              <Button variant="outline" size="sm" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </RouterLink>
            <RouterLink to="/gallery">
              <Button variant="outline" size="sm" className="gap-2">
                <Skull className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
              </Button>
            </RouterLink>
            <RouterLink to="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </RouterLink>
            <RouterLink to="/launchpad">
              <Button variant="outline" size="sm" className="gap-2">
                <Rocket className="w-4 h-4" />
                <span className="hidden sm:inline">Launchpad</span>
              </Button>
            </RouterLink>
          </div>
          <div className="flex items-center gap-3">
            <NetworkBadge />
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
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 mx-auto mb-3 text-accent" />
            <h1 className="text-2xl font-semibold mb-1">Security Scanner</h1>
            <p className="text-muted-foreground text-sm">Scan files and URLs for threats</p>
          </div>

          {/* Scan Type Tabs */}
          {phase === 'idle' && (
            <Tabs value={scanType} onValueChange={(v) => setScanType(v as ScanType)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Scan File
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link className="w-4 h-4" />
                  Scan URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-4">
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fileName ? (
                    <div className="fade-in-up">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-accent" />
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground mt-1">Click to change file</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium">Drop a file or click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">Supports any file type</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">Enter a URL to check for phishing, malware, and other threats</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Status Display */}
          <div className="text-center mb-6">
            {phase === 'idle' && !canStartScan && (
              <div className="py-4">
                <EyeOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Select a file or enter a URL to scan</p>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="fade-in-up py-4">
                <div className="relative w-28 h-28 mx-auto mb-4">
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
                    <span className="text-xl font-semibold">{Math.floor(progress)}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Scanning...</p>
              </div>
            )}

            {phase === 'detected' && (
              <div className="fade-in-up py-4">
                <AlertTriangle className="w-14 h-14 mx-auto mb-3 text-destructive" />
                <h2 className="text-lg font-semibold text-destructive">Threats Detected</h2>
                <p className="text-sm text-muted-foreground">{threats.length} threat(s) found</p>
              </div>
            )}

            {phase === 'clean' && (
              <div className="fade-in-up py-4">
                <CheckCircle className="w-14 h-14 mx-auto mb-3 text-accent" />
                <h2 className="text-lg font-semibold">All Clear!</h2>
                <p className="text-sm text-muted-foreground">No threats detected - safe to use</p>
              </div>
            )}

            {phase === 'eliminating' && (
              <div className="fade-in-up py-4">
                <div className="loader w-14 h-14 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Neutralizing threats...</p>
              </div>
            )}

            {phase === 'complete' && (
              <div className="fade-in-up py-4">
                <CheckCircle className="w-14 h-14 mx-auto mb-3 text-accent" />
                <h2 className="text-lg font-semibold">Protected</h2>
                <p className="text-sm text-muted-foreground">All threats have been blocked</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {phase === 'scanning' && (
            <div className="mb-6">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-100 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Threat List */}
          {(phase === 'detected' || phase === 'eliminating' || phase === 'complete') && threats.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                {phase === 'eliminating' ? '🔥 Destroying Threats' : 'Detected Threats'}
              </h3>
              {threats.map((threat) => (
                <div 
                  key={threat.id}
                  className={`p-4 border rounded-lg transition-all duration-300 overflow-hidden ${
                    threat.destroying 
                      ? 'border-red-500 bg-red-500/20 animate-pulse scale-95 shadow-lg shadow-red-500/50' 
                      : threat.eliminated 
                        ? 'border-accent bg-accent/10 scale-90 opacity-0' 
                        : 'border-border bg-secondary/50'
                  }`}
                  style={{
                    transform: threat.destroying ? 'translateX(0) rotate(0deg)' : threat.eliminated ? 'translateX(100px) rotate(10deg)' : 'translateX(0)',
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Virus Logo */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-background border border-border overflow-hidden flex items-center justify-center">
                      {threat.generatingLogo ? (
                        <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                      ) : threat.logoUrl ? (
                        <img 
                          src={threat.logoUrl} 
                          alt={threat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Skull className="w-8 h-8 text-destructive" />
                      )}
                    </div>
                    
                    {/* Threat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${threat.destroying ? 'text-red-400' : ''} ${threat.eliminated ? 'line-through text-accent' : ''}`}>
                          {threat.destroying ? `💥 ${threat.name}` : threat.name}
                        </p>
                        <span className={`text-xs uppercase font-bold ${
                          threat.destroying ? 'text-red-500 animate-pulse' : getSeverityColor(threat.severity)
                        }`}>
                          {threat.destroying ? '☠️ DESTROYING' : threat.eliminated ? '✓ ELIMINATED' : threat.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{threat.type}</p>
                      
                      {/* Deploy Button */}
                      {phase === 'detected' && threat.logoUrl && !threat.destroying && !threat.eliminated && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2 text-xs h-7 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50 hover:border-purple-400"
                          onClick={() => deployViaBags(threat)}
                        >
                          <Rocket className="w-3 h-3" />
                          Deploy via BAGS
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            {phase === 'idle' && canStartScan && (
              <Button onClick={startScan} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Eye className="w-4 h-4" />
                Start Scan
              </Button>
            )}
            
            {phase === 'detected' && (
              <Button onClick={eliminateThreats} variant="destructive" className="gap-2">
                <Zap className="w-4 h-4" />
                Block Threats
              </Button>
            )}
            
            {(phase === 'complete' || phase === 'clean') && (
              <Button onClick={reset} variant="outline">
                Scan Another
              </Button>
            )}
          </div>
        </div>

        {/* Scan Log */}
        {scanLog.length > 0 && (
          <div className="border border-border rounded-lg bg-card p-4 mt-4">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Scan Log
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

        {/* Virus Definition Stats */}
        <div className="mt-6">
          <VirusDefinitionStats />
        </div>


        {/* Browser Scanner */}
        <div className="mt-6">
          <BrowserScanner />
        </div>

        {/* Real-Time Protection */}
        <div className="mt-6">
          <RealTimeProtection />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            LarpX402 · Protecting Your Browser
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
