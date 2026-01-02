import { formatCost, type ModCostBreakdown } from '@/services/mod-cost-calculator';
import { DollarSign, TrendingDown, ShoppingCart, Sparkles } from 'lucide-react';

interface ModCostDisplayProps {
    breakdown: ModCostBreakdown;
    showDetails?: boolean;
}

export function ModCostDisplay({ breakdown, showDetails = true }: ModCostDisplayProps) {
    const { assets, totalGenerationCost, marketValue, savings, savingsPercentage } = breakdown;

    return (
        <div className="mod-cost-display bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-lg">Your Mod Cost Breakdown</h3>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Generation Cost */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium">To Build</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCost(totalGenerationCost)}
                    </div>
                </div>

                {/* Market Value */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-xs font-medium">To Buy</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCost(marketValue)}
                    </div>
                </div>

                {/* Savings */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs font-medium">You Save</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCost(savings)}
                    </div>
                </div>
            </div>

            {/* Savings Percentage */}
            <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">💰 Savings:</span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-300">
                        {savingsPercentage.toFixed(0)}% OFF!
                    </span>
                </div>
                <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 mt-2">
                    <div
                        className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(savingsPercentage, 100)}%` }}
                    />
                </div>
            </div>

            {/* Asset Breakdown */}
            {showDetails && assets.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        What You're Getting:
                    </div>
                    {assets.map((asset, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded p-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="capitalize">{getAssetIcon(asset.type)}</span>
                                <span>
                                    {asset.quantity}x {asset.type}
                                    {asset.quantity > 1 ? 's' : ''}
                                </span>
                                <span className="text-xs text-gray-500">({asset.provider})</span>
                            </div>
                            <span className="font-medium">{formatCost(asset.totalCost)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Kid-Friendly Message */}
            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                    {getKidFriendlyMessage(savingsPercentage, savings)}
                </p>
            </div>
        </div>
    );
}

function getAssetIcon(type: string): string {
    switch (type) {
        case 'texture':
            return '🎨';
        case 'model':
            return '🎮';
        case 'sound':
            return '🔊';
        case 'code':
            return '💻';
        default:
            return '✨';
    }
}

function getKidFriendlyMessage(savingsPercentage: number, savings: number): string {
    if (savingsPercentage > 95) {
        return `🎉 WOW! You're basically getting this for FREE! That's ${formatCost(savings)} you can spend on other cool stuff!`;
    }
    if (savingsPercentage > 90) {
        return `🚀 Amazing! You're saving ${savingsPercentage.toFixed(0)}% by building this yourself! That's like getting 10 mods for the price of 1!`;
    }
    if (savingsPercentage > 80) {
        return `💪 Great job! Building your own mods is way cheaper than buying them. You saved ${formatCost(savings)}!`;
    }
    return `✨ By building this yourself, you saved ${formatCost(savings)}! Plus, you learned how to code!`;
}
