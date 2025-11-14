-- Add admin role to the current user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('cdad0dea-011f-4016-8305-280fb1b69831', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;