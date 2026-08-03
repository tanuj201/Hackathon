-- CogniDrive v2: Auth, billing, usage metering
-- Run AFTER schema.sql in Supabase SQL Editor

-- Profiles linked to Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'pro_plus')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly usage counters
CREATE TABLE IF NOT EXISTS usage_monthly (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  chat_count INT NOT NULL DEFAULT 0,
  studio_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month_key)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Replace demo RLS with per-user policies
DROP POLICY IF EXISTS "Allow all for demo" ON files;
DROP POLICY IF EXISTS "Allow all for demo" ON document_chunks;

CREATE POLICY "Users read own files" ON files
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users insert own files" ON files
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users update own files" ON files
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users delete own files" ON files
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users read own chunks" ON document_chunks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM files f WHERE f.id = document_chunks.file_id AND f.user_id = auth.uid()::text)
  );

CREATE POLICY "Users insert own chunks" ON document_chunks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM files f WHERE f.id = document_chunks.file_id AND f.user_id = auth.uid()::text)
  );

CREATE POLICY "Users delete own chunks" ON document_chunks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM files f WHERE f.id = document_chunks.file_id AND f.user_id = auth.uid()::text)
  );

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON usage_monthly
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS for webhooks
