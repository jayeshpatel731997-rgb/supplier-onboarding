create extension if not exists "pgcrypto";

create table if not exists public.buyer_settings (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null unique references auth.users(id) on delete cascade,
  required_documents text[] not null default array['w9','insurance_cert','bank_info'],
  onboarding_deadline_days integer not null default 14 check (onboarding_deadline_days between 1 and 120),
  reminder_days_before_expiry integer[] not null default array[90,60,30,7],
  company_name text not null default '',
  logo_url text,
  subscription_status text not null default 'free' check (subscription_status in ('free','pro')),
  subscription_expires_at timestamptz,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  website text,
  status text not null default 'invited' check (status in ('invited','in_progress','complete','expired')),
  onboarding_token uuid not null unique default gen_random_uuid(),
  token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.supplier_info (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null unique references public.suppliers(id) on delete cascade,
  tax_id text not null,
  business_type text not null check (business_type in ('llc','corporation','sole_proprietor','partnership')),
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  country text not null default 'US',
  bank_name text,
  account_type text check (account_type is null or account_type in ('checking','savings')),
  payment_method text not null check (payment_method in ('ach','check','wire')),
  diversity_certifications text[] not null default '{}',
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  ap_email text,
  submitted_at timestamptz
);

create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  document_type text not null check (document_type in ('w9','insurance_cert','bank_info','business_license','questionnaire','iso_cert')),
  file_url text,
  file_name text,
  status text not null default 'pending' check (status in ('pending','uploaded','verified','expired')),
  expiry_date date,
  uploaded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (supplier_id, document_type)
);

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('onboarding','expiry')),
  sent_at timestamptz not null default now(),
  document_type text
);

create index if not exists suppliers_buyer_status_idx on public.suppliers (buyer_id, status);
create index if not exists suppliers_token_idx on public.suppliers (onboarding_token);
create index if not exists supplier_documents_supplier_idx on public.supplier_documents (supplier_id);
create index if not exists supplier_documents_expiry_idx on public.supplier_documents (expiry_date) where expiry_date is not null;
create index if not exists reminder_logs_supplier_type_idx on public.reminder_logs (supplier_id, reminder_type, sent_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_settings_touch_updated_at on public.buyer_settings;
create trigger buyer_settings_touch_updated_at
before update on public.buyer_settings
for each row execute function public.touch_updated_at();

drop trigger if exists suppliers_touch_updated_at on public.suppliers;
create trigger suppliers_touch_updated_at
before update on public.suppliers
for each row execute function public.touch_updated_at();

alter table public.buyer_settings enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_info enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.reminder_logs enable row level security;

drop policy if exists "buyers read own settings" on public.buyer_settings;
create policy "buyers read own settings" on public.buyer_settings
for select using (auth.uid() = buyer_id);

drop policy if exists "buyers insert own settings" on public.buyer_settings;
create policy "buyers insert own settings" on public.buyer_settings
for insert with check (auth.uid() = buyer_id);

drop policy if exists "buyers update own settings" on public.buyer_settings;
create policy "buyers update own settings" on public.buyer_settings
for update using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

drop policy if exists "buyers read own suppliers" on public.suppliers;
create policy "buyers read own suppliers" on public.suppliers
for select using (auth.uid() = buyer_id);

drop policy if exists "buyers insert own suppliers" on public.suppliers;
create policy "buyers insert own suppliers" on public.suppliers
for insert with check (auth.uid() = buyer_id);

drop policy if exists "buyers update own suppliers" on public.suppliers;
create policy "buyers update own suppliers" on public.suppliers
for update using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

drop policy if exists "buyers read supplier info" on public.supplier_info;
create policy "buyers read supplier info" on public.supplier_info
for select using (
  exists (
    select 1 from public.suppliers
    where suppliers.id = supplier_info.supplier_id
    and suppliers.buyer_id = auth.uid()
  )
);

drop policy if exists "buyers read supplier documents" on public.supplier_documents;
create policy "buyers read supplier documents" on public.supplier_documents
for select using (
  exists (
    select 1 from public.suppliers
    where suppliers.id = supplier_documents.supplier_id
    and suppliers.buyer_id = auth.uid()
  )
);

drop policy if exists "buyers read reminder logs" on public.reminder_logs;
create policy "buyers read reminder logs" on public.reminder_logs
for select using (
  exists (
    select 1 from public.suppliers
    where suppliers.id = reminder_logs.supplier_id
    and suppliers.buyer_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-documents', 'supplier-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('buyer-logos', 'buyer-logos', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "buyers read own supplier files" on storage.objects;
create policy "buyers read own supplier files" on storage.objects
for select using (
  bucket_id = 'supplier-documents'
  and exists (
    select 1 from public.suppliers
    where suppliers.buyer_id = auth.uid()
    and storage.foldername(storage.objects.name)[1] = suppliers.id::text
  )
);

drop policy if exists "buyers manage own logos" on storage.objects;
create policy "buyers manage own logos" on storage.objects
for all using (
  bucket_id = 'buyer-logos'
  and storage.foldername(storage.objects.name)[1] = auth.uid()::text
) with check (
  bucket_id = 'buyer-logos'
  and storage.foldername(storage.objects.name)[1] = auth.uid()::text
);
