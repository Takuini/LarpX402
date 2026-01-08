-- Create scan_history table
CREATE TABLE public.scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  scan_type text NOT NULL CHECK (scan_type IN ('file', 'url', 'browser')),
  target text NOT NULL,
  threats_found integer NOT NULL DEFAULT 0,
  threats_blocked integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('clean', 'protected', 'warning'))
);

-- Enable RLS
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view scan history (public app without auth)
CREATE POLICY "Anyone can view scan history"
ON public.scan_history
FOR SELECT
USING (true);

-- Anyone can insert scan history
CREATE POLICY "Anyone can insert scan history"
ON public.scan_history
FOR INSERT
WITH CHECK (true);

-- Anyone can delete scan history
CREATE POLICY "Anyone can delete scan history"
ON public.scan_history
FOR DELETE
USING (true);