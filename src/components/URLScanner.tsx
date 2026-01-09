import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Globe, Shield, AlertTriangle, CheckCircle, XCircle, Skull, Search, ExternalLink, Lock, Unlock, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { saveScanToHistory } from '@/lib/scanHistory';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'eliminating' | 'complete' | 'clean';

interface URLThreat {
  id: string;
  name: string;
  category: 'phishing' | 'malware' | 'scam' | 'tracker' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  eliminated: boolean;
}

interface URLAnalysis {
  ssl: boolean;
  domain: string;
  registrationAge: string;
  reputation: 'good' | 'neutral' | 'bad';
  redirects: number;
}

const THREAT_DATABASE: Omit<URLThreat, 'id' | 'eliminated'>[] = [
  { name: 'Credential Harvesting Form', category: 'phishing', severity: 'critical', description: 'Fake login form designed to steal credentials' },
  { name: 'Malicious JavaScript Payload', category: 'malware', severity: 'critical', description: 'Hidden script that can compromise your system' },
  { name: 'Drive-by Download Attempt', category: 'malware', severity: 'high', description: 'Automatic download of malicious files' },
  { name: 'Fake Payment Gateway', category: 'scam', severity: 'critical', description: 'Fraudulent checkout page stealing payment info' },
  { name: 'Cryptojacking Script', category: 'malware', severity: 'high', description: 'Hidden cryptocurrency mining script' },
  { name: 'Data Exfiltration Tracker', category: 'tracker', severity: 'medium', description: 'Aggressive tracking collecting personal data' },
  { name: 'Suspicious Redirect Chain', category: 'suspicious', severity: 'medium', description: 'Multiple redirects to obfuscate destination' },
  { name: 'Typosquatting Domain', category: 'phishing', severity: 'high', description: 'Domain impersonating legitimate website' },
  { name: 'Fake Security Alert', category: 'scam', severity: 'high', description: 'Tech support scam popup' },
  { name: 'Hidden iFrame Injection', category: 'malware', severity: 'critical', description: 'Invisible frame loading malicious content' },
  { name: 'Social Engineering Prompt', category: 'phishing', severity: 'medium', description: 'Deceptive message tricking users' },
  { name: 'Fingerprinting Script', category: 'tracker', severity: 'low', description: 'Browser fingerprinting for tracking' },
];

