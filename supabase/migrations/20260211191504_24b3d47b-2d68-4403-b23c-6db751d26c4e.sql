
-- Add share_token and slug to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slug from title for tasks using existing generate_slug function
CREATE OR REPLACE FUNCTION public.generate_task_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title) THEN
    base_slug := public.generate_slug(NEW.title);
    
    -- Add short unique suffix from share_token
    final_slug := base_slug || '-' || left(COALESCE(NEW.share_token, gen_random_uuid()::text), 7);
    
    -- Check for uniqueness
    WHILE EXISTS (SELECT 1 FROM public.tasks WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || left(COALESCE(NEW.share_token, gen_random_uuid()::text), 7) || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_task_slug
BEFORE INSERT OR UPDATE OF title ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.generate_task_slug();

-- Generate slugs for existing tasks by re-triggering
UPDATE public.tasks SET title = title WHERE slug IS NULL;
