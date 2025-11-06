/**
 * TAB BUTTON COMPONENT
 * Reusable tab button for navigation
 */

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export default function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider
        transition-colors duration-200
        ${
          active
            ? 'border-primary text-primary'
            : 'border-transparent text-dark-text-secondary hover:text-dark-text hover:border-dark-border'
        }
      `}
    >
      {children}
    </button>
  );
}
