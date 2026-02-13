import React from 'react';
import { PlansManager } from '../system/PlansManager';

export const PlansPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Plans & Resources</h1>
                    <p className="text-slate-500">Manage subscription plans, features, and resource limits.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6">
                    <PlansManager />
                </div>
            </div>
        </div>
    );
};
