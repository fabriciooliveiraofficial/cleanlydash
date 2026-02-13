import React, { useState, useEffect } from 'react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../../ui/dialog';
import { Plus, Edit, Trash, Save, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Plan {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    highlighted: boolean;
    badge: string;
    category: 'system' | 'telephony' | 'combo';
    active: boolean;
    display_order: number;
}

interface PlanFeature {
    id: string;
    plan_id: string;
    text: string;
    included: boolean;
    display_order: number;
}

const SortableFeatureItem = ({ feature, onRemove, onChange }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: feature.id || feature.tempId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical size={16} />
            </div>
            <Input
                value={feature.text}
                onChange={(e) => onChange(feature.id || feature.tempId, 'text', e.target.value)}
                placeholder="Feature text"
                className="flex-1 bg-white"
            />
            <Switch
                checked={feature.included}
                onCheckedChange={(checked) => onChange(feature.id || feature.tempId, 'included', checked)}
            />
            <Button variant="ghost" size="icon" onClick={() => onRemove(feature.id || feature.tempId)} className="text-red-500 hover:bg-red-50">
                <X size={16} />
            </Button>
        </div>
    );
};

export const PlansManager: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Partial<Plan>>({});
    const [currentFeatures, setCurrentFeatures] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching plans:', error);
            toast.error('Failed to load plans');
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    const handleEdit = async (plan: Plan) => {
        setCurrentPlan(plan);

        // Fetch features
        const { data: features, error } = await supabase
            .from('plan_features')
            .select('*')
            .eq('plan_id', plan.id)
            .order('display_order', { ascending: true });

        if (error) {
            toast.error('Failed to load features');
            setCurrentFeatures([]);
        } else {
            setCurrentFeatures(features || []);
        }

        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setCurrentPlan({
            active: true,
            category: 'combo',
            currency: 'USD',
            highlighted: false,
            display_order: plans.length + 1
        });
        setCurrentFeatures([]);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Upsert Plan
            const { data: planData, error: planError } = await supabase
                .from('plans')
                .upsert({
                    ...currentPlan,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (planError) throw planError;

            const planId = planData.id;

            // 2. Handle Features (Delete existing and re-insert for simplicity, or smart diff)
            // For simplicity in this v1, we'll delete all and re-insert.
            // Ideally, we should diff, but re-insert is safer for ordering.
            if (currentPlan.id) {
                await supabase.from('plan_features').delete().eq('plan_id', planId);
            }

            if (currentFeatures.length > 0) {
                const featuresToInsert = currentFeatures.map((f, index) => ({
                    plan_id: planId,
                    text: f.text,
                    included: f.included,
                    display_order: index
                }));

                const { error: featureError } = await supabase
                    .from('plan_features')
                    .insert(featuresToInsert);

                if (featureError) throw featureError;
            }

            toast.success('Plan saved successfully');
            setIsModalOpen(false);
            fetchPlans();
        } catch (error: any) {
            console.error('Error saving plan:', error);
            toast.error(`Error saving plan: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            const { error } = await supabase.from('plans').delete().eq('id', id);
            if (error) throw error;
            toast.success('Plan deleted');
            fetchPlans();
        } catch (error: any) {
            toast.error(`Error deleting plan: ${error.message}`);
        }
    };

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setCurrentFeatures((items) => {
                const oldIndex = items.findIndex((i) => (i.id || i.tempId) === active.id);
                const newIndex = items.findIndex((i) => (i.id || i.tempId) === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addFeature = () => {
        setCurrentFeatures([...currentFeatures, { tempId: Math.random().toString(), text: '', included: true }]);
    };

    const removeFeature = (id: string) => {
        setCurrentFeatures(currentFeatures.filter(f => (f.id || f.tempId) !== id));
    };

    const updateFeature = (id: string, field: string, value: any) => {
        setCurrentFeatures(currentFeatures.map(f => {
            if ((f.id || f.tempId) === id) {
                return { ...f, [field]: value };
            }
            return f;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Plans & Resources</h2>
                    <p className="text-slate-500">Manage pricing plans and feature lists.</p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Add Plan
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading plans...</TableCell>
                            </TableRow>
                        ) : plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">No plans found. Create one to get started.</TableCell>
                            </TableRow>
                        ) : (
                            plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell>{plan.display_order}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-900">{plan.name}</div>
                                        {plan.highlighted && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Highlighted</span>}
                                    </TableCell>
                                    <TableCell className="capitalize">{plan.category}</TableCell>
                                    <TableCell>{plan.currency} {plan.price_monthly}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${plan.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {plan.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                                                <Edit size={16} className="text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                                                <Trash size={16} className="text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentPlan.id ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <label className="text-sm font-bold text-slate-700">Plan Name</label>
                            <Input
                                value={currentPlan.name || ''}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                                placeholder="e.g. Solopreneur"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <label className="text-sm font-bold text-slate-700">Category</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                                value={currentPlan.category || 'combo'}
                                onChange={(e: any) => setCurrentPlan({ ...currentPlan, category: e.target.value })}
                            >
                                <option value="combo">Combo</option>
                                <option value="system">System</option>
                                <option value="telephony">Telephony</option>
                            </select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700">Description</label>
                            <Textarea
                                value={currentPlan.description || ''}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, description: e.target.value })}
                                placeholder="Short description for the card"
                            />
                        </div>

                        <div className="col-span-1 space-y-2">
                            <label className="text-sm font-bold text-slate-700">Price (Monthly)</label>
                            <Input
                                type="number"
                                value={currentPlan.price_monthly || 0}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, price_monthly: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-1 space-y-2">
                            <label className="text-sm font-bold text-slate-700">Display Order</label>
                            <Input
                                type="number"
                                value={currentPlan.display_order || 0}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, display_order: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700">Badge Text (Optional)</label>
                            <Input
                                value={currentPlan.badge || ''}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, badge: e.target.value })}
                                placeholder="e.g. Most Popular"
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-8 py-2">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={currentPlan.active}
                                    onCheckedChange={(checked) => setCurrentPlan({ ...currentPlan, active: checked })}
                                />
                                <label className="text-sm font-bold text-slate-700">Active</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={currentPlan.highlighted}
                                    onCheckedChange={(checked) => setCurrentPlan({ ...currentPlan, highlighted: checked })}
                                />
                                <label className="text-sm font-bold text-slate-700">Highlighted (Dark Theme)</label>
                            </div>
                        </div>

                        <div className="col-span-2 mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-slate-700">Features</label>
                                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                                    <Plus size={14} className="mr-1" /> Add Feature
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={currentFeatures.map(f => f.id || f.tempId)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {currentFeatures.map((feature) => (
                                            <SortableFeatureItem
                                                key={feature.id || feature.tempId}
                                                feature={feature}
                                                onRemove={removeFeature}
                                                onChange={updateFeature}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white">
                            {saving ? 'Saving...' : 'Save Plan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
