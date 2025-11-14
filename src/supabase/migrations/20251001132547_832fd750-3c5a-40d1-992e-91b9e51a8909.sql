-- Create table for storing user reflection responses
CREATE TABLE public.user_challenge_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  session_id UUID REFERENCES public.user_challenge_sessions(id) ON DELETE CASCADE,
  reflections JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_challenge_reflections ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own reflections"
ON public.user_challenge_reflections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reflections"
ON public.user_challenge_reflections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
ON public.user_challenge_reflections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
ON public.user_challenge_reflections
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_challenge_reflections_updated_at
BEFORE UPDATE ON public.user_challenge_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_user_challenge_reflections_user_id ON public.user_challenge_reflections(user_id);
CREATE INDEX idx_user_challenge_reflections_challenge_id ON public.user_challenge_reflections(challenge_id);