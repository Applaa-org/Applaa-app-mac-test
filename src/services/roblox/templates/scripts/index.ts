/**
 * Core Lua Script Templates
 * 
 * Pre-built Lua scripts for common Roblox functionalities.
 */

import type { RobloxTemplate } from '../../template-metadata';

export const scriptTemplates: RobloxTemplate[] = [
    // 1. Door System
    {
        metadata: {
            id: 'door-system',
            name: 'Door Open/Close System',
            description: 'Interactive door that opens and closes with smooth animations when a player clicks or approaches it.',
            category: 'scripts',
            difficulty: 'beginner',
            tags: ['door', 'interaction', 'animation', 'proximity'],
            estimatedTime: 10,
            requirements: ['Basic Roblox Studio knowledge']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/DoorSystem.server.lua',
            type: 'Script',
            content: `-- Door Open/Close System
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

-- Configuration
local DOOR_OPEN_ANGLE = 90
local ANIMATION_TIME = 0.5
local AUTO_CLOSE_TIME = 3

-- Find all doors in workspace (tagged with "Door")
local CollectionService = game:GetService("CollectionService")
local doors = CollectionService:GetTagged("Door")

for _, door in pairs(doors) do
    local doorModel = door:FindFirstChild("DoorModel") or door
    local hinge = doorModel:FindFirstChild("Hinge") or doorModel.PrimaryPart
    
    local isOpen = false
    local originalCFrame = hinge.CFrame
    
    -- Create ClickDetector
    local clickDetector = Instance.new("ClickDetector")
    clickDetector.Parent = doorModel
    
    -- Handle door click
    clickDetector.MouseClick:Connect(function(player)
        if isOpen then
            -- Close door
            local closeTween = TweenService:Create(
                hinge,
                TweenInfo.new(ANIMATION_TIME, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
                {CFrame = originalCFrame}
            )
            closeTween:Play()
            isOpen = false
        else
            -- Open door
            local openCFrame = originalCFrame * CFrame.Angles(0, math.rad(DOOR_OPEN_ANGLE), 0)
            local openTween = TweenService:Create(
                hinge,
                TweenInfo.new(ANIMATION_TIME, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
                {CFrame = openCFrame}
            )
            openTween:Play()
            isOpen = true
            
            -- Auto-close after delay
            task.wait(AUTO_CLOSE_TIME)
            if isOpen then
                local closeTween = TweenService:Create(
                    hinge,
                    TweenInfo.new(ANIMATION_TIME, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
                    {CFrame = originalCFrame}
                )
                closeTween:Play()
                isOpen = false
            end
        end
    end)
end

print("✅ Door system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 2. Coin Collection System
    {
        metadata: {
            id: 'coin-collector',
            name: 'Coin Collection System',
            description: 'Collectible coins with particle effects, sounds, and leaderboard integration.',
            category: 'scripts',
            difficulty: 'beginner',
            tags: ['coins', 'collectibles', 'leaderboard', 'particles'],
            estimatedTime: 15,
            requirements: ['Leaderboard system']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/CoinCollector.server.lua',
            type: 'Script',
            content: `-- Coin Collection System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")

-- Configuration
local COIN_VALUE = 10
local RESPAWN_TIME = 30

-- Find all coins (tagged with "Coin")
local coins = CollectionService:GetTagged("Coin")

for _, coin in pairs(coins) do
    local originalPosition = coin.Position
    local canCollect = true
    
    -- Create particle effect
    local particle = Instance.new("ParticleEmitter")
    particle.Texture = "rbxasset://textures/particles/sparkles_main.dds"
    particle.Rate = 20
    particle.Lifetime = NumberRange.new(0.5, 1)
    particle.Speed = NumberRange.new(2, 4)
    particle.Color = ColorSequence.new(Color3.fromRGB(255, 215, 0))
    particle.Parent = coin
    
    -- Rotate coin
    local rotation = 0
    game:GetService("RunService").Heartbeat:Connect(function(dt)
        rotation = rotation + (dt * 100)
        coin.CFrame = CFrame.new(coin.Position) * CFrame.Angles(0, math.rad(rotation), 0)
    end)
    
    -- Handle collection
    coin.Touched:Connect(function(hit)
        if not canCollect then return end
        
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            local player = Players:GetPlayerFromCharacter(hit.Parent)
            if player then
                canCollect = false
                
                -- Add coins to player
                local leaderstats = player:FindFirstChild("leaderstats")
                if leaderstats then
                    local coins = leaderstats:FindFirstChild("Coins")
                    if coins then
                        coins.Value = coins.Value + COIN_VALUE
                    end
                end
                
                -- Play collection effect
                coin.Transparency = 1
                particle.Enabled = false
                
                -- Play sound
                local sound = Instance.new("Sound")
                sound.SoundId = "rbxassetid://5153845714" -- Coin collect sound
                sound.Volume = 0.5
                sound.Parent = coin
                sound:Play()
                
                -- Respawn coin
                task.wait(RESPAWN_TIME)
                coin.Transparency = 0
                coin.Position = originalPosition
                particle.Enabled = true
                canCollect = true
            end
        end
    end)
end

print("✅ Coin collection system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 3. Health & Damage System
    {
        metadata: {
            id: 'health-damage',
            name: 'Health & Damage System',
            description: 'Complete health system with damage zones, healing items, and regeneration.',
            category: 'scripts',
            difficulty: 'intermediate',
            tags: ['health', 'damage', 'combat', 'regeneration'],
            estimatedTime: 20,
            requirements: ['Basic scripting knowledge']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/HealthSystem.server.lua',
            type: 'Script',
            content: `-- Health & Damage System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")

-- Configuration
local MAX_HEALTH = 100
local REGEN_RATE = 2 -- Health per second
local REGEN_DELAY = 5 -- Seconds after damage before regen starts

-- Player health management
Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        humanoid.MaxHealth = MAX_HEALTH
        humanoid.Health = MAX_HEALTH
        
        local lastDamageTime = 0
        
        -- Health regeneration
        task.spawn(function()
            while character.Parent do
                task.wait(1)
                
                if humanoid.Health < MAX_HEALTH and (tick() - lastDamageTime) >= REGEN_DELAY then
                    humanoid.Health = math.min(humanoid.Health + REGEN_RATE, MAX_HEALTH)
                end
            end
        end)
        
        -- Track damage
        humanoid.HealthChanged:Connect(function(health)
            if health < humanoid.Health then
                lastDamageTime = tick()
            end
        end)
    end)
end)

-- Damage zones (tagged with "DamageZone")
local damageZones = CollectionService:GetTagged("DamageZone")

for _, zone in pairs(damageZones) do
    local damageAmount = zone:GetAttribute("Damage") or 10
    local damageInterval = zone:GetAttribute("Interval") or 1
    
    local playersInZone = {}
    
    zone.Touched:Connect(function(hit)
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            local player = Players:GetPlayerFromCharacter(hit.Parent)
            if player and not playersInZone[player] then
                playersInZone[player] = true
                
                -- Apply damage over time
                task.spawn(function()
                    while playersInZone[player] and humanoid.Health > 0 do
                        humanoid:TakeDamage(damageAmount)
                        task.wait(damageInterval)
                    end
                end)
            end
        end
    end)
    
    zone.TouchEnded:Connect(function(hit)
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            local player = Players:GetPlayerFromCharacter(hit.Parent)
            if player then
                playersInZone[player] = nil
            end
        end
    end)
end

-- Healing items (tagged with "HealingItem")
local healingItems = CollectionService:GetTagged("HealingItem")

for _, item in pairs(healingItems) do
    local healAmount = item:GetAttribute("HealAmount") or 25
    local respawnTime = item:GetAttribute("RespawnTime") or 30
    local originalPosition = item.Position
    local canHeal = true
    
    item.Touched:Connect(function(hit)
        if not canHeal then return end
        
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid and humanoid.Health < humanoid.MaxHealth then
            canHeal = false
            
            -- Heal player
            humanoid.Health = math.min(humanoid.Health + healAmount, humanoid.MaxHealth)
            
            -- Hide item
            item.Transparency = 1
            item.CanCollide = false
            
            -- Respawn
            task.wait(respawnTime)
            item.Transparency = 0
            item.CanCollide = true
            item.Position = originalPosition
            canHeal = true
        end
    end)
end

print("✅ Health & damage system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 4. Leaderboard System
    {
        metadata: {
            id: 'leaderboard',
            name: 'Leaderboard System',
            description: 'Player statistics tracking with customizable stats displayed on the leaderboard.',
            category: 'scripts',
            difficulty: 'beginner',
            tags: ['leaderboard', 'stats', 'ui'],
            estimatedTime: 10,
            requirements: []
        },
        serverScripts: [{
            path: 'src/ServerScriptService/Leaderboard.server.lua',
            type: 'Script',
            content: `-- Leaderboard System
local Players = game:GetService("Players")

-- Configuration: Add your custom stats here
local STATS = {
    {name = "Coins", default = 0},
    {name = "Wins", default = 0},
    {name = "Level", default = 1},
    {name = "XP", default = 0}
}

Players.PlayerAdded:Connect(function(player)
    -- Create leaderstats folder
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    -- Create stat values
    for _, stat in ipairs(STATS) do
        local value = Instance.new("IntValue")
        value.Name = stat.name
        value.Value = stat.default
        value.Parent = leaderstats
    end
    
    print("✅ Leaderboard created for " .. player.Name)
end)

print("✅ Leaderboard system initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 5. Checkpoint & Respawn System
    {
        metadata: {
            id: 'checkpoint',
            name: 'Checkpoint & Respawn System',
            description: 'Save player progress with checkpoints and custom respawn points.',
            category: 'scripts',
            difficulty: 'intermediate',
            tags: ['checkpoint', 'respawn', 'obby', 'progress'],
            estimatedTime: 15,
            requirements: []
        },
        serverScripts: [{
            path: 'src/ServerScriptService/CheckpointSystem.server.lua',
            type: 'Script',
            content: `-- Checkpoint & Respawn System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")

-- Store player checkpoints
local playerCheckpoints = {}

-- Find all checkpoints (tagged with "Checkpoint")
local checkpoints = CollectionService:GetTagged("Checkpoint")

-- Sort checkpoints by number
table.sort(checkpoints, function(a, b)
    local numA = tonumber(a.Name:match("%d+")) or 0
    local numB = tonumber(b.Name:match("%d+")) or 0
    return numA < numB
end)

-- Setup checkpoints
for i, checkpoint in ipairs(checkpoints) do
    checkpoint.Transparency = 0.5
    checkpoint.CanCollide = false
    checkpoint.Anchored = true
    
    -- Add number display
    local billboardGui = Instance.new("BillboardGui")
    billboardGui.Size = UDim2.new(0, 100, 0, 50)
    billboardGui.StudsOffset = Vector3.new(0, 3, 0)
    billboardGui.Parent = checkpoint
    
    local textLabel = Instance.new("TextLabel")
    textLabel.Size = UDim2.new(1, 0, 1, 0)
    textLabel.BackgroundTransparency = 1
    textLabel.Text = "Checkpoint " .. i
    textLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
    textLabel.TextScaled = true
    textLabel.Font = Enum.Font.GothamBold
    textLabel.Parent = billboardGui
    
    -- Handle checkpoint touch
    checkpoint.Touched:Connect(function(hit)
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            local player = Players:GetPlayerFromCharacter(hit.Parent)
            if player then
                -- Save checkpoint
                local currentCheckpoint = playerCheckpoints[player.UserId] or 0
                if i > currentCheckpoint then
                    playerCheckpoints[player.UserId] = i
                    
                    -- Visual feedback
                    checkpoint.BrickColor = BrickColor.new("Bright green")
                    task.wait(0.3)
                    checkpoint.BrickColor = BrickColor.new("Bright blue")
                    
                    -- Notify player
                    print(player.Name .. " reached checkpoint " .. i)
                end
            end
        end
    end)
end

-- Handle player respawn
Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        
        -- Wait a frame to ensure character is loaded
        task.wait()
        
        -- Get player's checkpoint
        local checkpointIndex = playerCheckpoints[player.UserId] or 0
        
        if checkpointIndex > 0 and checkpoints[checkpointIndex] then
            -- Teleport to checkpoint
            local checkpoint = checkpoints[checkpointIndex]
            character:SetPrimaryPartCFrame(checkpoint.CFrame + Vector3.new(0, 5, 0))
        end
    end)
end)

print("✅ Checkpoint system initialized with " .. #checkpoints .. " checkpoints")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 6. Timer System
    {
        metadata: {
            id: 'timer',
            name: 'Game Timer System',
            description: 'Countdown or count-up timer with UI display and events.',
            category: 'scripts',
            difficulty: 'beginner',
            tags: ['timer', 'countdown', 'ui', 'events'],
            estimatedTime: 15,
            requirements: []
        },
        serverScripts: [{
            path: 'src/ServerScriptService/TimerSystem.server.lua',
            type: 'Script',
            content: `-- Game Timer System
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Configuration
local TIMER_DURATION = 300 -- 5 minutes in seconds
local TIMER_MODE = "countdown" -- "countdown" or "countup"

-- Create timer value
local timerValue = Instance.new("IntValue")
timerValue.Name = "GameTimer"
timerValue.Value = TIMER_MODE == "countdown" and TIMER_DURATION or 0
timerValue.Parent = ReplicatedStorage

-- Create timer running state
local timerRunning = Instance.new("BoolValue")
timerRunning.Name = "TimerRunning"
timerRunning.Value = true
timerRunning.Parent = ReplicatedStorage

-- Timer loop
task.spawn(function()
    while true do
        task.wait(1)
        
        if timerRunning.Value then
            if TIMER_MODE == "countdown" then
                timerValue.Value = timerValue.Value - 1
                
                if timerValue.Value <= 0 then
                    timerValue.Value = 0
                    timerRunning.Value = false
                    print("⏰ Timer ended!")
                    -- Add your end-of-timer logic here
                end
            else
                timerValue.Value = timerValue.Value + 1
            end
        end
    end
end)

-- Helper functions (call from other scripts)
function ResetTimer()
    timerValue.Value = TIMER_MODE == "countdown" and TIMER_DURATION or 0
    timerRunning.Value = true
end

function PauseTimer()
    timerRunning.Value = false
end

function ResumeTimer()
    timerRunning.Value = true
end

print("✅ Timer system initialized (" .. TIMER_MODE .. " mode)")
`
        }],
        clientScripts: [{
            path: 'src/StarterPlayer/StarterPlayerScripts/TimerUI.client.lua',
            type: 'LocalScript',
            content: `-- Timer UI Display
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Wait for timer values
local timerValue = ReplicatedStorage:WaitForChild("GameTimer")

-- Create UI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "TimerUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0, 200, 0, 60)
timerLabel.Position = UDim2.new(0.5, -100, 0, 20)
timerLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
timerLabel.BackgroundTransparency = 0.5
timerLabel.BorderSizePixel = 0
timerLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
timerLabel.TextScaled = true
timerLabel.Font = Enum.Font.GothamBold
timerLabel.Parent = screenGui

-- Format time as MM:SS
local function formatTime(seconds: number): string
    local minutes = math.floor(seconds / 60)
    local secs = seconds % 60
    return string.format("%02d:%02d", minutes, secs)
end

-- Update timer display
timerValue.Changed:Connect(function(newValue)
    timerLabel.Text = formatTime(newValue)
end)

-- Initial display
timerLabel.Text = formatTime(timerValue.Value)

print("✅ Timer UI initialized")
`
        }],
        sharedModules: []
    },

    // 7. Teleport System
    {
        metadata: {
            id: 'teleporter',
            name: 'Teleport Pad System',
            description: 'Teleport pads that transport players between locations with effects.',
            category: 'scripts',
            difficulty: 'beginner',
            tags: ['teleport', 'transport', 'portal'],
            estimatedTime: 10,
            requirements: []
        },
        serverScripts: [{
            path: 'src/ServerScriptService/TeleportSystem.server.lua',
            type: 'Script',
            content: `-- Teleport Pad System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")
local TweenService = game:GetService("TweenService")

-- Find all teleport pads (tagged with "TeleportPad")
local teleportPads = CollectionService:GetTagged("TeleportPad")

for _, pad in pairs(teleportPads) do
    -- Get destination from attribute
    local destinationName = pad:GetAttribute("Destination")
    
    if destinationName then
        -- Add visual effect
        pad.Material = Enum.Material.Neon
        pad.Color = Color3.fromRGB(0, 170, 255)
        
        -- Pulsing animation
        task.spawn(function()
            while pad.Parent do
                local tween = TweenService:Create(
                    pad,
                    TweenInfo.new(1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
                    {Transparency = 0.3}
                )
                tween:Play()
                task.wait(2)
            end
        end)
        
        -- Handle teleportation
        local debounce = {}
        
        pad.Touched:Connect(function(hit)
            local humanoid = hit.Parent:FindFirstChild("Humanoid")
            if humanoid then
                local player = Players:GetPlayerFromCharacter(hit.Parent)
                if player and not debounce[player] then
                    debounce[player] = true
                    
                    -- Find destination
                    local destination = workspace:FindFirstChild(destinationName)
                    if destination then
                        -- Teleport player
                        local character = player.Character
                        if character and character.PrimaryPart then
                            character:SetPrimaryPartCFrame(destination.CFrame + Vector3.new(0, 5, 0))
                            
                            -- Play teleport sound
                            local sound = Instance.new("Sound")
                            sound.SoundId = "rbxassetid://3398620867"
                            sound.Volume = 0.5
                            sound.Parent = character.PrimaryPart
                            sound:Play()
                            sound.Ended:Connect(function()
                                sound:Destroy()
                            end)
                        end
                    else
                        warn("Destination not found: " .. destinationName)
                    end
                    
                    -- Reset debounce
                    task.wait(2)
                    debounce[player] = nil
                end
            end
        end)
    else
        warn("TeleportPad missing Destination attribute: " .. pad:GetFullName())
    end
end

print("✅ Teleport system initialized with " .. #teleportPads .. " pads")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 8. Inventory System
    {
        metadata: {
            id: 'inventory',
            name: 'Inventory System',
            description: 'Complete inventory system with item management, UI, and persistence.',
            category: 'scripts',
            difficulty: 'advanced',
            tags: ['inventory', 'items', 'storage', 'ui'],
            estimatedTime: 30,
            requirements: ['DataStore knowledge', 'UI design']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/InventorySystem.server.lua',
            type: 'Script',
            content: `-- Inventory System (Server)
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Create RemoteEvents
local inventoryFolder = Instance.new("Folder")
inventoryFolder.Name = "InventoryEvents"
inventoryFolder.Parent = ReplicatedStorage

local addItemEvent = Instance.new("RemoteEvent")
addItemEvent.Name = "AddItem"
addItemEvent.Parent = inventoryFolder

local removeItemEvent = Instance.new("RemoteEvent")
removeItemEvent.Name = "RemoveItem"
removeItemEvent.Parent = inventoryFolder

local getInventoryFunction = Instance.new("RemoteFunction")
getInventoryFunction.Name = "GetInventory"
getInventoryFunction.Parent = inventoryFolder

-- Player inventories
local playerInventories = {}

-- Inventory class
local Inventory = {}
Inventory.__index = Inventory

function Inventory.new(player)
    local self = setmetatable({}, Inventory)
    self.player = player
    self.items = {}
    self.maxSlots = 20
    return self
end

function Inventory:addItem(itemName: string, quantity: number): boolean
    quantity = quantity or 1
    
    -- Check if item exists
    if self.items[itemName] then
        self.items[itemName] = self.items[itemName] + quantity
    else
        -- Check if inventory is full
        local itemCount = 0
        for _ in pairs(self.items) do
            itemCount = itemCount + 1
        end
        
        if itemCount >= self.maxSlots then
            return false -- Inventory full
        end
        
        self.items[itemName] = quantity
    end
    
    return true
end

function Inventory:removeItem(itemName: string, quantity: number): boolean
    quantity = quantity or 1
    
    if not self.items[itemName] or self.items[itemName] < quantity then
        return false -- Not enough items
    end
    
    self.items[itemName] = self.items[itemName] - quantity
    
    if self.items[itemName] <= 0 then
        self.items[itemName] = nil
    end
    
    return true
end

function Inventory:getItems()
    return self.items
end

-- Player management
Players.PlayerAdded:Connect(function(player)
    playerInventories[player.UserId] = Inventory.new(player)
    print("✅ Inventory created for " .. player.Name)
end)

Players.PlayerRemoving:Connect(function(player)
    playerInventories[player.UserId] = nil
end)

-- Remote events
addItemEvent.OnServerEvent:Connect(function(player, itemName, quantity)
    local inventory = playerInventories[player.UserId]
    if inventory then
        local success = inventory:addItem(itemName, quantity)
        if success then
            print(player.Name .. " added " .. quantity .. "x " .. itemName)
        end
    end
end)

removeItemEvent.OnServerEvent:Connect(function(player, itemName, quantity)
    local inventory = playerInventories[player.UserId]
    if inventory then
        local success = inventory:removeItem(itemName, quantity)
        if success then
            print(player.Name .. " removed " .. quantity .. "x " .. itemName)
        end
    end
end)

getInventoryFunction.OnServerInvoke = function(player)
    local inventory = playerInventories[player.UserId]
    return inventory and inventory:getItems() or {}
end

print("✅ Inventory system initialized")
`
        }],
        clientScripts: [{
            path: 'src/StarterPlayer/StarterPlayerScripts/InventoryUI.client.lua',
            type: 'LocalScript',
            content: `-- Inventory UI (Client)
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Wait for remote events
local inventoryEvents = ReplicatedStorage:WaitForChild("InventoryEvents")
local getInventoryFunction = inventoryEvents:WaitForChild("GetInventory")

-- Create UI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "InventoryUI"
screenGui.ResetOnSpawn = false
screenGui.Enabled = false
screenGui.Parent = playerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 600, 0, 400)
frame.Position = UDim2.new(0.5, -300, 0.5, -200)
frame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
frame.BorderSizePixel = 0
frame.Parent = screenGui

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 50)
title.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
title.BorderSizePixel = 0
title.Text = "Inventory"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.TextSize = 24
title.Font = Enum.Font.GothamBold
title.Parent = frame

local scrollFrame = Instance.new("ScrollingFrame")
scrollFrame.Size = UDim2.new(1, -20, 1, -70)
scrollFrame.Position = UDim2.new(0, 10, 0, 60)
scrollFrame.BackgroundTransparency = 1
scrollFrame.BorderSizePixel = 0
scrollFrame.ScrollBarThickness = 8
scrollFrame.Parent = frame

-- Toggle inventory with 'E' key
UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if not gameProcessed and input.KeyCode == Enum.KeyCode.E then
        screenGui.Enabled = not screenGui.Enabled
        
        if screenGui.Enabled then
            -- Refresh inventory
            local items = getInventoryFunction:InvokeServer()
            
            -- Clear existing items
            for _, child in ipairs(scrollFrame:GetChildren()) do
                if child:IsA("Frame") then
                    child:Destroy()
                end
            end
            
            -- Display items
            local yPos = 0
            for itemName, quantity in pairs(items) do
                local itemFrame = Instance.new("Frame")
                itemFrame.Size = UDim2.new(1, -10, 0, 60)
                itemFrame.Position = UDim2.new(0, 0, 0, yPos)
                itemFrame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
                itemFrame.BorderSizePixel = 0
                itemFrame.Parent = scrollFrame
                
                local itemLabel = Instance.new("TextLabel")
                itemLabel.Size = UDim2.new(0.7, 0, 1, 0)
                itemLabel.BackgroundTransparency = 1
                itemLabel.Text = itemName
                itemLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
                itemLabel.TextSize = 18
                itemLabel.Font = Enum.Font.Gotham
                itemLabel.TextXAlignment = Enum.TextXAlignment.Left
                itemLabel.Parent = itemFrame
                
                local quantityLabel = Instance.new("TextLabel")
                quantityLabel.Size = UDim2.new(0.3, 0, 1, 0)
                quantityLabel.Position = UDim2.new(0.7, 0, 0, 0)
                quantityLabel.BackgroundTransparency = 1
                quantityLabel.Text = "x" .. quantity
                quantityLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
                quantityLabel.TextSize = 16
                quantityLabel.Font = Enum.Font.Gotham
                quantityLabel.Parent = itemFrame
                
                yPos = yPos + 70
            end
            
            scrollFrame.CanvasSize = UDim2.new(0, 0, 0, yPos)
        end
    end
end)

print("✅ Inventory UI initialized (Press 'E' to open)")
`
        }],
        sharedModules: []
    }
];