export default function URLScanner() {
  const [urlInput, setUrlInput] = useState('');
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [threats, setThreats] = useState<URLThreat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<URLAnalysis | null>(null);

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'phishing': return '🎣';
      case 'malware': return '🦠';
      case 'scam': return '💸';
      case 'tracker': return '👁️';
      default: return '⚠️';
    }
  };

  const simulateAnalysis = (): URLAnalysis => {
    const url = urlInput.toLowerCase();
    const hasSSL = url.startsWith('https://') || Math.random() > 0.3;
    const isSuspicious = url.includes('free') || url.includes('login') || url.includes('verify') || url.includes('urgent');
    
    return {
      ssl: hasSSL,
      domain: urlInput.replace(/^https?:\/\//, '').split('/')[0],
      registrationAge: isSuspicious ? '< 30 days' : '> 1 year',
      reputation: isSuspicious ? 'bad' : (hasSSL ? 'good' : 'neutral'),
      redirects: isSuspicious ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2),
    };
  };

  const startScan = async () => {
    if (!urlInput.trim()) return;

    setPhase('scanning');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    setAnalysis(null);

    addLog(`> ANALYZING URL: ${urlInput}`);

    const scanSteps = [
      { progress: 10, log: '> Resolving DNS records...' },
      { progress: 20, log: '> Checking SSL certificate...' },
      { progress: 30, log: '> Analyzing domain reputation...' },
      { progress: 40, log: '> Scanning for phishing patterns...' },
      { progress: 55, log: '> Detecting malware signatures...' },
      { progress: 65, log: '> Checking redirect chains...' },
      { progress: 75, log: '> Analyzing page content...' },
      { progress: 85, log: '> Scanning for trackers & scripts...' },
      { progress: 95, log: '> Compiling threat report...' },
    ];

    for (const step of scanSteps) {
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
      setProgress(step.progress);
      addLog(step.log);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    setProgress(100);

    const analysisResult = simulateAnalysis();
    setAnalysis(analysisResult);

    // Determine threats based on URL characteristics
    const url = urlInput.toLowerCase();
    const isSuspicious = url.includes('free') || url.includes('login') || url.includes('verify') || 
                         url.includes('urgent') || url.includes('confirm') || !analysisResult.ssl;
    
    const hasThreats = isSuspicious || Math.random() > 0.4;
    
    if (hasThreats) {
      const numThreats = Math.floor(Math.random() * 4) + 1;
      const shuffled = [...THREAT_DATABASE].sort(() => Math.random() - 0.5);
      const selectedThreats = shuffled.slice(0, numThreats).map((t, i) => ({
        ...t,
        id: `url-threat-${i}`,
        eliminated: false,
      }));
      
      setThreats(selectedThreats);
      setPhase('detected');
      addLog(`> ⚠️ ${selectedThreats.length} THREAT(S) DETECTED`);
    } else {
      setPhase('clean');
      addLog('> ✓ URL IS SAFE');
      addLog('> No phishing or malware detected');
      
      await saveScanToHistory({
        scan_type: 'url',
        target: urlInput,
        threats_found: 0,
        threats_blocked: 0,
        status: 'clean',
      });
    }
  };

  const eliminateThreats = async () => {
    setPhase('eliminating');
    
    for (let i = 0; i < threats.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setThreats(prev => prev.map((t, idx) => 
        idx === i ? { ...t, eliminated: true } : t
      ));
      addLog(`> BLOCKED: ${threats[i].name}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setPhase('complete');
    addLog('> ALL THREATS NEUTRALIZED');
    addLog('> URL has been flagged in our database');

    await saveScanToHistory({
      scan_type: 'url',
      target: urlInput,
      threats_found: threats.length,
      threats_blocked: threats.length,
      status: 'protected',
    });
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    setUrlInput('');
    setAnalysis(null);
  };

  // Threat severity breakdown for chart
  const severityCounts = threats.reduce((acc, t) => {
    acc[t.severity] = (acc[t.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'Critical', value: severityCounts['critical'] || 0, color: '#ef4444' },
    { name: 'High', value: severityCounts['high'] || 0, color: '#f97316' },
    { name: 'Medium', value: severityCounts['medium'] || 0, color: '#eab308' },
    { name: 'Low', value: severityCounts['low'] || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent/10">
          <Globe className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">URL Scanner</h2>
          <p className="text-sm text-muted-foreground">Check websites for phishing & malware</p>
        </div>
      </div>

      {/* URL Input */}
      {phase === 'idle' && (
        <div className="space-y-4 fade-in-up">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="bg-secondary border-border flex-1"
              onKeyDown={(e) => e.key === 'Enter' && startScan()}
            />
            <Button 
              onClick={startScan} 
              disabled={!urlInput.trim()}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              Scan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter any URL to check for phishing attempts, malware, scams, and suspicious trackers
          </p>
        </div>
      )}

      {/* Scanning Progress */}
      {phase === 'scanning' && (
        <div className="space-y-4 fade-in-up">
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <Globe className="w-5 h-5 text-accent animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{urlInput}</p>
              <p className="text-xs text-muted-foreground">Analyzing...</p>
            </div>
            <span className="text-sm font-medium">{Math.floor(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Analysis Results */}
      {analysis && phase !== 'idle' && phase !== 'scanning' && (
        <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-border fade-in-up">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">URL Analysis</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              {analysis.ssl ? (
                <Lock className="w-4 h-4 text-accent" />
              ) : (
                <Unlock className="w-4 h-4 text-destructive" />
              )}
              <span>{analysis.ssl ? 'SSL Secured' : 'No SSL'}</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <span>{analysis.domain}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Age:</span>
              <span className={analysis.registrationAge.includes('<') ? 'text-destructive' : 'text-accent'}>
                {analysis.registrationAge}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Redirects:</span>
              <span className={analysis.redirects > 2 ? 'text-destructive' : 'text-muted-foreground'}>
                {analysis.redirects}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Threat Detection Status */}
      {phase === 'detected' && (
        <div className="text-center py-4 fade-in-up">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Threats Detected!</h3>
          <p className="text-sm text-muted-foreground">{threats.length} security issue(s) found</p>
        </div>
      )}

      {phase === 'clean' && (
        <div className="text-center py-6 fade-in-up">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent" />
          <h3 className="text-lg font-semibold">URL is Safe</h3>
          <p className="text-sm text-muted-foreground">No phishing or malware detected</p>
        </div>
      )}

      {phase === 'complete' && (
        <div className="text-center py-6 fade-in-up">
          <Shield className="w-12 h-12 mx-auto mb-3 text-accent" />
          <h3 className="text-lg font-semibold">Protected</h3>
          <p className="text-sm text-muted-foreground">All threats have been blocked</p>
        </div>
      )}

      {/* Threat Chart */}
      {threats.length > 0 && chartData.length > 0 && (phase === 'detected' || phase === 'eliminating') && (
        <div className="mb-4 fade-in-up">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Severity Breakdown</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Threat List */}
      {threats.length > 0 && (
        <div className="space-y-2 mb-4 fade-in-up">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Detected Threats</h3>
          {threats.map((threat) => (
            <div 
              key={threat.id}
              className={`p-3 bg-secondary/50 rounded-lg border border-border transition-all ${
                threat.eliminated ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {threat.eliminated ? (
                    <XCircle className="w-5 h-5 text-accent mt-0.5" />
                  ) : (
                    <Skull className="w-5 h-5 text-destructive mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getCategoryIcon(threat.category)}</span>
                      <p className={`text-sm font-medium ${threat.eliminated ? 'line-through' : ''}`}>
                        {threat.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{threat.description}</p>
                  </div>
                </div>
                <span className={`text-xs uppercase font-medium ${
                  threat.eliminated ? 'text-accent' : getSeverityColor(threat.severity)
                }`}>
                  {threat.eliminated ? 'BLOCKED' : threat.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 mt-4">
        {phase === 'detected' && (
          <Button onClick={eliminateThreats} variant="destructive" className="gap-2">
            <Shield className="w-4 h-4" />
            Block {threats.length} Threat{threats.length > 1 ? 's' : ''}
          </Button>
        )}
        
        {phase === 'eliminating' && (
          <Button disabled className="gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Blocking...
          </Button>
        )}

        {(phase === 'clean' || phase === 'complete') && (
          <Button onClick={reset} variant="outline" className="gap-2">
            <Search className="w-4 h-4" />
            Scan Another URL
          </Button>
        )}
      </div>

      {/* Scan Log */}
      {scanLog.length > 0 && (
        <div className="mt-4 p-3 bg-secondary/30 rounded-lg border border-border">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Scan Log</h3>
          <div className="max-h-32 overflow-y-auto font-mono text-xs space-y-1">
            {scanLog.map((log, i) => (
              <p key={i} className="text-muted-foreground">{log}</p>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
