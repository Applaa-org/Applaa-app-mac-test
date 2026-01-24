/**
 * Monetization Templates
 * 
 * Pre-built monetization systems for Roblox games.
 */

import type { RobloxTemplate } from '../../template-metadata';

export const monetizationTemplates: RobloxTemplate[] = [
    {
        metadata: {
            id: 'gamepass-system',
            name: 'Game Pass System',
            description: 'Complete game pass system with benefits and purchase prompts.',
            category: 'monetization',
            difficulty: 'intermediate',
            tags: ['gamepass', 'monetization', 'premium'],
            estimatedTime: 25
        },
        serverScripts: [{
            path: 'src/ServerScriptService/GamePassSystem.server.lua',
            type: 'Script',
            content: `-- Game Pass System
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

-- Game Pass IDs (replace with your actual IDs)
local GAME_PASSES = {
    VIP = 0,  -- Replace with actual ID
    DoubleCoins = 0,  -- Replace with actual ID
    SpeedBoost = 0  -- Replace with actual ID
}

-- Check if player owns game pass
local function playerOwnsPass(player, passId)
    local success, hasPass = pcall(function()
        return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passId)
    end)
    return success and hasPass
end

-- Apply game pass benefits
Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        
        -- VIP benefits
        if playerOwnsPass(player, GAME_PASSES.VIP) then
            -- Add VIP tag
            local tag = Instance.new("BillboardGui")
            tag.Size = UDim2.new(0, 100, 0, 40)
            tag.StudsOffset = Vector3.new(0, 3, 0)
            tag.Parent = character.Head
            
            local label = Instance.new("TextLabel")
            label.Size = UDim2.new(1, 0, 1, 0)
            label.BackgroundTransparency = 1
            label.Text = "VIP"
            label.TextColor3 = Color3.fromRGB(255, 215, 0)
            label.TextScaled = true
            label.Font = Enum.Font.GothamBold
            label.Parent = tag
        end
        
        -- Speed boost
        if playerOwnsPass(player, GAME_PASSES.SpeedBoost) then
            humanoid.WalkSpeed = 24
        end
    end)
end)

-- Handle game pass purchases
MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, wasPurchased)
    if wasPurchased then
        print(player.Name .. " purchased a game pass!")
        -- Refresh character to apply benefits
        if player.Character then
            player:LoadCharacter()
        end
    end
end)

print("✅ Game pass system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    {
        metadata: {
            id: 'developer-products',
            name: 'Developer Products System',
            description: 'In-game shop with developer products for consumable purchases.',
            category: 'monetization',
            difficulty: 'intermediate',
            tags: ['devproducts', 'shop', 'monetization'],
            estimatedTime: 30
        },
        serverScripts: [{
            path: 'src/ServerScriptService/DeveloperProducts.server.lua',
            type: 'Script',
            content: `-- Developer Products System
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

-- Product IDs (replace with your actual IDs)
local PRODUCTS = {
    Coins100 = 0,  -- Replace with actual ID
    Coins500 = 0,  -- Replace with actual ID
    Coins1000 = 0  -- Replace with actual ID
}

-- Product benefits
local PRODUCT_BENEFITS = {
    [PRODUCTS.Coins100] = {type = "coins", amount = 100},
    [PRODUCTS.Coins500] = {type = "coins", amount = 500},
    [PRODUCTS.Coins1000] = {type = "coins", amount = 1000}
}

-- Process receipt
local function processReceipt(receiptInfo)
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end
    
    local productId = receiptInfo.ProductId
    local benefit = PRODUCT_BENEFITS[productId]
    
    if benefit then
        if benefit.type == "coins" then
            local leaderstats = player:FindFirstChild("leaderstats")
            if leaderstats then
                local coins = leaderstats:FindFirstChild("Coins")
                if coins then
                    coins.Value = coins.Value + benefit.amount
                    return Enum.ProductPurchaseDecision.PurchaseGranted
                end
            end
        end
    end
    
    return Enum.ProductPurchaseDecision.NotProcessedYet
end

MarketplaceService.ProcessReceipt = processReceipt

print("✅ Developer products system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    }
];
