-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message_id TEXT UNIQUE NOT NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'gmail',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Policies for accounts
CREATE POLICY "Users can manage their own accounts" 
ON accounts FOR ALL 
USING (auth.uid() = user_id);

-- Policies for emails
CREATE POLICY "Users can view emails for their accounts" 
ON emails FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM accounts 
  WHERE accounts.id = emails.account_id 
  AND accounts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own emails" 
ON emails FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM accounts 
  WHERE accounts.id = emails.account_id 
  AND accounts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own emails" 
ON emails FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM accounts 
  WHERE accounts.id = emails.account_id 
  AND accounts.user_id = auth.uid()
));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE emails;
