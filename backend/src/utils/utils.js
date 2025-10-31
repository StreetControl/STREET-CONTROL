export const getDisplayName = (name) => {
    if (!name) return 'Organization';
    if (name.toUpperCase().includes('SLI')) {
        return 'STREET LIFTING ITALIA';
    }
    return name.toUpperCase();
};