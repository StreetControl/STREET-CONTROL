/**
 * UTILITY FUNCTIONS
 */

export const getDisplayName = (name: string | null | undefined): string => {
  if (!name) return 'Organization';
  if (name.toUpperCase().includes('SLI')) {
    return 'STREET LIFTING ITALIA';
  }
  return name.toUpperCase();
};
