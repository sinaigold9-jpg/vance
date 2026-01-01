-- Add is_active column to daily_codes table
ALTER TABLE public.daily_codes ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Delete all existing auto-generated codes
DELETE FROM public.daily_codes;

-- Insert the 30 new codes (distributed over next 30 days)
INSERT INTO public.daily_codes (code, valid_date, is_active) VALUES
('Xh1&kM48', CURRENT_DATE, true),
('BD45fbmaz80r', CURRENT_DATE + INTERVAL '1 day', true),
('tbh75MMF', CURRENT_DATE + INTERVAL '2 days', true),
('imax', CURRENT_DATE + INTERVAL '3 days', true),
('49h0m3fvGW', CURRENT_DATE + INTERVAL '4 days', true),
('dmmhrw50JR', CURRENT_DATE + INTERVAL '5 days', true),
('GdNAdrC77vhbv11xdsxmkhbo', CURRENT_DATE + INTERVAL '6 days', true),
('12mooctxvFFFhbb', CURRENT_DATE + INTERVAL '7 days', true),
('USWYRIL', CURRENT_DATE + INTERVAL '8 days', true),
('AAyNMAP', CURRENT_DATE + INTERVAL '9 days', true),
('dwWxm', CURRENT_DATE + INTERVAL '10 days', true),
('VMhch0odxc', CURRENT_DATE + INTERVAL '11 days', true),
('MQOqxd165', CURRENT_DATE + INTERVAL '12 days', true),
('00DYANKThuinbvSETUKV', CURRENT_DATE + INTERVAL '13 days', true),
('CKfpkn888vcvvddcALS', CURRENT_DATE + INTERVAL '14 days', true),
('hbblkmmsazxxdszokmfrscy', CURRENT_DATE + INTERVAL '15 days', true),
('38lnbvNFddfNFIli', CURRENT_DATE + INTERVAL '16 days', true),
('hdscnknb78880cxdc', CURRENT_DATE + INTERVAL '17 days', true),
('FvvdHclnpvV00', CURRENT_DATE + INTERVAL '18 days', true),
('KBChcfSXxdbv89', CURRENT_DATE + INTERVAL '19 days', true),
('OOvbCA', CURRENT_DATE + INTERVAL '20 days', true),
('dcrscmicdec70', CURRENT_DATE + INTERVAL '21 days', true),
('101cdx', CURRENT_DATE + INTERVAL '22 days', true),
('zdx75komzg', CURRENT_DATE + INTERVAL '23 days', true),
('gkneazRExx', CURRENT_DATE + INTERVAL '24 days', true),
('KmfxxDSzxOOncd0879fvcx', CURRENT_DATE + INTERVAL '25 days', true),
('Dcx5840fddvvd', CURRENT_DATE + INTERVAL '26 days', true),
('qdsQQdxdnmvGSXJYECR', CURRENT_DATE + INTERVAL '27 days', true),
('hgvlboADec', CURRENT_DATE + INTERVAL '28 days', true),
('gxdxROnOhb', CURRENT_DATE + INTERVAL '29 days', true);