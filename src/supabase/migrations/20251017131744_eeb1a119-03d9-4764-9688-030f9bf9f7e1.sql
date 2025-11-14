-- Fix orphaned reflections by creating missing sessions and marking them completed
DO $$
DECLARE
    reflection_rec RECORD;
    new_session_id UUID;
    challenge_points INT;
BEGIN
    -- Loop through all reflections that don't have a session_id
    FOR reflection_rec IN 
        SELECT ucr.id as reflection_id, ucr.user_id, ucr.challenge_id, ucr.created_at, c.points
        FROM public.user_challenge_reflections ucr
        LEFT JOIN public.challenges c ON c.id = ucr.challenge_id
        WHERE ucr.session_id IS NULL
    LOOP
        -- Create a session for this reflection
        INSERT INTO public.user_challenge_sessions (
            user_id, 
            challenge_id, 
            started_at, 
            completed_at, 
            is_active, 
            points_awarded
        ) VALUES (
            reflection_rec.user_id,
            reflection_rec.challenge_id,
            reflection_rec.created_at - INTERVAL '5 minutes', -- started 5 min before reflection
            reflection_rec.created_at, -- completed when reflection was made
            false, -- not active since it's completed
            COALESCE(reflection_rec.points, 10) -- award the challenge points
        ) RETURNING id INTO new_session_id;

        -- Link the reflection to the new session
        UPDATE public.user_challenge_reflections 
        SET session_id = new_session_id 
        WHERE id = reflection_rec.reflection_id;

        RAISE NOTICE 'Created session % for reflection % (user: %, challenge: %, points: %)', 
            new_session_id, reflection_rec.reflection_id, reflection_rec.user_id, 
            reflection_rec.challenge_id, COALESCE(reflection_rec.points, 10);
    END LOOP;
END $$;

-- Recalculate all user XP totals after fixing orphaned reflections
UPDATE public.user_profiles up
SET total_xp = COALESCE(s.sum_points, 0)
FROM (
    SELECT user_id, SUM(points_awarded) AS sum_points
    FROM public.user_challenge_sessions
    WHERE completed_at IS NOT NULL
    GROUP BY user_id
) s
WHERE up.user_id = s.user_id;

-- Set users with no completions to 0 XP
UPDATE public.user_profiles up
SET total_xp = 0
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_challenge_sessions ucs
    WHERE ucs.user_id = up.user_id AND ucs.completed_at IS NOT NULL
);