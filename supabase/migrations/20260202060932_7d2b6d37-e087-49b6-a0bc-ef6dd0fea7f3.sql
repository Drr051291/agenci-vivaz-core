-- Add slug columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add slug columns to meeting_minutes table
ALTER TABLE public.meeting_minutes 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for meeting slugs scoped to client
CREATE UNIQUE INDEX IF NOT EXISTS meeting_minutes_client_slug_idx 
ON public.meeting_minutes (client_id, slug);

-- Create function to generate slug from text
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Convert to lowercase
  result := lower(input_text);
  -- Replace accented characters
  result := translate(result, 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiioooooouuuucn');
  -- Replace spaces and special chars with hyphens
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  result := trim(both '-' from result);
  -- Limit length
  result := left(result, 100);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create function to generate unique client slug
CREATE OR REPLACE FUNCTION public.generate_client_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug(NEW.company_name);
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.clients WHERE slug = new_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create function to generate unique meeting slug with date
CREATE OR REPLACE FUNCTION public.generate_meeting_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  date_suffix TEXT;
  new_slug TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug(NEW.title);
    date_suffix := to_char(NEW.meeting_date::date, 'mon-YYYY');
    new_slug := base_slug || '-' || date_suffix;
    
    -- Check for duplicates within same client
    IF EXISTS (SELECT 1 FROM public.meeting_minutes WHERE client_id = NEW.client_id AND slug = new_slug AND id != NEW.id) THEN
      new_slug := new_slug || '-' || left(NEW.id::text, 6);
    END IF;
    
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS generate_client_slug_trigger ON public.clients;
CREATE TRIGGER generate_client_slug_trigger
BEFORE INSERT OR UPDATE OF company_name ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_slug();

DROP TRIGGER IF EXISTS generate_meeting_slug_trigger ON public.meeting_minutes;
CREATE TRIGGER generate_meeting_slug_trigger
BEFORE INSERT OR UPDATE OF title, meeting_date ON public.meeting_minutes
FOR EACH ROW
EXECUTE FUNCTION public.generate_meeting_slug();

-- Populate existing slugs for clients
UPDATE public.clients SET slug = NULL WHERE slug IS NULL;

-- Populate existing slugs for meetings
UPDATE public.meeting_minutes SET slug = NULL WHERE slug IS NULL;