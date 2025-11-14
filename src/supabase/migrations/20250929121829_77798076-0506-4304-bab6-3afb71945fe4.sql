-- Create a table to store legal documents that can be edited by admins
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for legal documents
CREATE POLICY "Anyone can view legal documents" 
ON public.legal_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert legal documents" 
ON public.legal_documents 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update legal documents" 
ON public.legal_documents 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_legal_documents_updated_at
BEFORE UPDATE ON public.legal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default terms and privacy policy
INSERT INTO public.legal_documents (document_type, content) VALUES 
('terms', 'TERMS AND CONDITIONS

Last updated: ' || CURRENT_DATE || '

1. AGREEMENT TO TERMS

By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.

2. USE LICENSE

Permission is granted to use this service for personal, non-commercial use only.

3. USER CONTENT

Users are responsible for all content they post. You retain ownership of your content.

4. PRIVACY

Your privacy is important to us. Please review our Privacy Policy.

5. CONTACT

If you have questions about these Terms, please contact us.'),

('privacy', 'PRIVACY POLICY

Last updated: ' || CURRENT_DATE || '

1. INFORMATION WE COLLECT

We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us.

• Account information (username, email, profile picture)
• Profile information (bio, interests, display name)
• Content you create (posts, comments, challenge submissions)
• Usage data and analytics

2. HOW WE USE YOUR INFORMATION

We use the information we collect to:

• Provide, maintain, and improve our services
• Personalize your experience
• Communicate with you about the service
• Monitor and analyze usage patterns
• Ensure security and prevent fraud

3. INFORMATION SHARING

We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this policy:

• With your consent
• To comply with legal obligations
• To protect our rights and safety
• In connection with a business transfer

4. DATA SECURITY

We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.

5. DATA RETENTION

We retain your information for as long as your account is active or as needed to provide you services. You may request deletion of your account and personal data at any time.

6. YOUR RIGHTS

You have the right to:

• Access and update your personal information
• Request deletion of your account and data
• Opt out of certain communications
• Control your privacy settings

7. COOKIES AND TRACKING

We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.

8. CHILDREN''S PRIVACY

Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.

9. CHANGES TO THIS POLICY

We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date.

10. CONTACT US

If you have any questions about this Privacy Policy, please contact us through the application.');