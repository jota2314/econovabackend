-- Add manager-only override pricing fields to measurements
alter table if exists public.measurements
  add column if not exists override_closed_cell_price_per_sqft numeric check (override_closed_cell_price_per_sqft is null or override_closed_cell_price_per_sqft >= 0),
  add column if not exists override_open_cell_price_per_sqft numeric check (override_open_cell_price_per_sqft is null or override_open_cell_price_per_sqft >= 0),
  add column if not exists override_set_by uuid references public.users(id),
  add column if not exists override_set_at timestamptz;

comment on column public.measurements.override_closed_cell_price_per_sqft is 'Manager override: closed cell sell price per sqft';
comment on column public.measurements.override_open_cell_price_per_sqft is 'Manager override: open cell sell price per sqft';
comment on column public.measurements.override_set_by is 'User who set the price override';
comment on column public.measurements.override_set_at is 'Timestamp when the price override was set';

