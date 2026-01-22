import { useContext } from 'react';
import { RoleContext } from '../contexts/RoleContext';
import { UserRoleContext } from '../types';

// Re-export types for backward compatibility
export type { AppRole, UserRoleContext } from '../types';

export function useRole(): UserRoleContext {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
}
