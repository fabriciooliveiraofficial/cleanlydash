import { useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useSessionManager } from './use-session-manager';
import { toast } from 'sonner';

export type UnifiedRouteContext = 'platform' | 'tenant' | 'cleaner';

export function useAuthOrchestrator() {
    const supabase = createClient();
    const { saveSessionForRoute } = useSessionManager();

    const signInUnified = useCallback(async (email: string, password: string): Promise<{ success: boolean; route?: UnifiedRouteContext }> => {
        try {
            console.log('[AuthOrchestrator] Starting unified sign-in for:', email);

            // 1. Authenticate with the primary tenant client
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;
            if (!data.session || !data.user) throw new Error("Authentication succeeded but no session returned");

            const userId = data.user.id;
            console.log('[AuthOrchestrator] Auth successful, detecting role for:', userId);

            // 2. Parallel Role Detection
            // We check:
            // a) platform-level roles (user_roles)
            // b) tenant owner (tenant_profiles)
            // c) team members (team_members)

            const [userRoleResult, tenantProfileResult, teamMemberResult] = await Promise.all([
                supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
                supabase.from('tenant_profiles').select('id').eq('id', userId).maybeSingle(),
                supabase.from('team_members').select('role, custom_roles(app_access)').eq('user_id', userId).eq('status', 'active').maybeSingle()
            ]);

            let detectedRoute: UnifiedRouteContext = 'tenant'; // Default

            // Logic Tree:

            // 1. Check if Platform Admin
            if (userRoleResult.data?.role === 'super_admin' || userRoleResult.data?.role === 'platform_admin') {
                console.log('[AuthOrchestrator] Platform Admin detected');
                detectedRoute = 'platform';
            }
            // 2. Check if Tenant Owner
            else if (tenantProfileResult.data) {
                console.log('[AuthOrchestrator] Tenant Owner detected');
                detectedRoute = 'tenant';
            }
            // 3. Check Team Member / Cleaner
            else if (teamMemberResult.data) {
                const member = teamMemberResult.data;
                const appAccess = (member as any).custom_roles?.app_access || (member.role === 'cleaner' ? 'cleaner_app' : 'dashboard');

                console.log('[AuthOrchestrator] Team Member detected, app_access:', appAccess);

                if (appAccess === 'cleaner_app') {
                    detectedRoute = 'cleaner';
                } else {
                    detectedRoute = 'tenant';
                }
            } else {
                console.log('[AuthOrchestrator] No specific role found, defaulting to tenant context');
            }

            // 3. Orchestrate Session Storage
            // This is the critical part: we save the session to the context we just detected
            saveSessionForRoute(detectedRoute, data.session);

            console.log(`[AuthOrchestrator] Orchestration complete. Routing to: ${detectedRoute}`);

            return { success: true, route: detectedRoute };

        } catch (error: any) {
            console.error('[AuthOrchestrator] Unified Sign-In Error:', error);
            toast.error(error.message || 'Erro ao realizar login unificado');
            return { success: false };
        }
    }, [supabase, saveSessionForRoute]);

    return {
        signInUnified
    };
}
