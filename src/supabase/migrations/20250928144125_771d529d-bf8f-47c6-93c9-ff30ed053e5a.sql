-- Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT NOT NULL CHECK (category IN ('adulting', 'mindset', 'social', 'outdoors', 'local', 'creative', 'collab')),
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  points INTEGER NOT NULL DEFAULT 10,
  materials TEXT[],
  safety_note TEXT,
  fun_enhancements TEXT[],
  reflection_questions TEXT[],
  image_url TEXT,
  author_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for challenges
CREATE POLICY "Challenges are viewable by everyone"
ON public.challenges
FOR SELECT
USING (true);

CREATE POLICY "Only admins can create challenges" 
ON public.challenges 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update challenges" 
ON public.challenges 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete challenges" 
ON public.challenges 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create trigger for updating updated_at column
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample challenges
INSERT INTO public.challenges (title, description, difficulty, category, duration_minutes, points, materials, reflection_questions)
VALUES 
  (
    'Kidlin''s Law', 
    'Write down a problem that''s been bothering you. Break it into specific, actionable steps.',
    'easy',
    'mindset',
    15,
    20,
    ARRAY['pen', 'paper or phone notes'],
    ARRAY[
      'How did breaking down the problem change your perspective?',
      'Which step feels most manageable to start with?',
      'What surprised you about this exercise?'
    ]
  ),
  (
    'Sobremesa',
    'Stay at the table after a meal. No phones, just conversation and presence with whoever you''re with.',
    'easy',
    'social',
    20,
    25,
    ARRAY['a meal', 'company (or just yourself)'],
    ARRAY[
      'What did you notice when you slowed down?',
      'How did the conversation flow differently?',
      'What would you like to remember from this moment?'
    ]
  ),
  (
    'Neighborhood Hero',
    'Do one small act of service in your neighborhood - pick up litter, help a neighbor, leave a kind note.',
    'medium',
    'local',
    30,
    30,
    ARRAY['depends on chosen act'],
    ARRAY[
      'How did it feel to contribute to your community?',
      'What did you notice about your neighborhood?',
      'How might small acts like this create ripple effects?'
    ]
  )
ON CONFLICT (id) DO NOTHING;