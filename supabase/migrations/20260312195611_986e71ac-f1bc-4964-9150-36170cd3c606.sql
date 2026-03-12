-- Fix admin offer creation failures by aligning DB constraints with current UI actions/types
ALTER TABLE public.offers_contests
DROP CONSTRAINT IF EXISTS offers_contests_required_task_check;

ALTER TABLE public.offers_contests
ADD CONSTRAINT offers_contests_required_task_check
CHECK (
  required_task = ANY (
    ARRAY[
      'share_app'::text,
      'invite_friends'::text,
      'share_facebook'::text,
      'share_telegram'::text,
      'share_whatsapp'::text,
      'activate_offer'::text,
      'custom'::text
    ]
  )
);

ALTER TABLE public.offers_contests
DROP CONSTRAINT IF EXISTS offers_contests_reward_type_check;

ALTER TABLE public.offers_contests
ADD CONSTRAINT offers_contests_reward_type_check
CHECK (
  reward_type = ANY (
    ARRAY[
      'balance'::text,
      'points'::text,
      'feature'::text,
      'discount'::text,
      'package_discount'::text
    ]
  )
);