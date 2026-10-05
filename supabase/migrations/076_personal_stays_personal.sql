-- ⭐⭐ WHAT THE OWNER TELLS SOLOMON ABOUT THEIR OWN LIFE STAYS THEIRS.
-- Daniel, 4 Oct 2026: "if the owner is asking a personal question the other
-- people with access will see this?" After 075 the conversation itself was
-- already private to each person; three things were not:
--
-- 1. CHECK-INS (mood, the week's challenge) were readable by owner AND admin
--    across the company — so "Runs the business" could read the owner's. Each
--    person's check-ins are now their own. Advisors the owner invited keep
--    reading the company's, as the owner chose when inviting them.
-- 2. A SOLOMON REPLY SAVED TO DOCUMENTS (tool_id 'solomon') was visible to
--    the whole lead group. Now only to the person who saved it.
-- 3. NOTES ABOUT A SPECIFIC PERSON (kind 'person') were company-wide. If that
--    employee were ever given "Runs the business" they would read what was
--    said about them. Existing ones move to their author's private notes; new
--    ones are written private (src/lib/memory.js scopeFor).

drop policy if exists "Own company or advisor — read checkins" on public.checkins;
drop policy if exists checkins_owner_admin_read_all on public.checkins;
create policy checkins_advisor_read on public.checkins for select using (is_advisor_of(company_id));
-- (checkins_own_write, FOR ALL on user_id = auth.uid(), already gives each
--  person their own.)

drop policy if exists documents_team on public.documents;
create policy documents_team on public.documents for all
  using (company_id = current_company_id()
         and (tool_id <> 'solomon' or user_id = auth.uid())
         and (can_area('lead')
              or (can_area('office') and tool_id in ('cfo-dashboard', 'cash-flow', '__library_analysis__'))))
  with check (company_id = current_company_id()
         and (tool_id <> 'solomon' or user_id = auth.uid())
         and (can_area('lead')
              or (can_area('office') and tool_id in ('cfo-dashboard', 'cash-flow', '__library_analysis__'))));

-- Notes about a person: to their author if known, else the company's owner.
update public.solomon_memory m
   set user_id = coalesce(
         (select p.id from public.profiles p where p.company_id = m.company_id and p.role = 'owner' order by p.created_at limit 1),
         m.user_id)
 where m.kind = 'person' and m.user_id is null;
