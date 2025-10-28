import type { HomeSettings } from '@/lib/home-settings/types';

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  branding: {
    title: 'B2B Store',
    primaryColor: '#009f7f',
    secondaryColor: '#02b290'
  },
  defaultCardVariant: 'b2b',
  cardStyle: {
    borderWidth: 1,
    borderColor: '#EAEEF2',
    borderStyle: 'solid',
    shadowSize: 'none',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 'md',
    hoverEffect: 'none',
    backgroundColor: '#ffffff'
  }
};
