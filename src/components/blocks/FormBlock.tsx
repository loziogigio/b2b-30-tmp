import FormBlockClient, { type FormBlockConfig } from './FormBlockClient';

interface Props {
  config: FormBlockConfig;
  blockId: string;
  pageSlug: string;
}

export function FormBlock({ config, blockId, pageSlug }: Props) {
  return (
    <FormBlockClient config={config} blockId={blockId} pageSlug={pageSlug} />
  );
}
