# Demo documents — Bridgewater Mechanical

⚠️ **Every figure in these files is invented.** Bridgewater Mechanical is not a
real company. These exist so the demo workspace has something real-shaped in
the Documents library and so retrieval genuinely returns something when Solomon
is asked a question about "our" procedures.

## Why these are files and not SQL

`knowledge_files.file_path` has to point at a real object in Supabase Storage.
Seeding rows with invented paths gives you a Documents list where every file
404s when clicked, which is worse than an empty list.

Uploading through the app is also the only path that runs the chunker and the
embedder, so after uploading these, retrieval actually works — ask Solomon
"what does our service call SOP say about quoting?" and he answers from the
document rather than from general knowledge.

## How to upload

Documents → Uploaded tab → upload. Set the **kind** as noted below; it is what
Solomon uses to decide which file is relevant to a question.

| File | Upload as kind |
|---|---|
| `service-call-sop.md`        | sop |
| `estimating-and-quoting-sop.md` | sop |
| `ar-aging-summary.csv`       | financial |
| `pricing-and-labour-rates.csv` | financial |
| `confined-space-procedure.md` | sop |
| `employee-handbook-extract.md` | hr |
