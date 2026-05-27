-- Store Google Cloud Document AI identifiers separately from Gmail/email IDs.
-- google_document_ai_id maps to Document.docid or DocumentId.unmanagedDocId.docId.

ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS google_document_ai_id text,
  ADD COLUMN IF NOT EXISTS google_document_ai_revision_id text,
  ADD COLUMN IF NOT EXISTS google_document_ai_processor text,
  ADD COLUMN IF NOT EXISTS google_document_ai_gcs_uri text;

CREATE INDEX IF NOT EXISTS idx_documentos_google_document_ai_id
  ON documentos(google_document_ai_id)
  WHERE google_document_ai_id IS NOT NULL;

COMMENT ON COLUMN documentos.google_document_ai_id IS
  'Google Cloud Document AI document identifier. Separate from Gmail message id/email_id_origen.';

COMMENT ON COLUMN documentos.google_document_ai_revision_id IS
  'Google Cloud Document AI revision id when available.';

COMMENT ON COLUMN documentos.google_document_ai_processor IS
  'Google Cloud Document AI processor or processor version resource used to extract the document.';

COMMENT ON COLUMN documentos.google_document_ai_gcs_uri IS
  'Google Cloud Storage URI used by Document AI when the document was processed from GCS.';
