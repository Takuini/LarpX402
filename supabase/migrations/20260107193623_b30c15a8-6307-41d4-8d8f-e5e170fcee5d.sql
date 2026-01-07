-- Create table for launched tokens
CREATE TABLE public.launched_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  mint_address TEXT NOT NULL UNIQUE,
  creator_address TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  twitter TEXT,
  telegram TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.launched_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view launched tokens (public gallery)
CREATE POLICY "Anyone can view launched tokens"
ON public.launched_tokens
FOR SELECT
USING (true);

-- Allow inserts from edge functions (service role)
CREATE POLICY "Service role can insert tokens"
ON public.launched_tokens
FOR INSERT
WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.launched_tokens;