import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRole } from './use-role';

interface FeaturesContextType {
    features: Set<string>;
    loading: boolean;
    canAccess: (featureId: string) => boolean;
}

const FeaturesContext = createContext<FeaturesContextType>({
    features: new Set(),
    loading: true,
    canAccess: () => false,
});

export const FeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [features, setFeatures] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { role } = useRole();

    useEffect(() => {
        const fetchFeatures = async () => {
            // If Super Admin, grant ALL power
            if (role === 'super_admin') {
                setFeatures(new Set(['ALL'])); // Special flag or just check in logic
                setLoading(false);
                return;
            }

            // Determine Tenant ID (assume stored in user meta or session)
            // For now, simpler: Call the RPC with current user's tenant
            // Wait... RPC takes P_TENANT_ID.
            // We need to resolve tenant_id from auth user.
            // Usually: `auth.users` -> metadata -> tenant_id, OR `team_members` table.

            // Let's use a helper query or updated RPC that uses auth.uid() directly?
            // Or fetch from session.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get Tenant ID from Team Members lookup
            const { data: memberData } = await supabase
                .from('team_members')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();

            // Or if Owner
            let tenantId = memberData?.tenant_id;
            if (!tenantId) {
                // Check if Owner
                const { data: ownerData } = await supabase.from('tenant_profiles').select('id').eq('id', user.id).single();
                tenantId = ownerData?.id;
            }

            if (tenantId) {
                const { data, error } = await supabase.rpc('get_tenant_features', { p_tenant_id: tenantId });
                if (!error && Array.isArray(data)) {
                    setFeatures(new Set(data));
                }
            }
            setLoading(false);
        };

        fetchFeatures();
    }, [role]);

    const canAccess = (featureId: string) => {
        if (loading) return false;
        if (role === 'super_admin') return true;
        return features.has(featureId);
    };

    return (
        <FeaturesContext.Provider value={{ features, loading, canAccess }}>
            {children}
        </FeaturesContext.Provider>
    );
};

export const useFeatures = () => useContext(FeaturesContext);
