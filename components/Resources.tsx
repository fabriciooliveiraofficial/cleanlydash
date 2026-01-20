import React, { useState } from 'react';
import { Package, ClipboardList, Settings2, Tag } from 'lucide-react';
import { InventoryList } from './resources/InventoryList.tsx';
import { TasksList } from './resources/TasksList.tsx';
import { ServiceCatalog } from './resources/ServiceCatalog.tsx';
import { CategoryManager } from './resources/CategoryManager.tsx';
import { RealEstateManager } from './resources/RealEstateManager.tsx';
import { AddonsManager } from './resources/AddonsManager.tsx';

export const Resources: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'services' | 'inventory' | 'tasks' | 'categories' | 'real_state' | 'addons'>('categories');

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Recursos & Serviços</h1>
                    <p className="text-slate-500">Gerencie seu "Menu" de serviços e controle de estoque.</p>
                </div>
            </header>

            {/* Sub-Tabs Navigation */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit flex-wrap gap-1">
                <button
                    onClick={() => setActiveSubTab('categories')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'categories' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Tag size={16} />
                        Categorias
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab('real_state')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'real_state' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Settings2 size={16} />
                        Real State
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab('tasks')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'tasks' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Settings2 size={16} />
                        Tarefas
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab('services')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'services' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ClipboardList size={16} />
                        Serviços
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab('inventory')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'inventory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Package size={16} />
                        Inventário
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab('addons')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'addons' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Tag size={16} />
                        Up-Sell / Add-ons
                    </div>
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[400px]">
                {activeSubTab === 'categories' && (
                    <CategoryManager />
                )}
                {activeSubTab === 'real_state' && (
                    <RealEstateManager />
                )}
                {activeSubTab === 'tasks' && (
                    <TasksList />
                )}
                {activeSubTab === 'services' && (
                    <ServiceCatalog />
                )}
                {activeSubTab === 'inventory' && (
                    <InventoryList />
                )}
                {activeSubTab === 'addons' && (
                    <AddonsManager />
                )}
            </div>
        </div>
    );
};
