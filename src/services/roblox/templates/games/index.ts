/**
 * Complete Game Templates
 * 
 * Full game templates with all necessary scripts and systems.
 */

import type { RobloxTemplate } from '../../template-metadata';

export const gameTemplates: RobloxTemplate[] = [
    // 1. Obby Game
    {
        metadata: {
            id: 'obby-game',
            name: 'Obby (Obstacle Course) Game',
            description: 'Complete obby game with checkpoints, timer, and leaderboard. Perfect for creating parkour challenges.',
            category: 'games',
            difficulty: 'beginner',
            gameType: 'obby',
            tags: ['obby', 'parkour', 'obstacle', 'checkpoint', 'timer'],
            estimatedTime: 30,
            requirements: ['Basic Roblox Studio knowledge'],
            learningObjectives: ['Checkpoint systems', 'Timer implementation', 'Leaderboard integration']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/ObbyGame.server.lua',
            type: 'Script',
            description: 'Main obby game logic with checkpoints and completion tracking',
            content: `-- Obby Game System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Configuration
local TOTAL_CHECKPOINTS = 10
local COMPLETION_REWARD = 100

-- Create leaderboard
Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local checkpoint = Instance.new("IntValue")
    checkpoint.Name = "Checkpoint"
    checkpoint.Value = 0
    checkpoint.Parent = leaderstats
    
    local completions = Instance.new("IntValue")
    completions.Name = "Completions"
    completions.Value = 0
    completions.Parent = leaderstats
    
    local bestTime = Instance.new("NumberValue")
    bestTime.Name = "BestTime"
    bestTime.Value = 0
    bestTime.Parent = leaderstats
end)

-- Setup checkpoints
local checkpoints = CollectionService:GetTagged("ObbyCheckpoint")
table.sort(checkpoints, function(a, b)
    return tonumber(a.Name:match("%d+") or 0) < tonumber(b.Name:match("%d+") or 0)
end)

for i, checkpoint in ipairs(checkpoints) do
    checkpoint.Transparency = 0.5
    checkpoint.CanCollide = false
    checkpoint.BrickColor = BrickColor.new("Bright blue")
    
    checkpoint.Touched:Connect(function(hit)
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            local player = Players:GetPlayerFromCharacter(hit.Parent)
            if player then
                local stats = player:FindFirstChild("leaderstats")
                if stats then
                    local currentCheckpoint = stats:FindFirstChild("Checkpoint")
                    if currentCheckpoint and i > currentCheckpoint.Value then
                        currentCheckpoint.Value = i
                        
                        -- Visual feedback
                        checkpoint.BrickColor = BrickColor.new("Bright green")
                        task.wait(0.5)
                        checkpoint.BrickColor = BrickColor.new("Bright blue")
                    end
                end
            end
        end
    end)
end

-- Finish line
local finishLine = workspace:FindFirstChild("FinishLine")
if finishLine then
    finishLine.Touched:Connect(function(hit)
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            local player = Players:GetPlayerFromCharacter(hit.Parent)
            if player then
                local stats = player:FindFirstChild("leaderstats")
                if stats then
                    local checkpoint = stats:FindFirstChild("Checkpoint")
                    if checkpoint and checkpoint.Value >= TOTAL_CHECKPOINTS then
                        -- Player completed the obby!
                        local completions = stats:FindFirstChild("Completions")
                        if completions then
                            completions.Value = completions.Value + 1
                        end
                        
                        -- Reset for replay
                        checkpoint.Value = 0
                        
                        print(player.Name .. " completed the obby!")
                    end
                end
            end
        end
    end)
end

-- Kill bricks
local killBricks = CollectionService:GetTagged("KillBrick")
for _, brick in ipairs(killBricks) do
    brick.Touched:Connect(function(hit)
        local humanoid = hit.Parent:FindFirstChild("Humanoid")
        if humanoid then
            humanoid.Health = 0
        end
    end)
end

print("✅ Obby game initialized with " .. #checkpoints .. " checkpoints")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 2. Simulator Game
    {
        metadata: {
            id: 'simulator-game',
            name: 'Clicker Simulator Game',
            description: 'Idle/clicker simulator with upgrades, rebirth system, and multipliers. Great for tycoon-style games.',
            category: 'games',
            difficulty: 'intermediate',
            gameType: 'simulator',
            tags: ['simulator', 'clicker', 'idle', 'upgrades', 'rebirth'],
            estimatedTime: 45,
            requirements: ['DataStore knowledge', 'UI design'],
            learningObjectives: ['Click detection', 'Upgrade systems', 'Data persistence']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/SimulatorGame.server.lua',
            type: 'Script',
            content: `-- Simulator Game System
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

-- DataStore
local playerDataStore = DataStoreService:GetDataStore("PlayerData_v1")

-- Remote Events
local clickEvent = Instance.new("RemoteEvent")
clickEvent.Name = "Click"
clickEvent.Parent = ReplicatedStorage

local upgradeEvent = Instance.new("RemoteEvent")
upgradeEvent.Name = "Upgrade"
upgradeEvent.Parent = ReplicatedStorage

local rebirthEvent = Instance.new("RemoteEvent")
rebirthEvent.Name = "Rebirth"
rebirthEvent.Parent = ReplicatedStorage

-- Player data
local playerData = {}

-- Default data
local function getDefaultData()
    return {
        clicks = 0,
        clickPower = 1,
        autoClickers = 0,
        rebirths = 0,
        multiplier = 1
    }
end

-- Load player data
local function loadData(player)
    local success, data = pcall(function()
        return playerDataStore:GetAsync(player.UserId)
    end)
    
    if success and data then
        return data
    else
        return getDefaultData()
    end
end

-- Save player data
local function saveData(player)
    local data = playerData[player.UserId]
    if data then
        pcall(function()
            playerDataStore:SetAsync(player.UserId, data)
        end)
    end
end

-- Player management
Players.PlayerAdded:Connect(function(player)
    -- Load data
    playerData[player.UserId] = loadData(player)
    
    -- Create leaderstats
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local clicks = Instance.new("IntValue")
    clicks.Name = "Clicks"
    clicks.Value = playerData[player.UserId].clicks
    clicks.Parent = leaderstats
    
    local rebirths = Instance.new("IntValue")
    rebirths.Name = "Rebirths"
    rebirths.Value = playerData[player.UserId].rebirths
    rebirths.Parent = leaderstats
    
    -- Auto-clicker loop
    task.spawn(function()
        while player.Parent do
            task.wait(1)
            local data = playerData[player.UserId]
            if data and data.autoClickers > 0 then
                local autoClickAmount = data.autoClickers * data.multiplier
                data.clicks = data.clicks + autoClickAmount
                clicks.Value = data.clicks
            end
        end
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    saveData(player)
    playerData[player.UserId] = nil
end)

-- Click event
clickEvent.OnServerEvent:Connect(function(player)
    local data = playerData[player.UserId]
    if data then
        data.clicks = data.clicks + (data.clickPower * data.multiplier)
        
        local leaderstats = player:FindFirstChild("leaderstats")
        if leaderstats then
            local clicks = leaderstats:FindFirstChild("Clicks")
            if clicks then
                clicks.Value = data.clicks
            end
        end
    end
end)

-- Upgrade event
upgradeEvent.OnServerEvent:Connect(function(player, upgradeType)
    local data = playerData[player.UserId]
    if not data then return end
    
    if upgradeType == "clickPower" then
        local cost = 100 * (data.clickPower ^ 1.5)
        if data.clicks >= cost then
            data.clicks = data.clicks - cost
            data.clickPower = data.clickPower + 1
        end
    elseif upgradeType == "autoClicker" then
        local cost = 500 * ((data.autoClickers + 1) ^ 2)
        if data.clicks >= cost then
            data.clicks = data.clicks - cost
            data.autoClickers = data.autoClickers + 1
        end
    end
    
    -- Update leaderstats
    local leaderstats = player:FindFirstChild("leaderstats")
    if leaderstats then
        local clicks = leaderstats:FindFirstChild("Clicks")
        if clicks then
            clicks.Value = data.clicks
        end
    end
end)

-- Rebirth event
rebirthEvent.OnServerEvent:Connect(function(player)
    local data = playerData[player.UserId]
    if not data then return end
    
    local rebirthCost = 10000 * ((data.rebirths + 1) ^ 2)
    if data.clicks >= rebirthCost then
        -- Reset progress but increase multiplier
        data.clicks = 0
        data.clickPower = 1
        data.autoClickers = 0
        data.rebirths = data.rebirths + 1
        data.multiplier = 1 + (data.rebirths * 0.5)
        
        -- Update leaderstats
        local leaderstats = player:FindFirstChild("leaderstats")
        if leaderstats then
            local clicks = leaderstats:FindFirstChild("Clicks")
            local rebirths = leaderstats:FindFirstChild("Rebirths")
            if clicks then clicks.Value = 0 end
            if rebirths then rebirths.Value = data.rebirths end
        end
        
        print(player.Name .. " rebirthed! New multiplier: " .. data.multiplier .. "x")
    end
end)

-- Auto-save every 60 seconds
task.spawn(function()
    while true do
        task.wait(60)
        for _, player in ipairs(Players:GetPlayers()) do
            saveData(player)
        end
    end
end)

print("✅ Simulator game initialized")
`
        }],
        clientScripts: [{
            path: 'src/StarterPlayer/StarterPlayerScripts/SimulatorUI.client.lua',
            type: 'LocalScript',
            content: `-- Simulator UI
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Wait for events
local clickEvent = ReplicatedStorage:WaitForChild("Click")
local upgradeEvent = ReplicatedStorage:WaitForChild("Upgrade")
local rebirthEvent = ReplicatedStorage:WaitForChild("Rebirth")

-- Create UI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "SimulatorUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Click button
local clickButton = Instance.new("TextButton")
clickButton.Size = UDim2.new(0, 200, 0, 200)
clickButton.Position = UDim2.new(0.5, -100, 0.5, -100)
clickButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
clickButton.BorderSizePixel = 0
clickButton.Text = "CLICK!"
clickButton.TextColor3 = Color3.fromRGB(255, 255, 255)
clickButton.TextSize = 36
clickButton.Font = Enum.Font.GothamBold
clickButton.Parent = screenGui

-- Click animation
clickButton.MouseButton1Click:Connect(function()
    clickEvent:FireServer()
    
    -- Animation
    clickButton.Size = UDim2.new(0, 180, 0, 180)
    task.wait(0.1)
    clickButton.Size = UDim2.new(0, 200, 0, 200)
end)

-- Upgrade panel
local upgradePanel = Instance.new("Frame")
upgradePanel.Size = UDim2.new(0, 250, 0, 300)
upgradePanel.Position = UDim2.new(0, 20, 0.5, -150)
upgradePanel.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
upgradePanel.BorderSizePixel = 0
upgradePanel.Parent = screenGui

local upgradeTitle = Instance.new("TextLabel")
upgradeTitle.Size = UDim2.new(1, 0, 0, 40)
upgradeTitle.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
upgradeTitle.BorderSizePixel = 0
upgradeTitle.Text = "Upgrades"
upgradeTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
upgradeTitle.TextSize = 20
upgradeTitle.Font = Enum.Font.GothamBold
upgradeTitle.Parent = upgradePanel

-- Click power upgrade
local clickPowerBtn = Instance.new("TextButton")
clickPowerBtn.Size = UDim2.new(1, -20, 0, 60)
clickPowerBtn.Position = UDim2.new(0, 10, 0, 50)
clickPowerBtn.BackgroundColor3 = Color3.fromRGB(0, 200, 100)
clickPowerBtn.BorderSizePixel = 0
clickPowerBtn.Text = "Click Power\\nCost: 100"
clickPowerBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
clickPowerBtn.TextSize = 16
clickPowerBtn.Font = Enum.Font.Gotham
clickPowerBtn.Parent = upgradePanel

clickPowerBtn.MouseButton1Click:Connect(function()
    upgradeEvent:FireServer("clickPower")
end)

-- Auto-clicker upgrade
local autoClickerBtn = Instance.new("TextButton")
autoClickerBtn.Size = UDim2.new(1, -20, 0, 60)
autoClickerBtn.Position = UDim2.new(0, 10, 0, 120)
autoClickerBtn.BackgroundColor3 = Color3.fromRGB(255, 150, 0)
autoClickerBtn.BorderSizePixel = 0
autoClickerBtn.Text = "Auto-Clicker\\nCost: 500"
autoClickerBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
autoClickerBtn.TextSize = 16
autoClickerBtn.Font = Enum.Font.Gotham
autoClickerBtn.Parent = upgradePanel

autoClickerBtn.MouseButton1Click:Connect(function()
    upgradeEvent:FireServer("autoClicker")
end)

-- Rebirth button
local rebirthBtn = Instance.new("TextButton")
rebirthBtn.Size = UDim2.new(1, -20, 0, 60)
rebirthBtn.Position = UDim2.new(0, 10, 0, 190)
rebirthBtn.BackgroundColor3 = Color3.fromRGB(200, 0, 200)
rebirthBtn.BorderSizePixel = 0
rebirthBtn.Text = "REBIRTH\\nCost: 10,000"
rebirthBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
rebirthBtn.TextSize = 16
rebirthBtn.Font = Enum.Font.GothamBold
rebirthBtn.Parent = upgradePanel

rebirthBtn.MouseButton1Click:Connect(function()
    rebirthEvent:FireServer()
end)

print("✅ Simulator UI initialized")
`
        }],
        sharedModules: []
    },

    // 3. Tycoon Game
    {
        metadata: {
            id: 'tycoon-game',
            name: 'Tycoon Game',
            description: 'Build-your-own tycoon with button purchases, income generation, and territory claiming.',
            category: 'games',
            difficulty: 'advanced',
            gameType: 'tycoon',
            tags: ['tycoon', 'building', 'economy', 'territory'],
            estimatedTime: 60,
            requirements: ['Advanced scripting', 'DataStore', 'CFrame knowledge'],
            learningObjectives: ['Territory management', 'Income systems', 'Building placement']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/TycoonGame.server.lua',
            type: 'Script',
            content: `-- Tycoon Game System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")

-- Configuration
local INCOME_INTERVAL = 5 -- Seconds between income
local BASE_INCOME = 10

-- Tycoon class
local Tycoon = {}
Tycoon.__index = Tycoon

function Tycoon.new(tycoonModel)
    local self = setmetatable({}, Tycoon)
    self.model = tycoonModel
    self.owner = nil
    self.income = BASE_INCOME
    self.cash = 0
    self.purchasedItems = {}
    
    -- Find claim button
    self.claimButton = tycoonModel:FindFirstChild("ClaimButton")
    if self.claimButton then
        self:setupClaimButton()
    end
    
    -- Find purchase buttons
    self.buttons = {}
    for _, button in ipairs(CollectionService:GetTagged("TycoonButton")) do
        if button:IsDescendantOf(tycoonModel) then
            table.insert(self.buttons, button)
            self:setupPurchaseButton(button)
        end
    end
    
    return self
end

function Tycoon:setupClaimButton()
    local clickDetector = self.claimButton:FindFirstChild("ClickDetector")
    if not clickDetector then
        clickDetector = Instance.new("ClickDetector")
        clickDetector.Parent = self.claimButton
    end
    
    clickDetector.MouseClick:Connect(function(player)
        if not self.owner then
            self:claim(player)
        end
    end)
end

function Tycoon:claim(player)
    self.owner = player
    self.claimButton.BrickColor = BrickColor.new("Bright green")
    
    -- Create leaderstats
    local leaderstats = player:FindFirstChild("leaderstats")
    if not leaderstats then
        leaderstats = Instance.new("Folder")
        leaderstats.Name = "leaderstats"
        leaderstats.Parent = player
    end
    
    local cash = Instance.new("IntValue")
    cash.Name = "Cash"
    cash.Value = self.cash
    cash.Parent = leaderstats
    
    -- Start income generation
    task.spawn(function()
        while self.owner == player and player.Parent do
            task.wait(INCOME_INTERVAL)
            self.cash = self.cash + self.income
            cash.Value = self.cash
        end
    end)
    
    print(player.Name .. " claimed a tycoon!")
end

function Tycoon:setupPurchaseButton(button)
    local cost = button:GetAttribute("Cost") or 100
    local itemName = button:GetAttribute("Item") or "Unknown"
    
    local clickDetector = button:FindFirstChild("ClickDetector")
    if not clickDetector then
        clickDetector = Instance.new("ClickDetector")
        clickDetector.Parent = button
    end
    
    clickDetector.MouseClick:Connect(function(player)
        if player == self.owner and not self.purchasedItems[itemName] then
            if self.cash >= cost then
                self:purchaseItem(button, itemName, cost)
            else
                print(player.Name .. " needs " .. (cost - self.cash) .. " more cash")
            end
        end
    end)
end

function Tycoon:purchaseItem(button, itemName, cost)
    -- Deduct cost
    self.cash = self.cash - cost
    
    -- Update leaderstats
    if self.owner then
        local leaderstats = self.owner:FindFirstChild("leaderstats")
        if leaderstats then
            local cash = leaderstats:FindFirstChild("Cash")
            if cash then
                cash.Value = self.cash
            end
        end
    end
    
    -- Mark as purchased
    self.purchasedItems[itemName] = true
    button.Transparency = 1
    button.CanCollide = false
    
    -- Spawn the item
    local itemTemplate = game.ServerStorage:FindFirstChild(itemName)
    if itemTemplate then
        local item = itemTemplate:Clone()
        item.Parent = self.model
        
        -- Check if this item generates income
        local incomeBonus = item:GetAttribute("IncomeBonus")
        if incomeBonus then
            self.income = self.income + incomeBonus
        end
    end
    
    print(self.owner.Name .. " purchased " .. itemName)
end

-- Initialize all tycoons
local tycoons = {}
for _, tycoonModel in ipairs(CollectionService:GetTagged("Tycoon")) do
    local tycoon = Tycoon.new(tycoonModel)
    table.insert(tycoons, tycoon)
end

-- Handle player leaving
Players.PlayerRemoving:Connect(function(player)
    for _, tycoon in ipairs(tycoons) do
        if tycoon.owner == player then
            tycoon.owner = nil
            tycoon.cash = 0
            tycoon.income = BASE_INCOME
            tycoon.purchasedItems = {}
            
            -- Reset tycoon
            if tycoon.claimButton then
                tycoon.claimButton.BrickColor = BrickColor.new("Bright red")
            end
        end
    end
end)

print("✅ Tycoon game initialized with " .. #tycoons .. " tycoons")
`
        }],
        clientScripts: [],
        sharedModules: []
    },

    // 4. Racing Game
    {
        metadata: {
            id: 'racing-game',
            name: 'Racing Game',
            description: 'Complete racing game with lap tracking, leaderboard, and vehicle system.',
            category: 'games',
            difficulty: 'intermediate',
            gameType: 'racing',
            tags: ['racing', 'vehicles', 'laps', 'timer'],
            estimatedTime: 40,
            requirements: ['Vehicle knowledge', 'CFrame manipulation'],
            learningObjectives: ['Lap detection', 'Race timing', 'Vehicle controls']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/RacingGame.server.lua',
            type: 'Script',
            content: `-- Racing Game System
local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Configuration
local TOTAL_LAPS = 3
local CHECKPOINTS_PER_LAP = 5

-- Player race data
local playerRaceData = {}

-- Create leaderboard
Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local lap = Instance.new("IntValue")
    lap.Name = "Lap"
    lap.Value = 1
    lap.Parent = leaderstats
    
    local bestTime = Instance.new("NumberValue")
    bestTime.Name = "BestTime"
    bestTime.Value = 0
    bestTime.Parent = leaderstats
    
    -- Initialize race data
    playerRaceData[player.UserId] = {
        currentLap = 1,
        currentCheckpoint = 0,
        startTime = tick(),
        checkpointsPassed = {}
    }
end)

Players.PlayerRemoving:Connect(function(player)
    playerRaceData[player.UserId] = nil
end)

-- Setup checkpoints
local checkpoints = CollectionService:GetTagged("RaceCheckpoint")
table.sort(checkpoints, function(a, b)
    return tonumber(a.Name:match("%d+") or 0) < tonumber(b.Name:match("%d+") or 0)
end)

for i, checkpoint in ipairs(checkpoints) do
    checkpoint.Transparency = 0.5
    checkpoint.CanCollide = false
    checkpoint.BrickColor = BrickColor.new("Bright yellow")
    
    checkpoint.Touched:Connect(function(hit)
        -- Check if it's a vehicle seat
        local vehicle = hit.Parent
        if vehicle and vehicle:FindFirstChild("VehicleSeat") then
            local seat = vehicle.VehicleSeat
            if seat.Occupant then
                local player = Players:GetPlayerFromCharacter(seat.Occupant.Parent)
                if player then
                    local data = playerRaceData[player.UserId]
                    if data then
                        -- Check if this is the next checkpoint
                        if i == (data.currentCheckpoint % CHECKPOINTS_PER_LAP) + 1 then
                            data.currentCheckpoint = data.currentCheckpoint + 1
                            
                            -- Check if lap completed
                            if data.currentCheckpoint % CHECKPOINTS_PER_LAP == 0 then
                                data.currentLap = data.currentLap + 1
                                
                                local leaderstats = player:FindFirstChild("leaderstats")
                                if leaderstats then
                                    local lap = leaderstats:FindFirstChild("Lap")
                                    if lap then
                                        lap.Value = data.currentLap
                                    end
                                end
                                
                                -- Check if race completed
                                if data.currentLap > TOTAL_LAPS then
                                    local raceTime = tick() - data.startTime
                                    print(player.Name .. " finished the race in " .. math.floor(raceTime) .. " seconds!")
                                    
                                    -- Update best time
                                    local leaderstats = player:FindFirstChild("leaderstats")
                                    if leaderstats then
                                        local bestTime = leaderstats:FindFirstChild("BestTime")
                                        if bestTime and (bestTime.Value == 0 or raceTime < bestTime.Value) then
                                            bestTime.Value = raceTime
                                        end
                                    end
                                    
                                    -- Reset for new race
                                    data.currentLap = 1
                                    data.currentCheckpoint = 0
                                    data.startTime = tick()
                                end
                            end
                            
                            -- Visual feedback
                            checkpoint.BrickColor = BrickColor.new("Bright green")
                            task.wait(0.3)
                            checkpoint.BrickColor = BrickColor.new("Bright yellow")
                        end
                    end
                end
            end
        end
    end)
end

print("✅ Racing game initialized with " .. #checkpoints .. " checkpoints")
`
        }],
        clientScripts: [],
        sharedModules: []
    }
];
