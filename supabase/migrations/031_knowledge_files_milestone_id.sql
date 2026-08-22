-- 031_knowledge_files_milestone_id.sql
--
-- 🔴 EVERY UPLOAD IN THE APP WAS FAILING.
--
-- lib/knowledgeFiles.js has always written `milestone_id` in its insert, and
-- listFilesForMilestone() filters on it, but no migration ever added the
-- column. PostgREST rejects the whole insert with
--
--   Could not find the 'milestone_id' column of 'knowledge_files'
--   in the schema cache
--
-- and uploadKnowledgeFile treats an insert failure as fatal: it removes the
-- object it just wrote to Storage and throws. So the file uploaded, the text
-- extracted, and then the row was refused and the blob rolled back — leaving
-- no trace that anything had been attempted. Both callers were affected:
-- the Library upload dialog and the Roadmap's "attach completion evidence".
--
-- ⚠️ This was invisible in review. The client code is correct, the table
-- definition in 007 is coherent, and nothing cross-checks one against the
-- other. It only surfaces when a real file is dragged at a real deployment.
--
-- The column is added rather than removed from the client because the feature
-- it serves is fully built: Roadmap.jsx passes milestoneId on upload and lists
-- a milestone's evidence back on expand.

alter table public.knowledge_files
  add column if not exists milestone_id uuid
    -- ⭐ SET NULL, not CASCADE. A document attached as evidence is still a
    -- document — deleting the milestone should unfile it, not destroy the
    -- owner's file along with the Storage object it points at.
    references public.milestones(id) on delete set null;

-- listFilesForMilestone() filters on this on every milestone expand.
create index if not exists knowledge_files_milestone_id_idx
  on public.knowledge_files (milestone_id)
  where milestone_id is not null;

comment on column public.knowledge_files.milestone_id is
  'Optional link to the milestone this file was attached to as completion evidence. Null for files uploaded straight to the Library.';
