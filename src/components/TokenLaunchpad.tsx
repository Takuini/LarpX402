import { useState, useRef, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Rocket, Upload, ExternalLink, Loader2, AlertCircle, CheckCircle, Skull, Plus, X, Users, Wallet, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Constants for token allocation estimation
const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens
const INITIAL_VIRTUAL_SOL = 30; // Bags bonding curve virtual SOL reserve

interface VirusThreatData {
  name: string;
  symbol: string;
  description: string;
  logoUrl?: string;
  severity: string;
}

interface TokenLaunchpadProps {
  virusThreat?: VirusThreatData;
}

interface LaunchFormData {
  name: string;
  symbol: string;
  description: string;
  twitter: string;
  telegram: string;
  website: string;
}

interface FeeClaimer {
  provider: 'twitter' | 'kick' | 'github';
  username: string;
  bps: number;
}

type LaunchStatus = 'idle' | 'uploading' | 'creating' | 'signing' | 'signing-config' | 'signing-launch' | 'confirming' | 'saving' | 'success' | 'error';

export default function TokenLaunchpad({ virusThreat }: TokenLaunchpadProps) {
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<LaunchFormData>({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [virusImageUsed, setVirusImageUsed] = useState(false);
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [signingStep, setSigningStep] = useState<number>(0); // 0=none, 1=config1, 2=config2, 3=launch
  const [error, setError] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');
  const [mintAddress, setMintAddress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Wallet balance
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  
  // Initial buy amount
  const [initialBuyEnabled, setInitialBuyEnabled] = useState(false);
  const [initialBuyAmount, setInitialBuyAmount] = useState('0.1');
  
  // Fee sharing
  const [feeShareEnabled, setFeeShareEnabled] = useState(false);
  const [feeClaimers, setFeeClaimers] = useState<FeeClaimer[]>([]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connection) {
        try {
          const balance = await connection.getBalance(publicKey);
          setWalletBalance(balance / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error('Error fetching balance:', err);
          setWalletBalance(null);
        }
      } else {
        setWalletBalance(null);
      }
    };
    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  // Pre-fill form when virus threat data is passed
  useEffect(() => {
    if (virusThreat) {
      setFormData({
        name: virusThreat.name,
        symbol: virusThreat.symbol,
        description: virusThreat.description,
        twitter: '',
        telegram: '',
        website: '',
      });
      if (virusThreat.logoUrl) {
        setImagePreview(virusThreat.logoUrl);
        setVirusImageUsed(true);
        // Convert base64 to file
        fetch(virusThreat.logoUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'virus-logo.png', { type: 'image/png' });
            setImageFile(file);
          });
      }
    }
  }, [virusThreat]);

  // Estimate token allocation based on initial buy (simple bonding curve approximation)
  const estimateTokenAllocation = (solAmount: number): number => {
    if (solAmount <= 0) return 0;
    // Using constant product formula: tokens = supply * (1 - (virtualSol / (virtualSol + buyAmount)))
    const tokensReceived = TOTAL_SUPPLY * (solAmount / (INITIAL_VIRTUAL_SOL + solAmount));
    return tokensReceived;
  };

  const formatTokenAmount = (amount: number): string => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
    return amount.toFixed(0);
  };

  const getEstimatedPercentage = (tokens: number): string => {
    return ((tokens / TOTAL_SUPPLY) * 100).toFixed(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addFeeClaimer = () => {
    if (feeClaimers.length >= 10) return;
    setFeeClaimers([...feeClaimers, { provider: 'twitter', username: '', bps: 1000 }]);
  };

  const removeFeeClaimer = (index: number) => {
    setFeeClaimers(feeClaimers.filter((_, i) => i !== index));
  };

  const updateFeeClaimer = (index: number, field: keyof FeeClaimer, value: string | number) => {
    const updated = [...feeClaimers];
    if (field === 'bps') {
      updated[index][field] = Math.min(Math.max(0, Number(value)), 9900);
    } else {
      updated[index][field] = value as any;
    }
    setFeeClaimers(updated);
  };

  const getTotalFeeClaimerBps = () => feeClaimers.reduce((sum, fc) => sum + fc.bps, 0);
  const getCreatorBps = () => 10000 - getTotalFeeClaimerBps();
  const launchToken = async () => {
    if (!publicKey || !signTransaction || !sendTransaction || !imageFile) {
      setError('Please connect wallet and upload an image');
      return;
    }

    if (!formData.name || !formData.symbol || !formData.description) {
      setError('Please fill in name, symbol, and description');
      return;
    }

    // Validate fee claimers
    if (feeShareEnabled && feeClaimers.length > 0) {
      const invalidClaimer = feeClaimers.find(fc => !fc.username.trim());
      if (invalidClaimer) {
        setError('Please fill in all fee claimer usernames');
        return;
      }
      if (getCreatorBps() < 100) {
        setError('Creator must receive at least 1% (100 bps)');
        return;
      }
    }

    // Validate initial buy amount
    const buyAmountSol = initialBuyEnabled ? parseFloat(initialBuyAmount) : 0;
    if (initialBuyEnabled && (isNaN(buyAmountSol) || buyAmountSol < 0 || buyAmountSol > 10)) {
      setError('Initial buy amount must be between 0 and 10 SOL');
      return;
    }

    setStatus('uploading');
    setError('');

    try {
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(imageFile);
      });

      setStatus('creating');
      
      // Build fee claimers payload
      const feeClaimersPayload = feeShareEnabled && feeClaimers.length > 0 
        ? feeClaimers.map(fc => ({
            provider: fc.provider,
            username: fc.username.trim().replace('@', ''),
            bps: fc.bps,
          }))
        : undefined;

      // Call Bags API edge function
      const { data, error: fnError } = await supabase.functions.invoke('create-bags-token', {
        body: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
          imageBase64,
          imageType: imageFile.type,
          creatorPublicKey: publicKey.toBase58(),
          initialBuyLamports: buyAmountSol > 0 ? Math.floor(buyAmountSol * LAMPORTS_PER_SOL) : 0,
          feeClaimers: feeClaimersPayload,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      setStatus('signing-config');
      setSigningStep(1);
      
      const bs58 = await import('bs58');
      let launchSignature: string;
      
      // Handle two-step flow: config transactions first, then launch
      if (data.step === 'config' && data.configTransactions?.length > 0) {
        // Sign and send config transactions first
        for (let i = 0; i < data.configTransactions.length; i++) {
          setSigningStep(i + 1); // 1 or 2
          // Config transactions may be objects with {transaction, blockhash} or plain strings
          const txData = data.configTransactions[i];
          const txString = typeof txData === 'string' ? txData : txData.transaction;
          const configTxBytes = bs58.default.decode(txString);
          const configTx = VersionedTransaction.deserialize(configTxBytes);
          const signedConfigTx = await signTransaction(configTx);
          
          setStatus('confirming');
          const configSig = await connection.sendRawTransaction(signedConfigTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          await connection.confirmTransaction(configSig, 'confirmed');
          setStatus('signing-config');
        }
        
        // Now get the launch transaction
        setStatus('creating');
        const { data: launchData, error: launchFnError } = await supabase.functions.invoke('get-launch-transaction', {
          body: {
            tokenMint: data.tokenMint,
            metadataUri: data.metadataUri,
            configKey: data.configKey,
            creatorPublicKey: publicKey.toBase58(),
            initialBuyLamports: buyAmountSol > 0 ? Math.floor(buyAmountSol * LAMPORTS_PER_SOL) : 0,
          },
        });
        
        if (launchFnError) throw new Error(launchFnError.message);
        if (launchData.error) throw new Error(launchData.error);
        
        setSigningStep(3);
        setStatus('signing-launch');
        const launchTxBytes = bs58.default.decode(launchData.transaction);
        const launchTx = VersionedTransaction.deserialize(launchTxBytes);
        const signedLaunchTx = await signTransaction(launchTx);
        
        setStatus('confirming');
        launchSignature = await connection.sendRawTransaction(signedLaunchTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        await connection.confirmTransaction(launchSignature, 'confirmed');
        
      } else {
        // Single-step flow: just sign the launch transaction
        setSigningStep(3);
        setStatus('signing-launch');
        const txBytes = bs58.default.decode(data.transaction);
        const transaction = VersionedTransaction.deserialize(txBytes);
        const signedTx = await signTransaction(transaction);
        
        setStatus('confirming');
        launchSignature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        await connection.confirmTransaction(launchSignature, 'confirmed');
      }

      setStatus('saving');
      
      await supabase.functions.invoke('save-launched-token', {
        body: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          imageUrl: data.imageUrl || null,
          mintAddress: data.tokenMint,
          creatorAddress: publicKey.toBase58(),
          txSignature: launchSignature,
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
        },
      });

      setTxSignature(launchSignature);
      setMintAddress(data.tokenMint);
      setStatus('success');
      
    } catch (err: any) {
      console.error('Launch error:', err);
      setError(err.message || 'Failed to launch token');
      setStatus('error');
    }
  };

  const reset = () => {
    setFormData({
      name: '',
      symbol: '',
      description: '',
      twitter: '',
      telegram: '',
      website: '',
    });
    setImageFile(null);
    setImagePreview('');
    setStatus('idle');
    setSigningStep(0);
    setError('');
    setTxSignature('');
    setMintAddress('');
    setInitialBuyEnabled(false);
    setInitialBuyAmount('0.1');
    setFeeShareEnabled(false);
    setFeeClaimers([]);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'uploading': return 'Uploading image...';
      case 'creating': return 'Creating on Bags...';
      case 'signing': return 'Sign in wallet...';
      case 'signing-config': return `Sign config tx ${signingStep}/2...`;
      case 'signing-launch': return 'Sign launch transaction...';
      case 'confirming': return 'Confirming on chain...';
      case 'saving': return 'Saving to gallery...';
      default: return null;
    }
  };

  // Signing stepper component
  const SigningStepper = () => {
    if (signingStep === 0) return null;
    
    const steps = [
      { label: 'Config 1', step: 1 },
      { label: 'Config 2', step: 2 },
      { label: 'Launch', step: 3 },
    ];

    return (
      <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          {steps.map((s, idx) => (
            <div key={s.step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                ${signingStep > s.step 
                  ? 'bg-accent text-accent-foreground' 
                  : signingStep === s.step 
                    ? 'bg-primary text-primary-foreground animate-pulse' 
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {signingStep > s.step ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  s.step
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`
                  w-8 sm:w-12 h-0.5 mx-1
                  ${signingStep > s.step ? 'bg-accent' : 'bg-muted'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((s) => (
            <span key={s.step} className={signingStep === s.step ? 'text-primary font-medium' : ''}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">
            {virusThreat ? '🦠 Deploy Virus Token' : 'Launch Token'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {virusThreat ? 'Deploy captured malware on Bags' : 'Deploy via Bags'}
          </p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="fade-in-up text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-accent" />
          <h3 className="text-lg font-semibold mb-1">Token Launched!</h3>
          <p className="text-sm text-muted-foreground mb-6">Your token is now live on Bags</p>
          
          <div className="space-y-3 mb-6 text-left">
            <div className="p-3 bg-secondary rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Mint Address</p>
              <code className="text-xs break-all">{mintAddress}</code>
            </div>
            <div className="p-3 bg-secondary rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Transaction</p>
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                View on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href={`https://bags.fm/${mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Rocket className="w-4 h-4 mr-2" />
                View on Bags
              </Button>
            </a>
            <Button variant="outline" onClick={reset} className="flex-1">
              Launch Another
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label className="text-xs text-muted-foreground">Token Image</Label>
            <div 
              className={`mt-1.5 border border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                virusImageUsed ? 'border-purple-500/50 bg-purple-500/10' : 'border-border hover:border-accent/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Token" className="w-16 h-16 mx-auto object-cover rounded-md" />
                  {virusImageUsed && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs text-purple-400">
                      <Skull className="w-3 h-3" />
                      AI Generated Virus Logo
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name & Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Token Name"
                className="mt-1.5 bg-secondary border-border"
                maxLength={32}
              />
            </div>
            <div>
              <Label htmlFor="symbol" className="text-xs text-muted-foreground">Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="SYMBOL"
                className="mt-1.5 bg-secondary border-border uppercase"
                maxLength={10}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your token..."
              className="mt-1.5 bg-secondary border-border min-h-[70px]"
              maxLength={500}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Social Links (optional)</Label>
            <div className="grid grid-cols-1 gap-2">
              <Input
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                placeholder="Twitter URL"
                className="bg-secondary border-border text-sm"
              />
              <Input
                name="telegram"
                value={formData.telegram}
                onChange={handleInputChange}
                placeholder="Telegram URL"
                className="bg-secondary border-border text-sm"
              />
              <Input
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="Website URL"
                className="bg-secondary border-border text-sm"
              />
            </div>
          </div>

          {/* Initial Buy Amount */}
          <div className="space-y-3 p-3 bg-secondary/50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-accent" />
                <Label className="text-xs font-medium">Initial Buy</Label>
              </div>
              <Switch
                checked={initialBuyEnabled}
                onCheckedChange={setInitialBuyEnabled}
              />
            </div>
            {initialBuyEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={initialBuyAmount}
                    onChange={(e) => setInitialBuyAmount(e.target.value)}
                    placeholder="0.1"
                    className="bg-background border-border text-sm w-24"
                    min="0"
                    max="10"
                    step="0.01"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">SOL</span>
                  {walletBalance !== null && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          const maxAmount = Math.min(Math.max(walletBalance - 0.01, 0), 10);
                          setInitialBuyAmount(maxAmount.toFixed(3));
                        }}
                      >
                        Max
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                        <Wallet className="w-3 h-3" />
                        <span>{walletBalance.toFixed(3)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Preset Amounts */}
                <div className="flex gap-2">
                  {[0.5, 1, 2, 5].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className={`flex-1 h-7 text-xs ${
                        parseFloat(initialBuyAmount) === amount 
                          ? 'bg-accent text-accent-foreground border-accent' 
                          : ''
                      }`}
                      onClick={() => setInitialBuyAmount(amount.toString())}
                    >
                      {amount} SOL
                    </Button>
                  ))}
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <Slider
                    value={[Math.min(parseFloat(initialBuyAmount) || 0, 10)]}
                    onValueChange={(value) => setInitialBuyAmount(value[0].toFixed(2))}
                    max={10}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0 SOL</span>
                    <span>5 SOL</span>
                    <span>10 SOL</span>
                  </div>
                </div>

                {/* Low Balance Warning */}
                {walletBalance !== null && parseFloat(initialBuyAmount) > walletBalance * 0.8 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-500">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs">
                      {parseFloat(initialBuyAmount) > walletBalance 
                        ? 'Amount exceeds wallet balance'
                        : 'Using over 80% of your balance. Keep some SOL for fees.'}
                    </p>
                  </div>
                )}
                
                {/* Token Allocation Preview */}
                {parseFloat(initialBuyAmount) > 0 && (
                  <div className="p-3 bg-background rounded-md border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-accent" />
                      <span className="text-xs font-medium">Estimated Allocation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Tokens</p>
                        <p className="text-sm font-semibold text-accent">
                          ~{formatTokenAmount(estimateTokenAllocation(parseFloat(initialBuyAmount) || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Supply %</p>
                        <p className="text-sm font-semibold">
                          ~{getEstimatedPercentage(estimateTokenAllocation(parseFloat(initialBuyAmount) || 0))}%
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      *Estimates based on bonding curve. Actual may vary.
                    </p>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Buy tokens with your own SOL on launch
            </p>
          </div>

          {/* Fee Sharing */}
          <div className="space-y-3 p-3 bg-secondary/50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <Label className="text-xs font-medium">Fee Sharing</Label>
              </div>
              <Switch
                checked={feeShareEnabled}
                onCheckedChange={setFeeShareEnabled}
              />
            </div>
            
            {feeShareEnabled && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Share trading fees with partners. You receive: <span className="text-accent font-medium">{(getCreatorBps() / 100).toFixed(1)}%</span>
                </p>
                
                {feeClaimers.map((claimer, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={claimer.provider}
                      onChange={(e) => updateFeeClaimer(index, 'provider', e.target.value)}
                      className="bg-background border border-border rounded-md px-2 py-1.5 text-xs"
                    >
                      <option value="twitter">Twitter</option>
                      <option value="kick">Kick</option>
                      <option value="github">GitHub</option>
                    </select>
                    <Input
                      value={claimer.username}
                      onChange={(e) => updateFeeClaimer(index, 'username', e.target.value)}
                      placeholder="@username"
                      className="bg-background border-border text-xs flex-1"
                      maxLength={50}
                    />
                    <Input
                      type="number"
                      value={claimer.bps / 100}
                      onChange={(e) => updateFeeClaimer(index, 'bps', parseFloat(e.target.value) * 100)}
                      className="bg-background border-border text-xs w-16"
                      min="0"
                      max="99"
                      step="0.5"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeFeeClaimer(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                
                {feeClaimers.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFeeClaimer}
                    className="w-full text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Partner
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Launch Button */}
          <LaunchConfirmDialog
            formData={formData}
            initialBuyEnabled={initialBuyEnabled}
            initialBuyAmount={initialBuyAmount}
            onConfirm={launchToken}
            disabled={!connected || (status !== 'idle' && status !== 'error')}
            isLoading={status !== 'idle' && status !== 'error'}
            statusMessage={getStatusMessage()}
            connected={connected}
            signingStepperElement={<SigningStepper />}
          />
        </div>
      )}
    </div>
  );
}

// Confirmation Dialog Component
interface LaunchConfirmDialogProps {
  formData: { name: string; symbol: string };
  initialBuyEnabled: boolean;
  initialBuyAmount: string;
  onConfirm: () => void;
  disabled: boolean;
  isLoading: boolean;
  statusMessage: string | null;
  connected: boolean;
  signingStepperElement: React.ReactNode;
}

function LaunchConfirmDialog({
  formData,
  initialBuyEnabled,
  initialBuyAmount,
  onConfirm,
  disabled,
  isLoading,
  statusMessage,
  connected,
  signingStepperElement,
}: LaunchConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  const handleLaunchClick = () => {
    if (!connected) return;
    setOpen(true);
  };

  const handleConfirm = () => {
    setOpen(false);
    onConfirm();
  };

  const buyAmount = parseFloat(initialBuyAmount) || 0;

  return (
    <>
      {/* Show stepper when signing is in progress */}
      {isLoading && signingStepperElement}
      
      <Button
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        onClick={handleLaunchClick}
        disabled={disabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {statusMessage}
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4 mr-2" />
            {connected ? 'Launch Token' : 'Connect Wallet'}
          </>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-accent" />
              Confirm Token Launch
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to launch a new token on Bags:</p>
                <div className="p-3 bg-secondary rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{formData.name || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="font-medium text-foreground">{formData.symbol || 'Not set'}</span>
                  </div>
                  {initialBuyEnabled && buyAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial Buy</span>
                      <span className="font-medium text-accent">{buyAmount} SOL</span>
                    </div>
                  )}
                </div>
                {initialBuyEnabled && buyAmount >= 1 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-500">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs">Large initial buy detected. Make sure you want to spend {buyAmount} SOL.</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">This action cannot be undone. The token will be created on-chain.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Confirm Launch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
