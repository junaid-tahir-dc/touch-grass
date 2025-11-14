-- Insert initial community guidelines document if it doesn't exist
INSERT INTO public.legal_documents (document_type, content, updated_by)
SELECT 
  'community_guidelines'::text,
  'Welcome to the Touch Grass Community!

Our community is built on respect, inclusivity, and mutual support. By participating, you agree to:

1. BE RESPECTFUL
   - Treat all members with kindness and respect
   - Be open to different perspectives and experiences
   - Use inclusive language and be mindful of diverse backgrounds

2. SHARE AUTHENTICALLY
   - Share your genuine experiences and progress
   - Be honest about your challenges and successes
   - Encourage and support others in their journey

3. KEEP IT POSITIVE
   - Focus on constructive feedback and encouragement
   - Avoid negative criticism or judgment of others
   - Celebrate wins, both big and small

4. STAY SAFE
   - Do not share personal information (addresses, phone numbers)
   - Report any inappropriate behavior or content
   - Follow challenge safety guidelines

5. NO HARASSMENT OR ABUSE
   - Zero tolerance for bullying, harassment, or hate speech
   - Respect people''s privacy and boundaries
   - Do not spam or engage in promotional activities

6. KEEP CONTENT APPROPRIATE
   - Share only content you have rights to
   - Keep all content family-friendly
   - No illegal, harmful, or explicit content

Violations of these guidelines may result in content removal, temporary suspension, or permanent ban from the community.

Thank you for helping us build a positive, supportive community!

Last updated: [Date will be automatically updated]'::text,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_documents 
  WHERE document_type = 'community_guidelines'
);