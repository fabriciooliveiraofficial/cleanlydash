export interface Service {
    id: string;
    name: string;
    price_default: number;
    duration_minutes: number;
}

export interface Task {
    id: string;
    title: string;
    price?: number;
}

export interface Addon {
    id: string;
    name: string;
    price: number;
    duration_minutes?: number;
}

export interface Discount {
    type: 'percent' | 'fixed';
    value: number;
}

export interface EstimateOptions {
    service: Service | null;
    selectedTaskIds: string[];
    availableTasks: Task[];
    selectedAddonIds: string[];
    availableAddons: Addon[];
    discount: Discount;
}

export const calculateEstimate = (options: EstimateOptions) => {
    const { service, selectedTaskIds, availableTasks, selectedAddonIds, availableAddons, discount } = options;

    if (!service) return { total: 0, subtotal: 0, discountAmount: 0, totalDuration: 0 };

    // 1. Base Service Price
    const basePrice = service.price_default || 0;

    // 2. Extra Tasks (from Checklist)
    const tasksTotal = selectedTaskIds.reduce((sum, taskId) => {
        const task = availableTasks.find(t => t.id === taskId);
        return sum + (task?.price || 0);
    }, 0);

    // 3. Add-ons
    const addonsTotal = selectedAddonIds.reduce((sum, addonId) => {
        const addon = availableAddons.find(a => a.id === addonId);
        return sum + (addon?.price || 0);
    }, 0);

    const subtotal = basePrice + tasksTotal + addonsTotal;

    // 4. Discount
    let discountAmount = 0;
    if (discount.type === 'fixed') {
        discountAmount = discount.value;
    } else {
        discountAmount = (subtotal * discount.value) / 100;
    }

    const total = Math.max(0, subtotal - discountAmount);

    return {
        basePrice,
        tasksTotal,
        addonsTotal,
        subtotal,
        discountAmount,
        total,
        totalDuration: (service.duration_minutes || 0) + selectedAddonIds.reduce((sum, addonId) => {
            const addon = availableAddons.find(a => a.id === addonId);
            return sum + (addon?.duration_minutes || 0);
        }, 0)
    };
};
