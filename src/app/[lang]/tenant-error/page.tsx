import TenantConfigError from '@/components/tenant/tenant-config-error';

interface Props {
  searchParams: Promise<{ type?: string; details?: string }>;
}

export default async function TenantErrorPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorType = (params.type as 'missing_api' | 'invalid_config' | 'general') || 'general';
  const details = params.details;

  return <TenantConfigError errorType={errorType} details={details} />;
}
