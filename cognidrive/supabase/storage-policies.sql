-- CogniDrive Supabase Storage Setup
-- Run AFTER creating bucket "cognidrive-files" in Supabase Dashboard → Storage → New bucket
-- Or create bucket via SQL (Supabase may require dashboard for some projects):

-- INSERT INTO storage.buckets (id, name, public) VALUES ('cognidrive-files', 'cognidrive-files', false);

-- Allow service role full access (automatic). For anon key uploads via API with service role, no extra policy needed.
-- If using anon key directly from client, add these policies:

CREATE POLICY "Allow public read cognidrive files"
ON storage.objects FOR SELECT
USING (bucket_id = 'cognidrive-files');

CREATE POLICY "Allow public upload cognidrive files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cognidrive-files');

CREATE POLICY "Allow public delete cognidrive files"
ON storage.objects FOR DELETE
USING (bucket_id = 'cognidrive-files');
