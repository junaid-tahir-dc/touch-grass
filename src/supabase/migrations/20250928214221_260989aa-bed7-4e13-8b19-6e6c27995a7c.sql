-- Add follower and following counts to user_profiles if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'follower_count') THEN
        ALTER TABLE public.user_profiles ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'following_count') THEN
        ALTER TABLE public.user_profiles ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;