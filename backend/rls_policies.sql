-- LearnLynk Tech Test - Task 2: RLS Policies on leads

alter table public.leads enable row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
-- You can use: current_setting('request.jwt.claims', true)::jsonb

-- TODO: write a policy so:
-- - counselors see leads where they are owner_id OR in one of their teams
-- - admins can see all leads of their tenant


-- Example skeleton for SELECT (replace with your own logic):

create policy "leads_select_policy"
on public.leads
for select
using (
  
  -- 1. Strict Tenant Isolation
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  
  AND (
    -- 2a. Admin Override
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
    
    OR
    
    -- 2b. Counselor: Direct Ownership
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid
    
    OR
    
    -- 2c. Counselor: Team Access
    exists (
      select 1 
      from user_teams ut
      where ut.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid
      and ut.team_id = leads.owner_id
    )
  )
);

-- TODO: add INSERT policy that:
-- - allows counselors/admins to insert leads for their tenant
-- - ensures tenant_id is correctly set/validated

create policy "leads_insert_policy"
on public.leads
for insert
with check (
  -- 1. Validate Tenant ID matches the JWT
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  
  -- 2. Role Check
  and (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin', 'counselor')
);
);
