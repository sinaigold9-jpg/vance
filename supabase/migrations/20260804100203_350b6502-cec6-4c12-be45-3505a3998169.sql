
CREATE POLICY "Users upload own verification selfie"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-selfies'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins read verification selfies"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-selfies'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins delete verification selfies"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verification-selfies'
  AND public.has_role(auth.uid(), 'admin')
);
