INSERT INTO public.roles (id, nombre)
SELECT COALESCE((SELECT MAX(id) FROM public.roles), 0) + 1, 'PLANILLA'
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE upper(trim(nombre)) = 'PLANILLA'
);
