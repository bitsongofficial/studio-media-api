import type { H3Event } from 'h3'
import formidable from 'formidable'
import type { Fields, Files, Options, IncomingForm } from 'formidable'

export interface FormResult {
  fields: Fields
  files: Files
}

interface ReadFilesOptions extends Options {
  // @ts-expect-error
  getForm?: (incomingForm: IncomingForm) => void
}

export async function readForm(event: H3Event, options?: ReadFilesOptions): Promise<FormResult> {
  const form = formidable(options)
  options?.getForm?.(form)

  return await new Promise<FormResult>((resolve, reject) => {
    form.parse(event.req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}
