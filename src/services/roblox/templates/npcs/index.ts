/**
 * NPC & AI Templates
 * 
 * Pre-built NPC systems with AI behaviors.
 */

import type { RobloxTemplate } from '../../template-metadata';

export const npcTemplates: RobloxTemplate[] = [
    {
        metadata: {
            id: 'enemy-ai',
            name: 'Enemy AI System',
            description: 'Basic enemy AI with patrol, chase, and attack behaviors.',
            category: 'npcs',
            difficulty: 'intermediate',
            tags: ['ai', 'enemy', 'combat', 'pathfinding'],
            estimatedTime: 25
        },
        serverScripts: [{
            path: 'src/ServerScriptService/EnemyAI.server.lua',
            type: 'Script',
            content: `-- Enemy AI System
local PathfindingService = game:GetService("PathfindingService")
local CollectionService = game:GetService("CollectionService")

local enemies = CollectionService:GetTagged("Enemy")

for _, enemy in ipairs(enemies) do
    local humanoid = enemy:FindFirstChild("Humanoid")
    local rootPart = enemy:FindFirstChild("HumanoidRootPart")
    
    if humanoid and rootPart then
        local CHASE_RANGE = 50
        local ATTACK_RANGE = 5
        local DAMAGE = 10
        local PATROL_POINTS = enemy:FindFirstChild("PatrolPoints")
        
        local currentTarget = nil
        local patrolIndex = 1
        
        -- Patrol behavior
        local function patrol()
            if PATROL_POINTS and #PATROL_POINTS:GetChildren() > 0 then
                local point = PATROL_POINTS:GetChildren()[patrolIndex]
                humanoid:MoveTo(point.Position)
                patrolIndex = (patrolIndex % #PATROL_POINTS:GetChildren()) + 1
            end
        end
        
        -- Chase behavior
        local function chase(target)
            local path = PathfindingService:CreatePath()
            path:ComputeAsync(rootPart.Position, target.Position)
            
            if path.Status == Enum.PathStatus.Success then
                local waypoints = path:GetWaypoints()
                for _, waypoint in ipairs(waypoints) do
                    humanoid:MoveTo(waypoint.Position)
                    humanoid.MoveToFinished:Wait()
                end
            end
        end
        
        -- Main AI loop
        task.spawn(function()
            while enemy.Parent do
                task.wait(0.5)
                
                -- Find nearest player
                local nearestPlayer = nil
                local nearestDistance = CHASE_RANGE
                
                for _, player in ipairs(game.Players:GetPlayers()) do
                    if player.Character and player.Character:FindFirstChild("HumanoidRootPart") then
                        local distance = (player.Character.HumanoidRootPart.Position - rootPart.Position).Magnitude
                        if distance < nearestDistance then
                            nearestPlayer = player.Character
                            nearestDistance = distance
                        end
                    end
                end
                
                if nearestPlayer then
                    currentTarget = nearestPlayer
                    
                    if nearestDistance <= ATTACK_RANGE then
                        -- Attack
                        local targetHumanoid = nearestPlayer:FindFirstChild("Humanoid")
                        if targetHumanoid then
                            targetHumanoid:TakeDamage(DAMAGE)
                        end
                    else
                        -- Chase
                        chase(nearestPlayer.HumanoidRootPart)
                    end
                else
                    -- Patrol
                    currentTarget = nil
                    patrol()
                end
            end
        end)
    end
end

print("✅ Enemy AI initialized for " .. #enemies .. " enemies")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    {
        metadata: {
            id: 'shopkeeper-npc',
            name: 'Shopkeeper NPC',
            description: 'Interactive shop NPC with purchase system and inventory.',
            category: 'npcs',
            difficulty: 'intermediate',
            tags: ['npc', 'shop', 'trading', 'economy'],
            estimatedTime: 30
        },
        serverScripts: [{
            path: 'src/ServerScriptService/ShopkeeperNPC.server.lua',
            type: 'Script',
            content: `-- Shopkeeper NPC System
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

-- Shop items configuration
local SHOP_ITEMS = {
    {name = "Health Potion", cost = 50, effect = "heal"},
    {name = "Speed Boost", cost = 100, effect = "speed"},
    {name = "Sword", cost = 200, effect = "weapon"}
}

-- Remote events
local shopEvent = Instance.new("RemoteEvent")
shopEvent.Name = "ShopPurchase"
shopEvent.Parent = ReplicatedStorage

local shopDataFunction = Instance.new("RemoteFunction")
shopDataFunction.Name = "GetShopData"
shopDataFunction.Parent = ReplicatedStorage

-- Get shop data
shopDataFunction.OnServerInvoke = function(player)
    return SHOP_ITEMS
end

-- Handle purchases
shopEvent.OnServerEvent:Connect(function(player, itemName)
    local leaderstats = player:FindFirstChild("leaderstats")
    if not leaderstats then return end
    
    local coins = leaderstats:FindFirstChild("Coins")
    if not coins then return end
    
    -- Find item
    for _, item in ipairs(SHOP_ITEMS) do
        if item.name == itemName then
            if coins.Value >= item.cost then
                coins.Value = coins.Value - item.cost
                
                -- Give item effect
                if item.effect == "heal" then
                    local character = player.Character
                    if character then
                        local humanoid = character:FindFirstChild("Humanoid")
                        if humanoid then
                            humanoid.Health = math.min(humanoid.Health + 50, humanoid.MaxHealth)
                        end
                    end
                elseif item.effect == "speed" then
                    local character = player.Character
                    if character then
                        local humanoid = character:FindFirstChild("Humanoid")
                        if humanoid then
                            humanoid.WalkSpeed = 32
                            task.wait(30)
                            humanoid.WalkSpeed = 16
                        end
                    end
                end
                
                print(player.Name .. " purchased " .. itemName)
            end
            break
        end
    end
end)

-- Setup shopkeeper NPCs
local shopkeepers = CollectionService:GetTagged("Shopkeeper")

for _, npc in ipairs(shopkeepers) do
    local clickDetector = npc:FindFirstChild("ClickDetector")
    if not clickDetector then
        clickDetector = Instance.new("ClickDetector")
        clickDetector.Parent = npc
    end
    
    clickDetector.MouseClick:Connect(function(player)
        -- Trigger shop UI on client
        shopEvent:FireClient(player, "open")
    end)
end

print("✅ Shopkeeper NPC system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    }
];
